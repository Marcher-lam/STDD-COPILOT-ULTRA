const { spawnSync } = require('child_process');
const { AgentExecutor } = require('./executor-interface');

class ShellAgentExecutor extends AgentExecutor {
  constructor(options = {}) {
    super();
    this.command = options.command || process.env.STDD_AGENT_COMMAND;
    this.cwd = options.cwd || process.cwd();
  }

  async run(request = {}) {
    if (!this.command) {
      throw new Error('Shell agent executor requires --command or STDD_AGENT_COMMAND.');
    }

    const payload = JSON.stringify(request);
    const result = spawnSync(this.command, {
      cwd: this.cwd,
      input: payload,
      encoding: 'utf8',
      shell: true,
      timeout: Number(request.timeout || 120000),
    });

    return {
      status: result.status === 0 ? 'success' : 'fail',
      adapter: 'shell',
      command: this.command,
      exitCode: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      output: (result.stdout || result.stderr || '').trim(),
    };
  }
}

module.exports = { ShellAgentExecutor };
