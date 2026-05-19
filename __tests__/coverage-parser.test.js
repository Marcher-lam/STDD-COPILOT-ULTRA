const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseCoverage } = require('../src/utils/coverage-parser');

describe('coverage parser', () => {
  let tempDirs = [];

  function tempProject() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-coverage-parser-'));
    tempDirs.push(dir);
    return dir;
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses lcov.info totals', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'lcov.info'), [
      'TN:',
      'SF:src/a.js',
      'FNF:2',
      'FNH:1',
      'BRF:4',
      'BRH:3',
      'LF:10',
      'LH:8',
      'end_of_record',
    ].join('\n'));

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.type).toBe('lcov');
    expect(result.lines.pct).toBe(80);
    expect(result.branches.pct).toBe(75);
    expect(result.functions.pct).toBe(50);
  });

  it('parses coverage-summary.json totals', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-summary.json'), JSON.stringify({
      total: {
        lines: { total: 20, covered: 18, pct: 90 },
        functions: { total: 5, covered: 4, pct: 80 },
        branches: { total: 10, covered: 7, pct: 70 },
        statements: { total: 25, covered: 20, pct: 80 },
      },
    }));

    const result = parseCoverage(root);

    expect(result.type).toBe('coverage-summary');
    expect(result.lines.pct).toBe(90);
    expect(result.functions.pct).toBe(80);
    expect(result.branches.pct).toBe(70);
    expect(result.statements.pct).toBe(80);
  });

  it('parses Istanbul coverage-final.json', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-final.json'), JSON.stringify({
      '/tmp/a.js': {
        statementMap: {
          0: { start: { line: 1 }, end: { line: 1 } },
          1: { start: { line: 2 }, end: { line: 2 } },
        },
        s: { 0: 1, 1: 0 },
        fnMap: { 0: {}, 1: {} },
        f: { 0: 1, 1: 0 },
        branchMap: { 0: {} },
        b: { 0: [1, 0] },
      },
    }));

    const result = parseCoverage(root);

    expect(result.type).toBe('istanbul-json');
    expect(result.statements.pct).toBe(50);
    expect(result.lines.pct).toBe(50);
    expect(result.functions.pct).toBe(50);
    expect(result.branches.pct).toBe(50);
  });

  it('parses Python coverage.xml rates', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'coverage.xml'), '<?xml version="1.0" ?><coverage line-rate="0.875" branch-rate="0.5"></coverage>');

    const result = parseCoverage(root);

    expect(result.type).toBe('coverage-xml');
    expect(result.lines.pct).toBe(87.5);
    expect(result.branches.pct).toBe(50);
  });

  it('returns found false when no coverage report exists', () => {
    const root = tempProject();

    const result = parseCoverage(root);

    expect(result).toEqual({ found: false });
  });

  it('handles corrupt coverage-summary.json gracefully', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-summary.json'), 'not valid json');

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('handles empty Istanbul JSON', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-final.json'), '{}');

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.type).toBe('istanbul-json');
    expect(result.statements.pct).toBe(null);
  });

  it('handles Istanbul JSON with missing statementMap', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-final.json'), JSON.stringify({
      '/tmp/b.js': {
        s: { 0: 1 },
        f: {},
        b: {},
      },
    }));

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.statements.pct).toBe(100);
  });

  it('handles coverage-summary.json with no total', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-summary.json'), '{}');

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.lines).toBe(null);
  });

  it('handles coverage.xml with no rates', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'coverage.xml'), '<coverage></coverage>');

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.lines).toBe(null);
    expect(result.branches).toBe(null);
  });

  it('falls back to coverage-final.json at root when coverage/ dir missing', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'coverage-final.json'), JSON.stringify({
      '/tmp/c.js': {
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        s: { 0: 1 },
        f: {},
        b: {},
      },
    }));

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.type).toBe('istanbul-json');
  });

  it('handles lcov with zero totals', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'lcov.info'), 'TN:\nSF:empty.js\nend_of_record');

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.lines.pct).toBe(null);
    expect(result.branches.pct).toBe(null);
  });

  it('parses Istanbul JSON with non-array branch hits', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
    fs.writeFileSync(path.join(root, 'coverage', 'coverage-final.json'), JSON.stringify({
      '/tmp/d.js': {
        statementMap: {},
        s: {},
        f: {},
        b: { 0: 'not-array' },
      },
    }));

    const result = parseCoverage(root);

    expect(result.found).toBe(true);
    expect(result.branches.total).toBe(0);
  });

  it('uses cwd when no root provided', () => {
    const result = parseCoverage();
    expect(result).toBeDefined();
    expect(typeof result.found).toBe('boolean');
  });
});
