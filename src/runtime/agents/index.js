const { AgentExecutor } = require('./executor-interface');
const { NoopAgentExecutor } = require('./noop-executor');
const { ShellAgentExecutor } = require('./shell-executor');

function createAgentExecutor(name = 'noop', options = {}) {
  if (name === 'noop') return new NoopAgentExecutor(options);
  if (name === 'shell') return new ShellAgentExecutor(options);
  throw new Error(`Unsupported agent executor '${name}'. Use noop or shell.`);
}

module.exports = {
  AgentExecutor,
  NoopAgentExecutor,
  ShellAgentExecutor,
  createAgentExecutor,
};
