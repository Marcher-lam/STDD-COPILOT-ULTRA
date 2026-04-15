const fs = require('fs');
const path = require('path');
const os = require('os');
const { UpdateCommand } = require('../src/cli/commands/update');

describe('UpdateCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-update-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.claude'), { recursive: true });
    return projectPath;
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should update schemas recursively including constitution articles', async () => {
    const projectPath = createTempProject('recursive-schema-project');
    const updateCommand = new UpdateCommand(silentSpinner);

    await updateCommand.execute(projectPath, { force: false });

    const articlePath = path.join(
      projectPath,
      'schemas',
      'constitution',
      'articles',
      '01-library-first.md'
    );
    expect(fs.existsSync(articlePath)).toBe(true);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('Update summary'))).toBe(true);
  });

  it('should report errors and fail when file sync encounters write errors', async () => {
    const projectPath = createTempProject('error-report-project');
    const originalWriteFile = fs.promises.writeFile.bind(fs.promises);
    const writeSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
      const filePath = String(args[0]);
      if (filePath.endsWith(path.join('schemas', 'spec-driven', 'schema.yaml'))) {
        throw new Error('simulated write failure');
      }
      return originalWriteFile(...args);
    });

    const updateCommand = new UpdateCommand(silentSpinner);
    try {
      await expect(updateCommand.execute(projectPath, { force: true }))
        .rejects
        .toThrow(/Update completed with \d+ error\(s\)/);
    } finally {
      writeSpy.mockRestore();
    }
  });
});
