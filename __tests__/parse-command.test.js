const { parseCommand } = require('../src/utils/parse-command');

describe('parseCommand (shared utility)', () => {
  test('parses simple command', () => {
    const result = parseCommand('node app.js');
    expect(result.bin).toBe('node');
    expect(result.args).toEqual(['app.js']);
  });

  test('parses command with multiple args', () => {
    const result = parseCommand('git commit -m "hello world"');
    expect(result.bin).toBe('git');
    expect(result.args).toEqual(['commit', '-m', 'hello world']);
  });

  test('handles single-quoted strings', () => {
    const result = parseCommand("echo 'hello world'");
    expect(result.bin).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  test('handles double-quoted strings', () => {
    const result = parseCommand('echo "hello world"');
    expect(result.bin).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  test('handles escaped characters', () => {
    const result = parseCommand('echo hello\\ world');
    expect(result.bin).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  test('handles trailing backslash', () => {
    const result = parseCommand('echo test\\');
    expect(result.bin).toBe('echo');
    expect(result.args).toEqual(['test\\']);
  });

  test('throws on empty input', () => {
    expect(() => parseCommand('')).toThrow('Command is required');
    expect(() => parseCommand('', 'Custom prefix')).toThrow('Custom prefix is required');
  });

  test('throws on whitespace-only input', () => {
    expect(() => parseCommand('   ')).toThrow();
  });

  test('throws on unterminated quote', () => {
    expect(() => parseCommand('echo "hello')).toThrow('Unterminated quote');
  });

  test('throws on unterminated single quote', () => {
    expect(() => parseCommand("echo 'hello")).toThrow('Unterminated quote');
  });

  test('uses custom error prefix', () => {
    expect(() => parseCommand('', 'Shell command')).toThrow('Shell command is required');
    expect(() => parseCommand('echo "', 'Shell command')).toThrow('Unterminated quote in shell command');
  });

  test('handles command with no args', () => {
    const result = parseCommand('node');
    expect(result.bin).toBe('node');
    expect(result.args).toEqual([]);
  });

  test('handles complex npm command', () => {
    const result = parseCommand('npm run test -- --coverage --verbose');
    expect(result.bin).toBe('npm');
    expect(result.args).toEqual(['run', 'test', '--', '--coverage', '--verbose']);
  });

  test('handles mixed quotes and spaces', () => {
    const result = parseCommand('git commit -m "fix: resolve \\"issue\\"" --amend');
    expect(result.bin).toBe('git');
    expect(result.args).toContain('--amend');
  });

  test('handles null/undefined input', () => {
    expect(() => parseCommand(null)).toThrow();
    expect(() => parseCommand(undefined)).toThrow();
  });
});
