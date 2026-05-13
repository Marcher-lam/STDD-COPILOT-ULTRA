const fs = require('fs');
const path = require('path');
const { detectWorkspaces } = require('../../utils/workspace-detector');

const JS_TEST_TEMPLATE = (className) =>
  `describe('${className}', () => {\n  it('should pass', () => {\n    // TODO: write test\n    expect(true).toBe(true);\n  });\n});\n`;

const PY_PYTEST_TEMPLATE = (className) => {
  const funcName = className.replace(/^Test/, '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  return `def test_${funcName}():\n    # TODO: write test\n    assert True\n`;
};

const PY_UNITTEST_TEMPLATE = (className) =>
  `import unittest\n\n\nclass ${className}(unittest.TestCase):\n    def test_placeholder(self):\n        # TODO: write test\n        self.assertTrue(True)\n\n\nif __name__ == '__main__':\n    unittest.main()\n`;

function detectPythonFramework(srcDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name === 'pytest.ini') return 'pytest';
    if (entry.isFile() && entry.name === 'setup.py') {
      const content = fs.readFileSync(path.join(srcDir, entry.name), 'utf8');
      if (/pytest/.test(content)) return 'pytest';
    }
    if (entry.isFile() && (entry.name === 'requirements.txt' || entry.name === 'pyproject.toml')) {
      const content = fs.readFileSync(path.join(srcDir, entry.name), 'utf8');
      if (/pytest/.test(content)) return 'pytest';
    }
  }
  const parentDir = path.join(srcDir, '..');
  if (fs.existsSync(path.join(parentDir, 'pytest.ini'))) return 'pytest';
  const parentConfigs = ['requirements.txt', 'pyproject.toml', 'setup.py'];
  for (const name of parentConfigs) {
    const p = path.join(parentDir, name);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      if (/pytest/.test(content)) return 'pytest';
    }
  }
  return 'unittest';
}

function isTestFile(filePath) {
  const basename = path.basename(filePath);
  return basename.includes('.test.') || basename.includes('.spec.') || basename.startsWith('test_');
}

function findSourceFiles(dir, extensions) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      files.push(...findSourceFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.has(ext) && !isTestFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function findTestFileForSource(sourceFile, srcDir) {
  const relPath = path.relative(srcDir, sourceFile);
  const ext = path.extname(relPath);
  const baseName = path.basename(relPath, ext);
  const dirName = path.dirname(relPath);

  const candidates = [
    path.join(srcDir, dirName, '__tests__', `${baseName}.test${ext}`),
    path.join(srcDir, dirName, `${baseName}.test${ext}`),
    path.join(srcDir, dirName, `${baseName}.spec${ext}`),
    path.join(srcDir, dirName, '__tests__', `${baseName}.test.js`),
    path.join(srcDir, dirName, '__tests__', `${baseName}.test.ts`),
    path.join(srcDir, dirName, `${baseName}.test.js`),
    path.join(srcDir, dirName, `${baseName}.test.ts`),
  ];

  if (ext === '.py') {
    const snakeName = baseName.replace(/([A-Z])/g, '_$1').toLowerCase();
    candidates.push(
      path.join(srcDir, dirName, '__tests__', `test_${snakeName}.py`),
      path.join(srcDir, dirName, `test_${snakeName}.py`)
    );
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function generateTestPath(sourceFile, srcDir) {
  const relPath = path.relative(srcDir, sourceFile);
  const ext = path.extname(relPath);
  const baseName = path.basename(relPath, ext);
  const dirName = path.dirname(relPath);

  const testFile =
    ext === '.py'
      ? `test_${baseName.replace(/([A-Z])/g, '_$1').toLowerCase()}.py`
      : `${baseName}.test${ext}`;

  return path.join(srcDir, dirName, '__tests__', testFile);
}

function generateTestContent(sourceFile, pyFramework) {
  const ext = path.extname(sourceFile);
  const baseName = path.basename(sourceFile, ext);

  if (ext === '.js' || ext === '.ts') {
    return JS_TEST_TEMPLATE(baseName);
  }

  if (ext === '.py') {
    const className = 'Test' + baseName.replace(/^_+|_+$/g, '')
      .replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase());
    return pyFramework === 'pytest'
      ? PY_PYTEST_TEMPLATE(className)
      : PY_UNITTEST_TEMPLATE(className);
  }

  return '';
}

function getSourceDirs(cwd, options = {}) {
  if (options.sourceDir) return [path.resolve(cwd, options.sourceDir)];

  const dirs = [];
  const rootSrc = path.join(cwd, 'src');
  if (fs.existsSync(rootSrc)) dirs.push(rootSrc);

  for (const workspace of detectWorkspaces(cwd)) {
    if (fs.existsSync(workspace.sourceDir)) dirs.push(workspace.sourceDir);
  }

  return [...new Set(dirs.map(dir => path.resolve(dir)))];
}

class TddInitCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async execute(cwd, options = {}) {
    const dryRun = options.dryRun || false;

    const extensions = new Set(['.js', '.ts', '.py']);
    const sourceDirs = getSourceDirs(cwd, options);
    const sourceFiles = sourceDirs.flatMap(srcDir => findSourceFiles(srcDir, extensions).map(file => ({ file, srcDir })));

    if (sourceFiles.length === 0) {
      const scanned = sourceDirs.length > 0 ? sourceDirs.join(', ') : path.join(cwd, 'src');
      console.log('No source files found in', scanned);
      return { created: [] };
    }

    const missing = sourceFiles.filter(({ file, srcDir }) => !findTestFileForSource(file, srcDir));

    if (missing.length === 0) {
      console.log('All source files already have corresponding test files.');
      return { created: [] };
    }

    const created = [];

    const relMissing = missing.map(({ file, srcDir }) => ({
      source: path.relative(cwd, file),
      test: path.relative(cwd, generateTestPath(file, srcDir)),
    }));

    if (dryRun) {
      console.log('\nDry run - the following test files would be created:\n');
      relMissing.forEach(({ test }) => console.log(`  ${test}`));
      console.log(`\nTotal: ${relMissing.length} file(s)`);
      return { created: relMissing.map((r) => r.test), dryRun: true };
    }

    for (const { file, srcDir } of missing) {
      const testPath = generateTestPath(file, srcDir);
      const pyFramework = detectPythonFramework(srcDir);
      const content = generateTestContent(file, pyFramework);
      fs.mkdirSync(path.dirname(testPath), { recursive: true });
      fs.writeFileSync(testPath, content, 'utf8');
      const relTest = path.relative(cwd, testPath);
      const relSrc = path.relative(cwd, file);
      console.log(`  Created: ${relTest} (for ${relSrc})`);
      created.push(relTest);
    }

    console.log(`\nTotal: ${created.length} test file(s) created.`);
    return { created };
  }
}

module.exports = { TddInitCommand };
