class AgentExecutor {
  async run(_request) {
    throw new Error('AgentExecutor.run must be implemented by adapters.');
  }
}

module.exports = { AgentExecutor };
