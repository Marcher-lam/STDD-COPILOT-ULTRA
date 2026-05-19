const { StartCommand, HELP_TEXT } = require('../src/cli/commands/start');

describe('StartCommand', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  async function executeWithAction(action, extraAnswers = {}) {
    jest.doMock('inquirer', () => ({
      prompt: jest.fn().mockResolvedValue({ action, ...extraAnswers }),
    }));
    const { StartCommand: SC } = require('../src/cli/commands/start');
    const cmd = new SC();
    await cmd.execute({});
  }

  test('shows help text when help option is true', async () => {
    const cmd = new StartCommand();
    await cmd.execute({ help: true });
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('STDD');
  });

  test('init action shows initialization instructions', async () => {
    await executeWithAction('init');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('init');
  });

  test('apply action shows TDD phase information', async () => {
    await executeWithAction('apply');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('red');
    expect(output).toContain('green');
    expect(output).toContain('refactor');
  });

  test('help action shows full help text', async () => {
    await executeWithAction('help');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('STDD');
  });

  test('guard action shows health check info', async () => {
    await executeWithAction('guard');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('guard');
  });

  test('new action prompts for change name', async () => {
    jest.doMock('inquirer', () => ({
      prompt: jest.fn()
        .mockResolvedValueOnce({ action: 'new' })
        .mockResolvedValueOnce({ name: 'add-dark-mode' }),
    }));
    const { StartCommand: SC } = require('../src/cli/commands/start');
    const cmd = new SC();
    await cmd.execute({});
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('add-dark-mode');
  });

  test('prints tip at end of interaction', async () => {
    await executeWithAction('init');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Tip');
  });

  test('new action validate accepts non-empty name', async () => {
    let allQuestions = [];
    jest.doMock('inquirer', () => ({
      prompt: jest.fn((questions) => {
        const flat = Array.isArray(questions) ? questions : [questions];
        allQuestions = allQuestions.concat(flat);
        // First call: action selector, second call: name prompt
        if (allQuestions.length === 1) return Promise.resolve({ action: 'new' });
        return Promise.resolve({ name: 'my-feature' });
      }),
    }));
    const { StartCommand: SC } = require('../src/cli/commands/start');
    const cmd = new SC();
    await cmd.execute({});

    const nameQuestion = allQuestions.find(q => q.name === 'name');
    expect(nameQuestion).toBeDefined();
    expect(nameQuestion.validate('valid-name')).toBe(true);
  });

  test('new action validate rejects empty name', async () => {
    let allQuestions = [];
    jest.doMock('inquirer', () => ({
      prompt: jest.fn((questions) => {
        const flat = Array.isArray(questions) ? questions : [questions];
        allQuestions = allQuestions.concat(flat);
        if (allQuestions.length === 1) return Promise.resolve({ action: 'new' });
        return Promise.resolve({ name: 'fallback-name' });
      }),
    }));
    const { StartCommand: SC } = require('../src/cli/commands/start');
    const cmd = new SC();
    await cmd.execute({});

    const nameQuestion = allQuestions.find(q => q.name === 'name');
    expect(nameQuestion).toBeDefined();
    expect(nameQuestion.validate('')).toBe('Name is required');
  });
});

describe('HELP_TEXT', () => {
  test('contains core workflow steps', () => {
    expect(HELP_TEXT).toContain('init');
    expect(HELP_TEXT).toContain('apply');
    expect(HELP_TEXT).toContain('verify');
    expect(HELP_TEXT).toContain('archive');
  });

  test('contains TDD phase information', () => {
    expect(HELP_TEXT).toContain('red');
    expect(HELP_TEXT).toContain('green');
    expect(HELP_TEXT).toContain('refactor');
  });

  test('contains quality check commands', () => {
    expect(HELP_TEXT).toContain('guard');
    expect(HELP_TEXT).toContain('constitution');
  });
});
