const fs = require('fs');
const path = require('path');
const os = require('os');
const { CodeGraphIndexer } = require('../src/utils/codegraph/indexer');
const { CodeGraphScanner } = require('../src/utils/codegraph/scanner');
const { SCHEMA_VERSION } = require('../src/utils/codegraph/schema');

function makeProject(name = 'codegraph') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `stdd-${name}-`));
  fs.mkdirSync(path.join(root, 'stdd', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'stdd', 'graph'), { recursive: true });
  fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `project: test\ncodegraph:\n  enabled: true\n  source_roots:\n    - src\n    - __tests__\n`);
  return root;
}

describe('CodeGraph', () => {
  let dirs = [];

  afterEach(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs = [];
  });

  it('builds an empty graph for greenfield projects', () => {
    const cwd = makeProject('empty');
    dirs.push(cwd);
    const graph = new CodeGraphIndexer(cwd).build();

    expect(graph.index.schemaVersion).toBe(SCHEMA_VERSION);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(fs.existsSync(path.join(cwd, 'stdd', 'memory', 'codegraph.md'))).toBe(true);
  });

  it('indexes JS/TS files with symbols and imports', () => {
    const cwd = makeProject('js');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'foo.ts'), `import chalk from 'chalk';\nexport function foo() { return chalk.green('x'); }\nexport class Bar {}`);

    const graph = new CodeGraphIndexer(cwd).build();

    expect(graph.nodes.some(n => n.kind === 'file' && n.path === 'src/foo.ts')).toBe(true);
    expect(graph.nodes.some(n => n.kind === 'symbol' && n.name === 'foo')).toBe(true);
    expect(graph.nodes.some(n => n.kind === 'symbol' && n.name === 'Bar')).toBe(true);
    expect(graph.edges.some(e => e.kind === 'contains')).toBe(true);
    expect(graph.edges.some(e => e.kind === 'imports' && e.to === 'external:chalk')).toBe(true);
  });

  it('indexes Python functions, classes, and imports', () => {
    const cwd = makeProject('py');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'app.py'), `import os\nfrom json import loads\ndef main():\n    return os.getcwd()\nclass App:\n    pass\n`);

    const graph = new CodeGraphIndexer(cwd).build();

    expect(graph.nodes.some(n => n.name === 'main')).toBe(true);
    expect(graph.nodes.some(n => n.name === 'App')).toBe(true);
    expect(graph.edges.some(e => e.kind === 'imports' && e.to === 'external:os')).toBe(true);
    expect(graph.edges.some(e => e.kind === 'imports' && e.to === 'external:json')).toBe(true);
  });

  it('syncs a modified file and replaces old symbols', () => {
    const cwd = makeProject('sync');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    const file = path.join(cwd, 'src', 'foo.js');
    fs.writeFileSync(file, `export function oldName() {}`);
    const indexer = new CodeGraphIndexer(cwd);
    indexer.build();

    fs.writeFileSync(file, `export function newName() {}`);
    const graph = indexer.syncFile(file);

    expect(graph.nodes.some(n => n.name === 'oldName')).toBe(false);
    expect(graph.nodes.some(n => n.name === 'newName')).toBe(true);
  });

  it('removes nodes and edges when a file is deleted', () => {
    const cwd = makeProject('remove');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    const file = path.join(cwd, 'src', 'foo.js');
    fs.writeFileSync(file, `export function foo() {}`);
    const indexer = new CodeGraphIndexer(cwd);
    indexer.build();

    fs.unlinkSync(file);
    const graph = indexer.syncFile(file);

    expect(graph.nodes.some(n => n.path === 'src/foo.js')).toBe(false);
    expect(graph.edges.some(e => e.evidence && e.evidence.path === 'src/foo.js')).toBe(false);
  });

  it('links test files to matching source files', () => {
    const cwd = makeProject('tests');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'foo.ts'), `export function foo() {}`);
    fs.writeFileSync(path.join(cwd, 'src', 'foo.test.ts'), `import { foo } from './foo';\ntest('foo', () => foo());`);

    const graph = new CodeGraphIndexer(cwd).build();

    expect(graph.edges.some(e => e.kind === 'tests' && e.to === 'file:src/foo.ts')).toBe(true);
  });

  it('queries symbols and paths', () => {
    const cwd = makeProject('query');
    dirs.push(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'auth.js'), `export function login() {}`);
    const indexer = new CodeGraphIndexer(cwd);
    indexer.build();

    const result = indexer.query('login');

    expect(result.results[0].name).toBe('login');
  });

  it('ignores unsupported and ignored paths', () => {
    const cwd = makeProject('ignore');
    dirs.push(cwd);
    const scanner = new CodeGraphScanner(cwd);

    expect(scanner.isSupportedFile('README.md')).toBe(false);
    expect(scanner.isIgnoredPath(path.join(cwd, 'node_modules', 'x.js'))).toBe(true);
  });
});
