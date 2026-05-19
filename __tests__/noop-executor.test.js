const { NoopAgentExecutor } = require('../src/runtime/agents/noop-executor');
const { AgentExecutor } = require('../src/runtime/agents/executor-interface');

describe('NoopAgentExecutor', () => {
  it('extends AgentExecutor', () => {
    const noop = new NoopAgentExecutor();
    expect(noop).toBeInstanceOf(AgentExecutor);
  });

  it('returns success status', async () => {
    const noop = new NoopAgentExecutor();
    const result = await noop.run();
    expect(result.status).toBe('success');
    expect(result.adapter).toBe('noop');
  });

  it('uses default values for empty request', async () => {
    const noop = new NoopAgentExecutor();
    const result = await noop.run();
    expect(result.role).toBeNull();
    expect(result.goal).toBe('');
    expect(result.artifacts).toEqual([]);
    expect(result.output).toBe('Noop executor accepted goal: ');
  });

  it('passes through request properties', async () => {
    const noop = new NoopAgentExecutor();
    const result = await noop.run({
      role: 'coder',
      goal: 'implement auth',
      artifacts: ['spec.md'],
    });
    expect(result.role).toBe('coder');
    expect(result.goal).toBe('implement auth');
    expect(result.artifacts).toEqual(['spec.md']);
    expect(result.output).toBe('Noop executor accepted goal: implement auth');
  });

  it('handles partial request with only role', async () => {
    const noop = new NoopAgentExecutor();
    const result = await noop.run({ role: 'reviewer' });
    expect(result.role).toBe('reviewer');
    expect(result.goal).toBe('');
    expect(result.artifacts).toEqual([]);
  });

  it('handles partial request with only goal', async () => {
    const noop = new NoopAgentExecutor();
    const result = await noop.run({ goal: 'fix bug' });
    expect(result.role).toBeNull();
    expect(result.goal).toBe('fix bug');
  });
});
