const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

describe('round22 targeted branch coverage', () => {
  describe('pre-file-write stdin and helper edge branches', () => {
    const hookPath = path.resolve(__dirname, '..', 'src', 'templates', 'hooks', 'pre-file-write.js');
    const {
      runChecks,
      getCorrespondingTestFile,
      checkCodeStyle,
      checkSecurity,
    } = require('../src/templates/hooks/pre-file-write');

    test('stdin exits with code 1 when a blocking implementation violation is returned', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r22-pre-'));
      try {
        const filePath = path.join(tmp, 'src', 'app.js');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const input = JSON.stringify({
          tool_name: 'Write',
          tool_input: { file_path: filePath, content: 'const x = 1;' },
        });
        const result = execSync(`echo '${input}' | node "${hookPath}" 2>&1; echo "exit:$?"`, { encoding: 'utf8' });
        expect(result).toContain('"block":true');
        expect(result).toContain('exit:1');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    test('runChecks handles missing tool_input fields through default fallbacks', async () => {
      const result = await runChecks({ tool_name: 'Write', tool_input: {} });
      expect(result.block).toBe(false);
      expect(result.violations).toEqual([]);
    });

    test('getCorrespondingTestFile returns default candidate when no candidate exists', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r22-testfile-'));
      try {
        const filePath = path.join(tmp, 'src', 'missing.ts');
        const candidate = getCorrespondingTestFile(filePath);
        expect(candidate.endsWith(path.join('src', 'missing.test.ts'))).toBe(true);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    test('style and security checks hit long-file and password/api-key branches', () => {
      const longContent = Array.from({ length: 501 }, (_, i) => `line${i}`).join('\n');
      expect(checkCodeStyle(longContent)[0].message).toContain('File too long');

      const messages = checkSecurity('const password = "pw"; const api_key = "abc";')
        .map(v => v.message);
      expect(messages).toContain('Hardcoded sensitive data detected: password');
      expect(messages).toContain('Hardcoded sensitive data detected: API key');
    });
  });

  describe('graph exported/helper branch coverage through command actions', () => {
    function captureActions() {
      jest.resetModules();
      const graphMod = require('../src/cli/commands/graph');
      const actions = {};
      const mockGraph = {
        command: jest.fn().mockImplementation((name) => { actions._current = name; return mockGraph; }),
        description: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        alias: jest.fn().mockReturnThis(),
        addHelpText: jest.fn().mockReturnThis(),
        action: jest.fn().mockImplementation((fn) => { actions[actions._current] = fn; return mockGraph; }),
      };
      graphMod.graphCommand(mockGraph);
      return { actions, graphMod };
    }

    let logSpy;
    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      process.exitCode = 0;
    });
    afterEach(() => {
      jest.restoreAllMocks();
      process.exitCode = 0;
    });

    test('visualize default options produce Mermaid output to console', async () => {
      const { actions } = captureActions();
      await actions.visualize();
      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('graph TD');
    });

    test('analyze and parallel default option branches print fallback text', async () => {
      const { actions } = captureActions();
      await actions.analyze();
      await actions.parallel();
      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('Graph:');
      expect(output).toContain('Layer 0');
    });

    test('visualize writes Mermaid output when output path is provided', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r22-graph-'));
      try {
        const { actions } = captureActions();
        const out = path.join(tmp, 'nested', 'graph.mmd');
        await actions.visualize({ output: out });
        expect(fs.readFileSync(out, 'utf8')).toContain('graph TD');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('update command summary branch coverage', () => {
    let logSpy;
    beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => { logSpy.mockRestore(); });

    test('printSummary emits workspace registry updated and would-update branches', () => {
      const { UpdateCommand } = require('../src/cli/commands/update');
      const cmd = new UpdateCommand();
      cmd.options = { dryRun: false, force: false };
      cmd.report = cmd.createReport();
      cmd.report.config = { merged: true, added: ['workspace registry'], skipped: [] };
      cmd.printSummary();
      expect(logSpy.mock.calls.map(c => String(c[0])).join('\n')).toContain('Workspace registry: updated');

      logSpy.mockClear();
      cmd.options = { dryRun: true, force: false };
      cmd.report = cmd.createReport();
      cmd.report.config = { merged: true, added: ['workspace registry would update'], skipped: [] };
      cmd.printSummary();
      expect(logSpy.mock.calls.map(c => String(c[0])).join('\n')).toContain('Workspace registry: would update');
    });

    test('printSummary emits config skipped and truncates long error list', () => {
      const { UpdateCommand } = require('../src/cli/commands/update');
      const cmd = new UpdateCommand();
      cmd.options = { dryRun: false, force: false };
      cmd.report = cmd.createReport();
      cmd.report.config = { merged: false, added: [], skipped: ['manual changes'] };
      for (let i = 0; i < 6; i++) cmd.addError('scope', `message-${i}`, new Error(`boom-${i}`), `file-${i}.js`);
      cmd.printSummary();
      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('Config: skipped');
      expect(output).toContain('...and 1 more');
    });
  });
});
