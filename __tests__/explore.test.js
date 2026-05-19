const fs = require('fs');
const path = require('path');
const os = require('os');
const { ExploreCommand } = require('../src/cli/commands/explore');

describe('ExploreCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-explore-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    if (setupFn) setupFn(projectPath);
    return projectPath;
  }

  function parseJsonOutput() {
    const printed = logSpy.mock.calls.map((call) => String(call[0]));
    const jsonLine = printed.find((line) => line.trim().startsWith('{'));
    if (!jsonLine) {
      throw new Error(`No JSON output found. Printed lines:\n${printed.join('\n')}`);
    }
    return JSON.parse(jsonLine);
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('architecture summary', () => {
    it('detects tech stack correctly', async () => {
      const projectPath = createTempProject('node-project', (p) => {
        fs.writeFileSync(
          path.join(p, 'package.json'),
          JSON.stringify({ dependencies: { express: '^4.0.0' }, devDependencies: { jest: '^29.0.0' } })
        );
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'const express = require("express");\nmodule.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.techStack.language).toBe('node');
      expect(result.techStack.framework).toBe('express');
      expect(result.techStack.testRunner).toBe('jest');
    });

    it('lists entry files', async () => {
      const projectPath = createTempProject('entry-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
        fs.writeFileSync(path.join(srcDir, 'utils.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.entryFiles.length).toBeGreaterThanOrEqual(1);
      const entryNames = result.entryFiles.map((f) => path.basename(f));
      expect(entryNames).toContain('index.js');
    });

    it('lists core dependencies', async () => {
      const projectPath = createTempProject('deps-project', (p) => {
        fs.writeFileSync(
          path.join(p, 'package.json'),
          JSON.stringify({ dependencies: { lodash: '^4.0.0' }, devDependencies: { jest: '^29.0.0' } })
        );
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.coreDependencies).toContain('lodash');
      expect(result.coreDependencies).toContain('jest');
    });

    it('handles missing package.json', async () => {
      const projectPath = createTempProject('no-pkg', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.techStack.language).toBe('unknown');
      expect(result.coreDependencies).toEqual([]);
    });
  });

  describe('quality hotspots', () => {
    it('finds untested files', async () => {
      const projectPath = createTempProject('untested-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'auth.js'), 'function login() {}\nmodule.exports = { login };\n');
        fs.writeFileSync(path.join(srcDir, 'utils.js'), 'function helper() {}\nmodule.exports = { helper };\n');
        fs.writeFileSync(path.join(srcDir, '__tests__', 'auth.test.js'), 'test("login", () => {});\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.untestedFiles.length).toBe(1);
      const untestedNames = result.untestedFiles.map((f) => path.basename(f));
      expect(untestedNames).toContain('utils.js');
    });

    it('finds all files as untested when no tests exist', async () => {
      const projectPath = createTempProject('no-tests', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'a.js'), 'exports.a = 1;\n');
        fs.writeFileSync(path.join(srcDir, 'b.js'), 'exports.b = 2;\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.untestedFiles.length).toBe(2);
    });

    it('finds long files (>500 lines)', async () => {
      const projectPath = createTempProject('long-file-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const longContent = Array(550).fill('// line of code').join('\n') + '\nmodule.exports = {};\n';
        fs.writeFileSync(path.join(srcDir, 'big.js'), longContent);
        fs.writeFileSync(path.join(srcDir, 'small.js'), 'exports.x = 1;\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.longFiles.length).toBe(1);
      expect(path.basename(result.longFiles[0].file)).toBe('big.js');
      expect(result.longFiles[0].lineCount).toBeGreaterThan(500);
    });

    it('finds files with many exports (>10)', async () => {
      const projectPath = createTempProject('exports-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const exportsList = [];
        for (let i = 0; i < 15; i++) {
          exportsList.push(`  func${i}`);
        }
        const content = `module.exports = {\n${exportsList.join(',\n')}\n};\n`;
        fs.writeFileSync(path.join(srcDir, 'mega-utils.js'), content);
        fs.writeFileSync(path.join(srcDir, 'normal.js'), 'module.exports = { a, b };\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.highExportFiles.length).toBe(1);
      expect(path.basename(result.highExportFiles[0].file)).toBe('mega-utils.js');
    });
  });

  describe('suggestions', () => {
    it('generates suggestions for untested files', async () => {
      const projectPath = createTempProject('suggest-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'auth.js'), 'exports.login = () => {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.suggestions.length).toBeGreaterThan(0);
      const untestedSuggestion = result.suggestions.find((s) => s.type === 'untested');
      expect(untestedSuggestion).toBeDefined();
      expect(untestedSuggestion.priority).toBe('high');
    });

    it('generates info suggestion when no issues found', async () => {
      const projectPath = createTempProject('clean-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'exports.x = 1;\n');
        const testContent = 'const { x } = require("../mod");\ntest("x", () => {});\n';
        fs.writeFileSync(path.join(srcDir, '__tests__', 'mod.test.js'), testContent);
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      const infoSuggestion = result.suggestions.find((s) => s.type === 'info');
      expect(infoSuggestion).toBeDefined();
    });
  });

  describe('output formats', () => {
    it('outputs JSON when --json is passed', async () => {
      const projectPath = createTempProject('json-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'exports.x = 1;\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, { json: true });

      const output = parseJsonOutput();
      expect(output).toHaveProperty('techStack');
      expect(output).toHaveProperty('untestedFiles');
      expect(output).toHaveProperty('suggestions');
    });

    it('saves markdown to file when --output is passed', async () => {
      const projectPath = createTempProject('file-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: { express: '^4.0.0' } }));
        fs.writeFileSync(path.join(srcDir, 'index.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const outputFile = path.join(projectPath, 'report.md');
      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, { output: 'report.md' });

      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('# STDD Project Exploration Report');
      expect(content).toContain('## Architecture Summary');
      expect(content).toContain('## Quality Hotspots');
      expect(content).toContain('## Suggestions');
    });
  });

  describe('human-readable output', () => {
    it('prints colored report without --json', async () => {
      const projectPath = createTempProject('colored-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' }, devDependencies: { jest: '^29.0.0' } }));
        fs.writeFileSync(path.join(srcDir, 'app.js'), 'exports.render = () => {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('Project Exploration Report');
      expect(printed).toContain('Architecture Summary');
      expect(printed).toContain('Quality Hotspots');
      expect(printed).toContain('Suggestions');
    });

    it('includes Untested Files in output', async () => {
      const projectPath = createTempProject('untested-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'login.js'), 'exports.login = () => {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('Untested Files');
    });
  });

  describe('scope parameter', () => {
    it('accepts scope and includes it in report', async () => {
      const projectPath = createTempProject('scope-project', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'auth.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute('auth', { json: true });

      expect(result.scope).toBe('auth');
    });
  });

  describe('additional branch coverage', () => {
    it('handles unreadable files in _findLongFiles gracefully', async () => {
      const projectPath = createTempProject('unreadable-long', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      // Pass a non-existent file to trigger the catch in _findLongFiles
      const result = cmd._findLongFiles(['/nonexistent/path/file.js']);
      expect(result).toEqual([]);
    });

    it('handles unreadable files in _findHighExportFiles gracefully', async () => {
      const projectPath = createTempProject('unreadable-exports', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = cmd._findHighExportFiles(['/nonexistent/path/file.js']);
      expect(result).toEqual([]);
    });

    it('handles malformed package.json in _getCoreDependencies', async () => {
      const projectPath = createTempProject('bad-pkg', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), 'this is not valid json{{{');
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = cmd._getCoreDependencies();
      expect(result).toEqual([]);
    });

    it('handles package.json without dependencies field', async () => {
      const projectPath = createTempProject('no-deps-pkg', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'test' }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = cmd._getCoreDependencies();
      expect(result).toEqual([]);
    });

    it('prints long files with more than 10 untested and more than 10 deps', async () => {
      const projectPath = createTempProject('many-items', (p) => {
        const deps = {};
        for (let i = 0; i < 15; i++) {
          deps[`dep-${i}`] = '^1.0.0';
        }
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: deps }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        for (let i = 0; i < 15; i++) {
          fs.writeFileSync(path.join(srcDir, `file${i}.js`), 'module.exports = {};\n');
        }
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('and 5 more');
    });

    it('prints long files in human-readable output', async () => {
      const projectPath = createTempProject('long-output', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: {} }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const longContent = Array(550).fill('// line').join('\n') + '\nmodule.exports = {};\n';
        fs.writeFileSync(path.join(srcDir, 'big.js'), longContent);
        fs.writeFileSync(path.join(srcDir, 'small.js'), 'exports.x = 1;\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('big.js');
      expect(printed).toMatch(/55[0-9] lines/);
    });

    it('prints high export files in human-readable output', async () => {
      const projectPath = createTempProject('high-exports-output', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: {} }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const exportsList = [];
        for (let i = 0; i < 15; i++) {
          exportsList.push(`  func${i}`);
        }
        const content = `module.exports = {\n${exportsList.join(',\n')}\n};\n`;
        fs.writeFileSync(path.join(srcDir, 'mega.js'), content);
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('mega.js');
      expect(printed).toContain('15 exports');
    });

    it('prints scope in human-readable output when scope is provided', async () => {
      const projectPath = createTempProject('scope-output', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      await cmd.execute('my-scope', {});

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('my-scope');
    });

    it('uses default cwd when none provided', async () => {
      const projectPath = createTempProject('default-cwd', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand();
      expect(cmd.cwd).toBe(process.cwd());
    });

    it('handles non-existent sourceDir', async () => {
      const projectPath = createTempProject('no-srcdir', () => {
        // no src dir created
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.untestedFiles).toEqual([]);
      expect(result.longFiles).toEqual([]);
      expect(result.highExportFiles).toEqual([]);
    });

    it('handles .spec. test files in categorization', async () => {
      const projectPath = createTempProject('spec-files', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'module.exports = {};\n');
        fs.writeFileSync(path.join(srcDir, 'mod.spec.js'), 'test("mod", () => {});\n');
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.untestedFiles.length).toBe(0);
    });

    it('prints markdown with long files and high exports', async () => {
      const projectPath = createTempProject('md-long-export', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: { express: '^4.0.0' } }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const longContent = Array(550).fill('// line').join('\n') + '\nmodule.exports = {};\n';
        fs.writeFileSync(path.join(srcDir, 'big.js'), longContent);
        const exportsList = [];
        for (let i = 0; i < 15; i++) {
          exportsList.push(`  func${i}`);
        }
        const exportContent = `module.exports = {\n${exportsList.join(',\n')}\n};\n`;
        fs.writeFileSync(path.join(srcDir, 'mega.js'), exportContent);
      });
      process.chdir(projectPath);

      const outputFile = path.join(projectPath, 'report.md');
      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, { output: 'report.md' });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('big.js');
      expect(content).toContain('mega.js');
    });

    it('prints markdown with all tested files (no hotspots)', async () => {
      const projectPath = createTempProject('md-clean', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: {} }));
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, 'mod.js'), 'exports.x = 1;\n');
        fs.writeFileSync(path.join(srcDir, 'mod.test.js'), 'test("x", () => {});\n');
      });
      process.chdir(projectPath);

      const outputFile = path.join(projectPath, 'report.md');
      const cmd = new ExploreCommand(projectPath);
      await cmd.execute(null, { output: 'report.md' });

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('All source files have corresponding tests');
      expect(content).toContain('No files exceed the threshold');
    });

    it('counts exports. assignments in high export detection', async () => {
      const projectPath = createTempProject('exports-assign', (p) => {
        const srcDir = path.join(p, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        // Create a file with 12 exports. assignments
        const lines = [];
        for (let i = 0; i < 12; i++) {
          lines.push(`exports.func${i} = function() {};\n`);
        }
        fs.writeFileSync(path.join(srcDir, 'many-exports.js'), lines.join(''));
      });
      process.chdir(projectPath);

      const cmd = new ExploreCommand(projectPath);
      const result = await cmd.execute(null, { json: true });

      expect(result.highExportFiles.length).toBe(1);
      expect(path.basename(result.highExportFiles[0].file)).toBe('many-exports.js');
      expect(result.highExportFiles[0].exportCount).toBe(12);
    });
  });
});
