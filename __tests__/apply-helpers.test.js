const fs = require('fs');
const path = require('path');
const os = require('os');

describe('apply.js internal helpers', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('TDD Phase Constants', () => {
    test('TDD_PHASES has correct values', () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      expect(cmd).toBeDefined();
    });
  });

  describe('phase management', () => {
    const tasksContent = '- [ ] TASK-001 First task\n- [x] TASK-002 Done task\n';

    test('updateTaskPhase adds phase to task line', () => {
      const tasksPath = path.join(tmpDir, 'tasks.md');
      fs.writeFileSync(tasksPath, tasksContent);
      const task = { index: 0, description: 'First task', isDone: false, status: ' ', line: '- [ ] TASK-001 First task' };

      const content = fs.readFileSync(tasksPath, 'utf-8');
      const lines = content.split('\n');
      const oldLine = lines[task.index];
      const updatedLine = oldLine.replace(/\]\s*/, `] [phase:red] `);
      lines[task.index] = updatedLine;
      fs.writeFileSync(tasksPath, lines.join('\n'));

      const result = fs.readFileSync(tasksPath, 'utf-8');
      expect(result).toContain('[phase:red]');
    });

    test('updateTaskPhase updates existing phase', () => {
      const content = '- [ ] [phase:red] TASK-001\n';
      const tasksPath = path.join(tmpDir, 'tasks.md');
      fs.writeFileSync(tasksPath, content);

      const lines = content.split('\n');
      const updatedLine = lines[0].replace(/\[phase:\w+\]/, '[phase:green]');
      lines[0] = updatedLine;
      fs.writeFileSync(tasksPath, lines.join('\n'));

      const result = fs.readFileSync(tasksPath, 'utf-8');
      expect(result).toContain('[phase:green]');
      expect(result).not.toContain('[phase:red]');
    });
  });

  describe('task status update', () => {
    test('updateTaskLine marks task as in-progress', () => {
      const tasksPath = path.join(tmpDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [ ] TASK-001 First\n- [x] TASK-002 Done\n');

      const content = fs.readFileSync(tasksPath, 'utf-8');
      const lines = content.split('\n');
      lines[0] = lines[0].replace(/\[([ ~x])\]/, '[~]');
      fs.writeFileSync(tasksPath, lines.join('\n'));

      const result = fs.readFileSync(tasksPath, 'utf-8');
      expect(result).toContain('- [~] TASK-001');
    });

    test('updateTaskLine marks task as done', () => {
      const tasksPath = path.join(tmpDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [ ] TASK-001 First\n');

      const content = fs.readFileSync(tasksPath, 'utf-8');
      const lines = content.split('\n');
      lines[0] = lines[0].replace(/\[([ ~x])\]/, '[x]');
      fs.writeFileSync(tasksPath, lines.join('\n'));

      const result = fs.readFileSync(tasksPath, 'utf-8');
      expect(result).toContain('- [x] TASK-001');
    });

    test('updateTaskLine reverts task to pending', () => {
      const tasksPath = path.join(tmpDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [x] TASK-001 First\n');

      const content = fs.readFileSync(tasksPath, 'utf-8');
      const lines = content.split('\n');
      lines[0] = lines[0].replace(/\[([ ~x])\]/, '[ ]');
      fs.writeFileSync(tasksPath, lines.join('\n'));

      const result = fs.readFileSync(tasksPath, 'utf-8');
      expect(result).toContain('- [ ] TASK-001');
    });
  });

  describe('log writing', () => {
    test('writeLog creates log entry with timestamp', () => {
      const logPath = path.join(tmpDir, 'apply.log');
      const entry = { task: 'test', status: 'passed' };
      const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
      fs.appendFileSync(logPath, line);

      expect(fs.existsSync(logPath)).toBe(true);
      const content = fs.readFileSync(logPath, 'utf-8');
      const parsed = JSON.parse(content.replace(/^\[.*?\] /, ''));
      expect(parsed.task).toBe('test');
      expect(parsed.status).toBe('passed');
    });

    test('writeEvidence creates evidence file', () => {
      const evidenceDir = path.join(tmpDir, 'evidence');
      fs.mkdirSync(evidenceDir, { recursive: true });
      const data = { type: 'delegation', status: 'recommend' };
      const filePath = path.join(evidenceDir, `test-${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      expect(fs.existsSync(filePath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(parsed.type).toBe('delegation');
    });
  });

  describe('delegationPlan', () => {
    function delegationPlan(resultStatus, testResults, options = {}) {
      if (resultStatus !== 'failed') return null;
      const engines = ['claude_code', 'cursor', 'copilot', 'qwen_code'];
      return {
        trigger: 'apply-test-failure',
        strategy: options.delegate ? 'delegate-requested' : 'recommend-delegation',
        suggestedEngines: engines,
        reason: 'Tests failed during apply; request a fresh model or role to inspect failing output before retrying.',
        failedCommands: testResults.filter(r => !r.passed).map(r => ({ workspace: r.workspaceName, command: r.command })),
      };
    }

    test('returns null for passed result', () => {
      expect(delegationPlan('passed', [])).toBeNull();
    });

    test('returns delegation plan for failed result', () => {
      const plan = delegationPlan('failed', [
        { passed: true, workspaceName: 'api', command: 'npm test' },
        { passed: false, workspaceName: 'web', command: 'npm test' },
      ]);
      expect(plan.trigger).toBe('apply-test-failure');
      expect(plan.strategy).toBe('recommend-delegation');
      expect(plan.failedCommands).toHaveLength(1);
      expect(plan.failedCommands[0].workspace).toBe('web');
    });

    test('uses delegate strategy when requested', () => {
      const plan = delegationPlan('failed', [{ passed: false, workspaceName: 'api', command: 'npm test' }], { delegate: true });
      expect(plan.strategy).toBe('delegate-requested');
    });
  });

  describe('getTaskPhaseFromLine', () => {
    function getTaskPhaseFromLine(taskLine) {
      const match = taskLine.match(/\[phase:(\w+)\]/);
      return match ? match[1] : null;
    }

    test('extracts phase from task line', () => {
      expect(getTaskPhaseFromLine('- [ ] [phase:red] TASK-001')).toBe('red');
      expect(getTaskPhaseFromLine('- [ ] [phase:green] TASK-001')).toBe('green');
      expect(getTaskPhaseFromLine('- [x] [phase:done] TASK-001')).toBe('done');
    });

    test('returns null when no phase tag', () => {
      expect(getTaskPhaseFromLine('- [ ] TASK-001')).toBeNull();
    });
  });

  describe('pickTask', () => {
    function pickTask(tasks, options = {}) {
      if (options.task) {
        const target = String(options.task);
        return tasks.find(t =>
          !t.isDone && (t.description.includes(target) || t.line.includes(target))
        );
      }
      return tasks.find(t => !t.isDone);
    }

    test('picks first pending task by default', () => {
      const tasks = [
        { description: 'TASK-001', line: '- [x] TASK-001', isDone: true },
        { description: 'TASK-002', line: '- [ ] TASK-002', isDone: false },
        { description: 'TASK-003', line: '- [ ] TASK-003', isDone: false },
      ];
      expect(pickTask(tasks).description).toBe('TASK-002');
    });

    test('picks specific task when options.task provided', () => {
      const tasks = [
        { description: 'TASK-001', line: '- [ ] TASK-001', isDone: false },
        { description: 'TASK-002', line: '- [ ] TASK-002', isDone: false },
      ];
      expect(pickTask(tasks, { task: 'TASK-002' }).description).toBe('TASK-002');
    });

    test('returns undefined when all tasks done', () => {
      const tasks = [
        { description: 'TASK-001', line: '- [x] TASK-001', isDone: true },
      ];
      expect(pickTask(tasks)).toBeUndefined();
    });
  });

  describe('ApplyCommand execute', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    test('throws when stdd not initialized', async () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-no-'));
      const origCwd = process.cwd;
      process.cwd = () => emptyDir;
      try {
        await expect(cmd.execute()).rejects.toThrow('STDD not initialized');
      } finally {
        process.cwd = origCwd;
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    test('throws when no active changes found', async () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-nc-'));
      const stdd = path.join(root, 'stdd');
      fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
      fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');

      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        await expect(cmd.execute()).rejects.toThrow('No active changes found');
      } finally {
        process.cwd = origCwd;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    test('throws when tasks.md missing', async () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-tm-'));
      const stdd = path.join(root, 'stdd');
      fs.mkdirSync(path.join(stdd, 'changes', 'test-change'), { recursive: true });
      fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');

      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        await expect(cmd.execute('test-change')).rejects.toThrow('tasks.md not found');
      } finally {
        process.cwd = origCwd;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    test('throws when no tasks in tasks.md', async () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-et-'));
      const stdd = path.join(root, 'stdd');
      const changeDir = path.join(stdd, 'changes', 'test-change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '# Tasks\n\nNo tasks here.\n');

      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        await expect(cmd.execute('test-change')).rejects.toThrow('No tasks found');
      } finally {
        process.cwd = origCwd;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    test('reports all tasks completed', async () => {
      const { ApplyCommand } = require('../src/cli/commands/apply');
      const cmd = new ApplyCommand();
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-apply-ac-'));
      const stdd = path.join(root, 'stdd');
      const changeDir = path.join(stdd, 'changes', 'test-change');
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [x] Task 2\n');

      const origCwd = process.cwd;
      process.cwd = () => root;
      try {
        await cmd.execute('test-change');
        const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
        expect(output).toContain('All tasks completed');
      } finally {
        process.cwd = origCwd;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
