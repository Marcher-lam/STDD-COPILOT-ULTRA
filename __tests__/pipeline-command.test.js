const fs = require('fs');
const path = require('path');
const os = require('os');
const { PipelineCommand } = require('../src/cli/commands/pipeline');

function setupWithSpecs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pipeline-'));
  const stdd = path.join(tmp, 'stdd');
  const specs = path.join(stdd, 'specs');
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(path.join(specs, 'login.feature'),
    'Feature: User Login\n  Scenario: Successful login\n    Given a user exists\n    When they login\n    Then they see dashboard\n'
  );
  return tmp;
}

describe('PipelineCommand', () => {
  it('generates IR and test skeleton from specs', () => {
    const tmp = setupWithSpecs();
    const cmd = new PipelineCommand(tmp);
    const result = cmd.execute(null);
    expect(result.status).toBe('generated');
    expect(result.ir).toBeDefined();
    expect(result.tests).toBeDefined();
    expect(fs.existsSync(result.ir)).toBe(true);
    expect(fs.existsSync(result.tests)).toBe(true);
  });

  it('generated test file contains test stubs', () => {
    const tmp = setupWithSpecs();
    const cmd = new PipelineCommand(tmp);
    cmd.execute(null);
    const content = fs.readFileSync(path.join(tmp, 'stdd', 'pipeline', 'generated-tests.test.js'), 'utf8');
    expect(content).toContain('test(');
  });

  it('IR file contains scenarios', () => {
    const tmp = setupWithSpecs();
    const cmd = new PipelineCommand(tmp);
    cmd.execute(null);
    const ir = JSON.parse(fs.readFileSync(path.join(tmp, 'stdd', 'pipeline', 'ir.json'), 'utf8'));
    expect(ir.scenarios).toBeDefined();
    expect(ir.scenarios.length).toBeGreaterThan(0);
  });

  it('throws when specs dir missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pipeline-nospecs-'));
    fs.mkdirSync(path.join(tmp, 'stdd'));
    const cmd = new PipelineCommand(tmp);
    expect(() => cmd.execute(null)).toThrow();
  });

  it('handles change-specific specs dir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pipeline-change-'));
    const stdd = path.join(tmp, 'stdd');
    const changeDir = path.join(stdd, 'changes', 'my-change');
    const specs = path.join(changeDir, 'specs');
    fs.mkdirSync(specs, { recursive: true });
    fs.writeFileSync(path.join(specs, 'api.feature'),
      'Feature: API\n  Scenario: Get data\n    Given endpoint\n    When called\n    Then returns 200\n'
    );
    const cmd = new PipelineCommand(tmp);
    const result = cmd.execute('my-change');
    expect(result.status).toBe('generated');
  });

  it('uses process.cwd() when no cwd argument is given', () => {
    const cmd = new PipelineCommand();
    expect(cmd.cwd).toBe(process.cwd());
  });

  it('uses fallback empty string when changeName is given but change dir does not exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pipeline-nullchange-'));
    const stdd = path.join(tmp, 'stdd');
    fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
    // Create specs at the fallback path so the command does not throw
    // When changeDir is null, specsDir = path.join('', 'specs') = 'specs' (relative)
    // That won't exist, so the command throws — which is expected.
    const cmd = new PipelineCommand(tmp);
    expect(() => cmd.execute('nonexistent-change')).toThrow(/Spec directory not found/);
  });

  it('prints JSON output when options.json is true', () => {
    const tmp = setupWithSpecs();
    const cmd = new PipelineCommand(tmp);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = cmd.execute(null, { json: true });
      expect(result.status).toBe('generated');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status": "generated"')
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
