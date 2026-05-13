const { AgentExecutor } = require('./executor-interface');

class NoopAgentExecutor extends AgentExecutor {
  async run(request = {}) {
    return {
      status: 'success',
      adapter: 'noop',
      role: request.role || null,
      goal: request.goal || '',
      output: `Noop executor accepted goal: ${request.goal || ''}`,
      artifacts: request.artifacts || [],
    };
  }
}

module.exports = { NoopAgentExecutor };
