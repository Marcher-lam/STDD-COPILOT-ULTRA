const { ElicitationCommand } = require('../src/cli/commands/elicitation');

describe('ElicitationCommand', () => {
  it('execute with --list prints available methods', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute([], { list: true });
    expect(result).toBeUndefined();
  });

  it('execute with --method runs specific method', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['test topic'], { method: 'inversion' });
    expect(result.method).toContain('Inversion');
    expect(result.topic).toBe('test topic');
    expect(result.prompt).not.toContain('${topic}');
  });

  it('execute without method picks random', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['my topic']);
    expect(result.method).toBeTruthy();
    expect(result.prompt).toBeTruthy();
  });

  it('replaces topic placeholder in prompt', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['authentication'], { method: 'five-whys' });
    expect(result.prompt).toContain('authentication');
  });

  it('execute with no topic returns undefined', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute([], {});
    expect(result).toBeUndefined();
  });

  it('execute with unknown method ID logs error and returns undefined', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['some topic'], { method: 'nonexistent-method-xyz' });
    expect(result).toBeUndefined();
  });

  it('listMethods prints all methods to console', () => {
    const cmd = new ElicitationCommand();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    cmd.listMethods();
    // Should print header, each method, and usage line
    const calls = logSpy.mock.calls.map(c => c[0]);
    expect(calls.some(c => typeof c === 'string' && c.includes('Elicitation Methods'))).toBe(true);
    expect(calls.some(c => typeof c === 'string' && c.includes('Usage:'))).toBe(true);
    logSpy.mockRestore();
  });

  it('runMethod with valid method returns result', () => {
    const cmd = new ElicitationCommand();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = cmd.runMethod('first-principles', 'my topic');
    expect(result).toBeTruthy();
    expect(result.method).toContain('First Principles');
    expect(result.topic).toBe('my topic');
    logSpy.mockRestore();
  });

  it('runMethod with invalid method returns undefined', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.runMethod('does-not-exist', 'topic');
    expect(result).toBeUndefined();
  });

  it('applyMethod returns object with method name, prompt, and topic', () => {
    const cmd = new ElicitationCommand();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const method = cmd.engine.getMethod('scamper');
    const result = cmd.applyMethod(method, 'test topic');
    expect(result).toEqual({
      method: method.name,
      prompt: expect.any(String),
      topic: 'test topic',
    });
    expect(result.prompt).toContain('test topic');
    logSpy.mockRestore();
  });
});
