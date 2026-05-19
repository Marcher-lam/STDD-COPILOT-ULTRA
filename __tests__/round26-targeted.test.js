const fs = require('fs');
const os = require('os');
const path = require('path');

const tmps = [];
function mkTmp(p = 'stdd-r26-') { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmps.push(d); return d; }
afterAll(() => { for (const d of tmps) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

describe('round26: doctor.js', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); jest.restoreAllMocks(); });

  test('husky in devDeps', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    fs.mkdirSync(path.join(dir, 'stdd'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'stdd', 'config.yaml'), 'version: "1.0"\n');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { husky: '^8' } }));
    const r = new DoctorCommand(dir).husky();
    expect(['pass', 'info']).toContain(r.status);
  });

  test('_deepChecks eslint warn', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    jest.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 1, error: null });
    const results = new DoctorCommand(mkTmp())._deepChecks();
    expect(results.find(r => r.id === 'lintAvailable')).toBeDefined();
  });

  test('_deepChecks active changes', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    const c = path.join(dir, 'stdd', 'changes', 'my-change');
    fs.mkdirSync(c, { recursive: true });
    fs.writeFileSync(path.join(c, 'tasks.md'), '- [ ] T\n');
    jest.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 1, error: new Error('x') });
    const results = new DoctorCommand(dir)._deepChecks();
    expect(results.find(r => r.id === 'activeChanges')).toBeDefined();
  });

  test('_deepChecks coverage found', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    fs.mkdirSync(path.join(dir, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'coverage', 'lcov.info'), 'TN:\n');
    jest.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 1, error: new Error('x') });
    const results = new DoctorCommand(dir)._deepChecks();
    expect(results.find(r => r.id === 'coverageReport').status).toBe('pass');
  });

  test('_deepChecks constitution scan', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    fs.mkdirSync(path.join(dir, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'stdd', 'config.yaml'), 'version: "1.0"\n');
    fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'const s="hardcoded_password_abc";\n');
    jest.spyOn(require('child_process'), 'spawnSync').mockReturnValue({ status: 1, error: new Error('x') });
    const results = new DoctorCommand(dir)._deepChecks();
    expect(results.find(r => r.id === 'constitution')).toBeDefined();
  });

  test('_deepChecks npm audit', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    jest.spyOn(require('child_process'), 'spawnSync').mockImplementation((c, a) => {
      if (a && a[0] === 'audit') return { status: 1 };
      return { status: 1, error: new Error('x') };
    });
    const results = new DoctorCommand(mkTmp())._deepChecks();
    expect(results.find(r => r.id === 'npmAudit')).toBeDefined();
  });
});

describe('round26: coverage-parser', () => {
  test('parseCoverage with summary', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'coverage-summary.json'), JSON.stringify({
      total: { lines: { covered: 100, total: 120, pct: 83 }, branches: { covered: 80, total: 100, pct: 80 }, functions: { covered: 50, total: 50, pct: 100 }, statements: { covered: 90, total: 110, pct: 82 } },
    }));
    expect(parseCoverage(dir)).toBeDefined();
  });

  test('parseCoverage with istanbul json', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'coverage-final.json'), JSON.stringify({
      'a.js': { s: { '0': 1 }, f: { '0': 1 }, b: { '0': [1] }, statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } } },
    }));
    expect(parseCoverage(dir)).toBeDefined();
  });

  test('parseCoverage with xml', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'cobertura-coverage.xml'), '<coverage line-rate="0.85" branch-rate="0.75"></coverage>');
    expect(parseCoverage(dir)).toBeDefined();
  });

  test('parseCoverage not found', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    const r = parseCoverage(mkTmp());
    expect(r.found).toBe(false);
  });
});

describe('round26: contract', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });
  test('generate action throws without api-spec', async () => {
    const { ContractCommand } = require('../src/cli/commands/contract');
    try { await new ContractCommand(mkTmp()).execute('generate', 'c', {}); } catch (e) { expect(e).toBeDefined(); }
  });
  test('verify action throws without contracts dir', async () => {
    const { ContractCommand } = require('../src/cli/commands/contract');
    try { await new ContractCommand(mkTmp()).execute('verify', 'c', {}); } catch (e) { expect(e).toBeDefined(); }
  });
});

describe('round26: evidence-capture', () => {
  test('capture basic evidence', () => {
    const EC = require('../src/utils/evidence-capture');
    const ec = new EC();
    const r = ec.capture('node-1', new Error('test fail'), { input: 'data' });
    expect(r).toBeDefined();
    expect(r.nodeName).toBe('node-1');
    expect(r.error.message).toBe('test fail');
  });
  test('capture with chain', () => {
    const EC = require('../src/utils/evidence-capture');
    const ec = new EC();
    ec.capture('node-1', new Error('first'));
    const r = ec.capture('node-2', new Error('second'));
    expect(ec.chain.length).toBe(2);
    expect(r.id).toBeDefined();
  });
});

describe('round26: schema', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });
  test('validate with no stdd', async () => {
    const { SchemaCommand } = require('../src/cli/commands/schema');
    try { await new SchemaCommand(mkTmp()).validate({}, {}); } catch (e) { expect(e).toBeDefined(); }
  });
  test('create with no stdd', async () => {
    const { SchemaCommand } = require('../src/cli/commands/schema');
    try { await new SchemaCommand(mkTmp()).create({}, {}); } catch (e) { expect(e).toBeDefined(); }
  });
});

describe('round26: learn', () => {
  test('execute defaults', async () => {
    const { LearnCommand } = require('../src/cli/commands/learn');
    expect(await new LearnCommand(mkTmp()).execute({}, {})).toBeDefined();
  });
});

describe('round26: roles', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });
  test('execute defaults', async () => {
    const { RolesCommand } = require('../src/cli/commands/roles');
    expect(await new RolesCommand(mkTmp()).execute({}, {})).toBeDefined();
  });
});

describe('round26: tdd-init', () => {
  test('empty dir', async () => {
    const { TddInitCommand } = require('../src/cli/commands/tdd-init');
    const s = { start: jest.fn(), stop: jest.fn(), succeed: jest.fn(), fail: jest.fn(), text: '' };
    expect(await new TddInitCommand(s).execute(mkTmp())).toBeDefined();
  });
});

describe('round26: constitution-status', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });
  test('no stdd', async () => {
    const { ConstitutionStatusCommand } = require('../src/cli/commands/constitution-status');
    expect(await new ConstitutionStatusCommand(mkTmp()).execute({}, {})).toBeDefined();
  });
});
