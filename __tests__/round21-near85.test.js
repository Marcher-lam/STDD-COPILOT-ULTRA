const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

const { UpdateCommand } = require('../src/cli/commands/update');
const { ProductProposalCommand } = require('../src/cli/commands/product-proposal');
const { InitCommand } = require('../src/cli/commands/init');
const { ConstitutionFixCommand } = require('../src/cli/commands/constitution-fix');
const { GraphHistoryCommand } = require('../src/cli/commands/graph-history');
const { AuditCommand } = require('../src/cli/commands/audit');
const { ContractCommand } = require('../src/cli/commands/contract');

const silentSpinner = { text: '', start() {}, stop() {}, succeed() {}, fail() {} };

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirs) {
  for (const dir of dirs) {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }
}

function captureLog(fn) {
  const lines = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.map(String).join(' '));
  });
  return Promise.resolve()
    .then(fn)
    .then(result => ({ result, output: lines.join('\n') }))
    .finally(() => spy.mockRestore());
}

describe('round21 near-85 branch coverage boosters', () => {
  const tempDirs = [];

  afterAll(() => cleanup(tempDirs));

  describe('UpdateCommand targeted branches', () => {
    it('formats workspace registry scalar edge cases', () => {
      const cmd = new UpdateCommand(silentSpinner);
      const block = cmd.renderWorkspaceRegistryBlock({
        enabled: false,
        items: [{
          name: 'api',
          root: 'packages/api',
          source_root: 'packages/api/src',
          package_json: 'packages/api/package.json',
          active: true,
          retries: 2,
          empty: null,
          note: 'needs quoting: yes',
        }],
      });

      expect(block).toContain('enabled: false');
      expect(block).toContain('active: true');
      expect(block).toContain('retries: 2');
      expect(block).toContain('empty: null');
      expect(block).toContain('note: "needs quoting: yes"');
    });

    it('records add errors when source file cannot be read', async () => {
      const root = makeTempDir('stdd-r21-update-error-');
      tempDirs.push(root);
      const srcDir = path.join(root, 'src');
      const targetDir = path.join(root, 'target');
      fs.mkdirSync(srcDir, { recursive: true });
      const sourceFile = path.join(srcDir, 'a.md');
      fs.writeFileSync(sourceFile, 'hello');

      const cmd = new UpdateCommand(silentSpinner);
      const originalReadFile = fs.promises.readFile;
      jest.spyOn(fs.promises, 'readFile').mockImplementation(async (filePath, enc) => {
        if (filePath === sourceFile) throw new Error('simulated read failure');
        return originalReadFile.call(fs.promises, filePath, enc);
      });

      try {
        const result = await cmd.syncDirectory(srcDir, targetDir, { scope: 'broken-add' });
        expect(result.added).toBe(0);
        expect(cmd.report.errors).toHaveLength(1);
        expect(cmd.report.errors[0].scope).toBe('broken-add');
      } finally {
        fs.promises.readFile.mockRestore();
      }
    });

    it('records update errors when force write fails', async () => {
      const root = makeTempDir('stdd-r21-update-write-');
      tempDirs.push(root);
      const srcDir = path.join(root, 'src');
      const targetDir = path.join(root, 'target');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(targetDir, { recursive: true });
      const targetFile = path.join(targetDir, 'a.md');
      fs.writeFileSync(path.join(srcDir, 'a.md'), 'new');
      fs.writeFileSync(targetFile, 'old');

      const cmd = new UpdateCommand(silentSpinner);
      const originalWriteFile = fs.promises.writeFile;
      jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (filePath, content, enc) => {
        if (filePath === targetFile) throw new Error('simulated write failure');
        return originalWriteFile.call(fs.promises, filePath, content, enc);
      });

      try {
        const result = await cmd.syncDirectory(srcDir, targetDir, { force: true, scope: 'broken-update' });
        expect(result.updated).toBe(0);
        expect(cmd.report.errors[0].message).toContain('Failed to sync');
      } finally {
        fs.promises.writeFile.mockRestore();
      }
    });

    it('detects engine dirs only when configured directories exist', async () => {
      const root = makeTempDir('stdd-r21-update-engines-');
      tempDirs.push(root);
      fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
      const cmd = new UpdateCommand(silentSpinner);
      const found = await cmd.detectEngineDirs(root);
      expect(found).toContain('.claude');
      expect(found).not.toContain('.definitely-missing');
    });
  });

  describe('ProductProposalCommand targeted branches', () => {
    it('returns JSON structured data when optional artifacts are missing', async () => {
      const root = makeTempDir('stdd-r21-product-json-');
      tempDirs.push(root);
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });

      const { result, output } = await captureLog(() => new ProductProposalCommand(root).execute({ json: true }));
      const parsed = JSON.parse(output);

      expect(result.metadata.project).toBe('unknown');
      expect(parsed.sections.overview.changeCount).toBe(0);
      expect(parsed.artifactCoverage.vision).toBe(false);
    });

    it('handles task status variants without touching files', () => {
      const cmd = new ProductProposalCommand('/tmp/nonexistent-stdd-r21');
      cmd.artifacts = {
        tasks: [
          { change: 'empty', content: 'No checkbox tasks here' },
          { change: 'done', content: '- [x] one\n- [x] two\n' },
          { change: 'progress', content: '- [x] one\n- [ ] two\n' },
        ],
      };

      expect(cmd.getTaskStatus('missing')).toBe('未拆解');
      expect(cmd.getTaskStatus('empty')).toBe('已拆解');
      expect(cmd.getTaskStatus('done')).toBe('已完成 (2/2)');
      expect(cmd.getTaskStatus('progress')).toBe('进行中 (1/2)');
    });

    it('infers AI, web and frontend trends from dependencies', () => {
      const cmd = new ProductProposalCommand('/tmp/nonexistent-stdd-r21');
      cmd.artifacts = {
        config: null,
        specs: null,
        evidence: null,
        packageJson: { dependencies: { '@anthropic-ai/sdk': '^1.0.0', express: '^4.0.0', react: '^18.0.0' } },
      };

      const trends = cmd.inferTrendsFromArtifacts().join('\n');
      expect(trends).toContain('AI/LLM');
      expect(trends).toContain('Web 服务');
      expect(trends).toContain('前端应用');
    });

    it('parses progress log while skipping invalid JSON lines', () => {
      const root = makeTempDir('stdd-r21-product-progress-');
      tempDirs.push(root);
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(root, 'stdd', 'progress.jsonl'), '{"ok":true}\nnot-json\n{"ok":2}\n');

      const cmd = new ProductProposalCommand(root);
      expect(cmd.readProgressLog()).toEqual([{ ok: true }, { ok: 2 }]);
    });
  });

  describe('InitCommand targeted branches', () => {
    it('shouldPromptForAgents respects non-interactive flags and TTY state', () => {
      const cmd = new InitCommand(silentSpinner);
      const stdinTTY = process.stdin.isTTY;
      const stdoutTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      try {
        expect(cmd.shouldPromptForAgents({ yes: true })).toBe(false);
        expect(cmd.shouldPromptForAgents({ nonInteractive: true })).toBe(false);
        expect(cmd.shouldPromptForAgents({})).toBe(true);
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: stdinTTY, configurable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: stdoutTTY, configurable: true });
      }
    });

    it('renders workspace registry and GitHub workspace placeholders', () => {
      const root = makeTempDir('stdd-r21-init-registry-');
      tempDirs.push(root);
      const workspace = {
        name: '@demo/api',
        root: path.join(root, 'packages', 'api'),
        sourceDir: path.join(root, 'packages', 'api', 'src'),
        packageJsonPath: path.join(root, 'packages', 'api', 'package.json'),
      };
      const cmd = new InitCommand(silentSpinner);
      const list = cmd.formatAffectedWorkspaces([workspace], root);
      const rendered = cmd.renderGitHubTemplate('A\n<!-- STDD:WORKSPACES:start -->\nold\n<!-- STDD:WORKSPACES:end -->\nB', root, [workspace]);

      expect(list).toBe('- [ ] packages/api');
      expect(rendered).toContain('- [ ] packages/api');
      expect(rendered).not.toContain('old');
    });

    it('formats tech stack with unknown framework and runner branches', () => {
      const cmd = new InitCommand(silentSpinner);
      expect(cmd.formatTechStack({ language: 'go', framework: 'unknown', testRunner: 'unknown' })).toBe('Go project');
      expect(cmd.formatTechStack({ language: 'rust', framework: 'actix', testRunner: 'cargo test' })).toContain('actix framework');
    });
  });

  describe('ConstitutionFixCommand targeted branches', () => {
    it('covers public export detection and fallback extraction helpers', () => {
      const cmd = new ConstitutionFixCommand(silentSpinner);
      expect(cmd._isPublicExport('export default MyThing')).toBe(true);
      expect(cmd._isPublicExport('const hidden = 1')).toBe(false);
      expect(cmd._isSimpleExport('export const enabled = true')).toBe(true);
      expect(cmd._extractExportName('export default function Named() {}')).toBe('Named');
      expect(cmd._extractExportName('export default MyThing')).toBe('MyThing');
      expect(cmd._extractExportName('export { x }')).toBe('unknown');
      expect(cmd._extractParams('export const fn = async (first, second = 2) => first')).toEqual(['first', 'second']);
      expect(cmd._extractParams('export const value = 1')).toEqual([]);
    });

    it('detects linters from fallback config files and invalid package JSON', () => {
      const root = makeTempDir('stdd-r21-fix-linter-');
      tempDirs.push(root);
      const cmd = new ConstitutionFixCommand(silentSpinner);
      fs.writeFileSync(path.join(root, 'package.json'), '{bad json');
      fs.writeFileSync(path.join(root, 'eslint.config.js'), 'module.exports = [];\n');

      expect(cmd._detectLinter(root)).toEqual({ name: 'eslint', command: 'npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix' });
    });

    it('returns article 5 no-op when no source directories exist', async () => {
      const root = makeTempDir('stdd-r21-fix-nosrc-');
      tempDirs.push(root);
      const cmd = new ConstitutionFixCommand(silentSpinner);
      const result = await cmd._fixArticle5(root, true);
      expect(result).toEqual({ fixed: [], dryRun: true });
      expect(cmd._findSourceFiles(path.join(root, 'missing'))).toEqual([]);
    });

    it('returns zero lint count for unknown linter', async () => {
      const cmd = new ConstitutionFixCommand(silentSpinner);
      await expect(cmd._countLintErrors('/tmp', { name: 'unknown' })).resolves.toBe(0);
    });
  });

  describe('GraphHistoryCommand targeted branches', () => {
    it('extracts workspace refs from tests and constitution issue paths while ignoring invalid JSON', () => {
      const root = makeTempDir('stdd-r21-history-scan-');
      tempDirs.push(root);
      const evidenceDir = path.join(root, 'stdd', 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, 'verify-1.json'), JSON.stringify({
        id: 'verify-one',
        type: 'verify',
        timestamp: '2026-01-01T00:00:00.000Z',
        unixTimestamp: 1,
        status: 'pass',
        results: {
          tests: { workspaces: [{ workspaceName: 'packages/api' }, { name: 'apps/web' }] },
          constitution: { issues: { blocking: [{ article: 2, file: 'packages/api/src/a.js' }], warning: [{ message: 'see apps/web/src/app.ts' }] } },
        },
      }));
      fs.writeFileSync(path.join(evidenceDir, 'guard-bad.json'), '{bad json');

      const entries = new GraphHistoryCommand(root).scanEvidence();
      expect(entries).toHaveLength(1);
      expect(entries[0].workspaces).toEqual(['apps/web', 'packages/api']);
    });

    it('lists empty history as JSON and replays missing ids without throwing', async () => {
      const root = makeTempDir('stdd-r21-history-empty-');
      tempDirs.push(root);
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      const cmd = new GraphHistoryCommand(root);
      const originalExitCode = process.exitCode;

      const { output } = await captureLog(() => cmd.list({ json: true }));
      expect(JSON.parse(output)).toEqual([]);

      const replay = await captureLog(() => cmd.replay('missing-id'));
      expect(replay.output).toContain('graph history');
      expect(process.exitCode).toBe(1);
      process.exitCode = originalExitCode;
    });

    it('prints result branches for skipped tests, failed tests and lint warnings', () => {
      const cmd = new GraphHistoryCommand('/tmp/nonexistent-stdd-r21');
      const lines = [];
      const spy = jest.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.map(String).join(' ')));
      try {
        cmd._printResults({
          tasks: { allDone: false, done: 1, total: 2 },
          tests: { passed: false, error: 'a\nb\nc\nd' },
          constitution: { status: 'fail', issues: { blocking: [{ article: 7, message: 'bad secret' }] } },
          lint: { passed: false },
        });
      } finally {
        spy.mockRestore();
      }
      const output = lines.join('\n');
      expect(output).toContain('Tasks:');
      expect(output).toContain('bad secret');
      expect(output).toContain('Lint:');
    });
  });

  describe('AuditCommand targeted branches', () => {
    it('aggregates metadata files, lint details and workspace issue counts', async () => {
      const root = makeTempDir('stdd-r21-audit-ws-');
      tempDirs.push(root);
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      fs.mkdirSync(path.join(root, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(path.join(root, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }));
      const evidenceDir = path.join(root, 'stdd', 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, 'verify-1.json'), JSON.stringify({
        status: 'fail',
        metadata: { file: 'packages/api/src/meta.js' },
        results: {
          lint: { details: { output: 'packages/api/src/lint.js:1:1 problem\n' } },
          constitution: { details: { blocking: [{ article: 6, filePath: 'packages/api/src/err.js', message: 'err' }], warning: [] } },
        },
      }));

      const result = await new AuditCommand(root).execute({ json: true });
      expect(result.riskiestFiles.some(f => f.file === 'packages/api/src/meta.js')).toBe(true);
      expect(result.workspaceBreakdown[0].workspaceName).toBe('packages/api');
      expect(result.workspaceBreakdown[0].blockingIssues).toBeGreaterThanOrEqual(1);
    });

    it('filters out malformed evidence while counting valid evidence', async () => {
      const root = makeTempDir('stdd-r21-audit-badjson-');
      tempDirs.push(root);
      const evidenceDir = path.join(root, 'stdd', 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, 'guard-bad.json'), '{bad json');
      fs.writeFileSync(path.join(evidenceDir, 'guard-good.json'), JSON.stringify({ status: 'pass', results: {} }));

      const result = await new AuditCommand(root).execute({ json: true });
      expect(result.totalChecks).toBe(1);
      expect(result.avgCompliance).toBe(100);
    });
  });

  describe('ContractCommand targeted branches', () => {
    function makeContractProject(changeName) {
      const root = makeTempDir('stdd-r21-contract-');
      tempDirs.push(root);
      fs.mkdirSync(path.join(root, 'stdd', 'changes', changeName, 'specs'), { recursive: true });
      return root;
    }

    it('extracts default interactions for operations without responses and nonnumeric status codes', () => {
      const cmd = new ContractCommand('/tmp/nonexistent-stdd-r21');
      const interactions = cmd._extractInteractions({
        paths: {
          '/default': { get: {} },
          '/nonnumeric': { post: { responses: { default: { description: 'Default response', content: { 'application/json': {} } } } } },
          '/ignored': { parameters: [] },
        },
      });

      expect(interactions).toHaveLength(2);
      expect(interactions[0].response.status).toBe(200);
      expect(interactions[1].response.body).toEqual({ _schema: 'defined' });
    });

    it('reports invalid contract format as a violation', () => {
      const cmd = new ContractCommand('/tmp/nonexistent-stdd-r21');
      const results = cmd._verifyContracts([
        { file: '/tmp/contract.json', doc: { consumer: 'x' } },
      ], { paths: { '/ok': { get: {} } } });
      expect(results).toEqual([{ contract: 'contract.json', status: 'violation', message: expect.stringContaining('missing interactions') }]);
    });

    it('throws for an OpenAPI spec with no paths', async () => {
      const root = makeContractProject('empty-api');
      fs.writeFileSync(path.join(root, 'stdd', 'changes', 'empty-api', 'specs', 'api-spec.yaml'), yaml.dump({ openapi: '3.0.0', info: { title: 'Empty', version: '1.0.0' } }));

      const cmd = new ContractCommand(root);
      await expect(cmd.generate('empty-api')).rejects.toThrow('no paths defined');
    });

    it('prints pass status for JSON verify output', async () => {
      const root = makeContractProject('pass-json');
      const specsDir = path.join(root, 'stdd', 'changes', 'pass-json', 'specs');
      fs.writeFileSync(path.join(specsDir, 'api-spec.yaml'), yaml.dump({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: { '/ok': { get: { responses: { '200': { description: 'OK' } } } } },
      }));
      const contractsDir = path.join(specsDir, 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });
      fs.writeFileSync(path.join(contractsDir, 'contract.json'), JSON.stringify({
        consumer: 'web',
        provider: 'api',
        interactions: [{ description: 'GET /ok -> 200', request: { method: 'GET', path: '/ok' }, response: { status: 200, body: {} } }],
      }));

      const { result, output } = await captureLog(() => new ContractCommand(root).verify('pass-json', { json: true }));
      expect(result.hasViolations).toBe(false);
      expect(JSON.parse(output).status).toBe('pass');
    });
  });
});
