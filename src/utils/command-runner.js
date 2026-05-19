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

function isDangerous(command) {
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return true;
    }
  }
  return false;
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

function runCommand(command, options = {}) {
  const input = String(command || '').trim();

  // P0-3 Fix: Validate command before execution
  validateCommand(input, options);

  const { bin, args } = parseCommandLocal(command);
  return spawnSync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'pipe',
    encoding: 'utf-8',
    env: options.env,
    timeout: options.timeout,
  });
}

module.exports = { parseCommand, runCommand, validateCommand, isDangerous };
