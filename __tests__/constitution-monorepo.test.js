const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
  spawnSync: jest.requireActual('child_process').spawnSync,
}));

describe('ConstitutionChecker monorepo support', () => {
  let tempDirs = [];

  function createMonorepo(setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-const-monorepo-'));
    tempDirs.push(root);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'root', private: true }));
    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
    if (setupFn) setupFn(root);
    return root;
  }

  beforeEach(() => {
    childProcess.execSync.mockReset();
    childProcess.execSync.mockReturnValue('abc1234 feat: init project');
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects missing tests in workspace source files', () => {
    const root = createMonorepo((project) => {
      const apiRoot = path.join(project, 'packages', 'api');
      fs.mkdirSync(path.join(apiRoot, 'src'), { recursive: true });
      fs.writeFileSync(path.join(apiRoot, 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(apiRoot, 'src', 'index.ts'), 'export const handler = () => 1;\n');
    });

    const issues = new ConstitutionChecker(root).run();
    const tddIssues = issues.blocking.filter(i => i.article === 2);

    expect(tddIssues.length).toBeGreaterThanOrEqual(1);
    expect(tddIssues[0].message).toContain('packages/api/src/index.ts');
  });

  it('does not warn for workspace package.json lockfile when root lockfile exists', () => {
    const root = createMonorepo((project) => {
      fs.writeFileSync(path.join(project, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
      const apiRoot = path.join(project, 'packages', 'api');
      fs.mkdirSync(path.join(apiRoot, 'src', '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(apiRoot, 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(apiRoot, 'src', 'index.ts'), 'export const handler = () => 1;\n');
      fs.writeFileSync(path.join(apiRoot, 'src', '__tests__', 'index.test.ts'), 'test("ok", () => {});\n');
    });

    const issues = new ConstitutionChecker(root).run();
    const lockWarnings = issues.warning.filter(i => i.article === 7 && i.message.includes('Missing dependency lockfile'));

    expect(lockWarnings).toHaveLength(0);
  });

  it('detects hardcoded secrets in workspace files with relative path', () => {
    const root = createMonorepo((project) => {
      const apiRoot = path.join(project, 'packages', 'api');
      fs.mkdirSync(path.join(apiRoot, 'src', '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(apiRoot, 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(apiRoot, 'src', 'index.ts'), 'const secret = "workspace-secret";\nexport const handler = () => secret;\n');
      fs.writeFileSync(path.join(apiRoot, 'src', '__tests__', 'index.test.ts'), 'test("ok", () => {});\n');
    });

    const issues = new ConstitutionChecker(root).run();
    const secretIssues = issues.blocking.filter(i => i.article === 7 && i.message.includes('Hardcoded secret'));

    expect(secretIssues.length).toBeGreaterThanOrEqual(1);
    expect(secretIssues[0].message).toContain('packages/api/src/index.ts');
  });
});
