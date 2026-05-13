const { parseCommand } = require('../src/utils/command-runner');

describe('command-runner', () => {
  test('preserves quoted arguments with spaces', () => {
    expect(parseCommand('npm test -- --testNamePattern "login flow"')).toEqual({
      bin: 'npm',
      args: ['test', '--', '--testNamePattern', 'login flow'],
    });
  });

  test('supports single quoted arguments', () => {
    expect(parseCommand("node script.js 'hello world'")).toEqual({
      bin: 'node',
      args: ['script.js', 'hello world'],
    });
  });

  test('rejects unterminated quotes', () => {
    expect(() => parseCommand('npm test "broken')).toThrow('Unterminated quote');
  });
});
