const { spawnSync } = require('child_process');
const { parseCommand } = require('./parse-command');

// P0-3 Fix: Dangerous commands that should never be allowed
const DANGEROUS_COMMANDS = [
  /\brm\s+(-rf?|--recursive)\b/i,
  /\bdel\s+\/[fqs]\b/i,
  /\bformat\s+[a-z]:\b/i,
  /\bshred\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bsudo\b.*\b(rm|del|format|mkfs)\b/i,
  /\bbash\s+-c\b.*(\||&&|;)/i,
  /\beval\b/i,
  /\bexec\b.*\$\(/i,
  /\$\(/,
  /\bpowershell\b.*-Command\b/i,
];

// Sandbox: blocked binaries that should never run in sandbox mode
const SANDBOX_BLOCKED_BINS = [
  'rm', 'del', 'format', 'shred', 'mkfs', 'dd', 'sudo',
  'curl', 'wget', 'nc', 'netcat', 'ssh', 'scp', 'rsync',
  'docker', 'kubectl', 'helm',
  'npm', 'yarn', 'pnpm', 'pip', 'pip3', 'gem', 'cargo',
];

// Sandbox: write path patterns that are blocked outside cwd
const SANDBOX_BLOCKED_WRITE_PATHS = [
  /^\/etc\//,
  /^\/usr\//,
  /^\/var\//,
  /^\/tmp\/(?!stdd)/,
  /^\/System\//,
  /^~\//,
  /^C:\\Windows\\/i,
];

function isDangerous(command) {
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return true;
    }
  }
  return false;
}

function isSandboxBlocked(bin) {
  const baseBin = bin.split('/').pop().split('\\').pop();
  return SANDBOX_BLOCKED_BINS.includes(baseBin);
}

function parseCommandLocal(command) {
  return parseCommand(command, 'Command');
}

function validateCommand(command, _options = {}) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command is required.');

  // P0-3 Fix: Block dangerous commands
  if (isDangerous(input)) {
    throw new Error(`Command rejected: Dangerous command detected. For security reasons, commands containing destructive operations (rm -rf, eval, exec$(), etc.) are not allowed.`);
  }

  // P0-3 Fix: Shell injection detection
  const injectionPatterns = [/\|/, /&&/, /;/, /\$\(/, /`/, />>\s*/, />\s*[^&]/];
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      throw new Error('Command rejected: Potential shell injection detected. Characters like pipe, &&, semicolon, dollar, backtick, or redirect are not allowed in test commands.');
    }
  }

  return true;
}

function validateSandbox(bin, options = {}) {
  if (!options.sandbox) return;

  if (isSandboxBlocked(bin)) {
    throw new Error(`Sandbox: Binary "${bin}" is blocked in sandbox mode. Restricted binaries: ${SANDBOX_BLOCKED_BINS.join(', ')}`);
  }

  // Check for write path violations in args
  const cwd = options.cwd || process.cwd();
  const args = Array.isArray(options._args) ? options._args : [];
  for (const arg of args) {
    for (const pattern of SANDBOX_BLOCKED_WRITE_PATHS) {
      if (pattern.test(arg)) {
        throw new Error(`Sandbox: Path "${arg}" is outside the allowed workspace. Sandbox restricts writes to ${cwd}`);
      }
    }
  }
}

function runCommand(command, options = {}) {
  const input = String(command || '').trim();

  // P0-3 Fix: Validate command before execution
  validateCommand(input, options);

  const { bin, args } = parseCommandLocal(command);

  // Sandbox validation
  if (options.sandbox) {
    validateSandbox(bin, { ...options, _args: args });
  }

  const env = { ...options.env };
  if (options.sandbox) {
    env.STDD_SANDBOX = '1';
  }

  return spawnSync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'pipe',
    encoding: 'utf-8',
    env: Object.keys(env).length > 0 ? env : undefined,
    timeout: options.timeout,
  });
}

module.exports = {
  parseCommand, runCommand, validateCommand, isDangerous,
  validateSandbox, isSandboxBlocked, SANDBOX_BLOCKED_BINS, SANDBOX_BLOCKED_WRITE_PATHS,
};
