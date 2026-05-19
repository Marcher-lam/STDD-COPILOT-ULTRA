const { AgentExecutor } = require('../src/runtime/agents/executor-interface');
const { NoopAgentExecutor } = require('../src/runtime/agents/noop-executor');
const { ShellAgentExecutor } = require('../src/runtime/agents/shell-executor');
const { createAgentExecutor } = require('../src/runtime/agents/index');

describe('agents/index.js', () => {
  describe('createAgentExecutor', () => {
    it('creates NoopAgentExecutor for noop', () => {
      const executor = createAgentExecutor('noop');
      expect(executor).toBeInstanceOf(NoopAgentExecutor);
    });

    it('creates ShellAgentExecutor for shell', () => {
      const executor = createAgentExecutor('shell');
      expect(executor).toBeInstanceOf(ShellAgentExecutor);
    });

    it('creates NoopAgentExecutor by default', () => {
      const executor = createAgentExecutor();
      expect(executor).toBeInstanceOf(NoopAgentExecutor);
    });

    it('throws for unsupported executor name', () => {
      expect(() => createAgentExecutor('invalid')).toThrow("Unsupported agent executor 'invalid'");
    });
  });

  describe('AgentExecutor base class', () => {
    it('throws on run when not implemented', async () => {
      const executor = new AgentExecutor();
      await expect(executor.run({})).rejects.toThrow('must be implemented');
    });
  });
});
