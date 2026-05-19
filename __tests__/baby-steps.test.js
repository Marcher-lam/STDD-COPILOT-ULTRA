const { BabyStepsCommand } = require('../src/cli/commands/baby-steps');

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

describe('BabyStepsCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('extractKeyEntity', () => {
    it('returns second-to-last word for long input', () => {
      const cmd = new BabyStepsCommand('/tmp');
      // 8 words, index 6 = 'is'
      expect(cmd.extractKeyEntity('should return true when user is admin')).toBe('is');
    });

    it('returns correct word for moderate input', () => {
      const cmd = new BabyStepsCommand('/tmp');
      // 6 words, index 4 = 'the'
      expect(cmd.extractKeyEntity('should validate the user email address')).toBe('email');
    });

    it('returns happy path for short input', () => {
      const cmd = new BabyStepsCommand('/tmp');
      expect(cmd.extractKeyEntity('hello world')).toBe('happy path');
    });

    it('handles single word', () => {
      const cmd = new BabyStepsCommand('/tmp');
      expect(cmd.extractKeyEntity('test')).toBe('happy path');
    });

    it('handles empty string', () => {
      const cmd = new BabyStepsCommand('/tmp');
      expect(cmd.extractKeyEntity('')).toBe('happy path');
    });
  });

  describe('execute', () => {
    it('runs full interactive flow', async () => {
      const inquirer = require('inquirer');
      inquirer.prompt
        .mockResolvedValueOnce({ userGuess: 'should validate email format' })
        .mockResolvedValueOnce({ implGuess: 'Add regex validation' });

      const cmd = new BabyStepsCommand('/tmp');
      const result = await cmd.execute('email validation');

      expect(result.testGuess).toBe('should validate email format');
      expect(result.implGuess).toBe('Add regex validation');
      expect(logSpy).toHaveBeenCalled();
    });

    it('uses default implementation suggestion', async () => {
      const inquirer = require('inquirer');
      inquirer.prompt
        .mockResolvedValueOnce({ userGuess: 'should work' })
        .mockResolvedValueOnce({ implGuess: 'Return a hardcoded value or constant.' });

      const cmd = new BabyStepsCommand('/tmp');
      const result = await cmd.execute('basic');

      expect(result.implGuess).toBe('Return a hardcoded value or constant.');
    });
  });
});
