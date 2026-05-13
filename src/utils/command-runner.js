const { spawnSync } = require('child_process');

function parseCommand(command) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command is required.');

  const args = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error('Unterminated quote in command.');
  if (current) args.push(current);
  if (args.length === 0) throw new Error('Command is required.');
  return { bin: args[0], args: args.slice(1) };
}

function runCommand(command, options = {}) {
  const { bin, args } = parseCommand(command);
  return spawnSync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'pipe',
    encoding: 'utf-8',
    env: options.env,
    timeout: options.timeout,
  });
}

module.exports = { parseCommand, runCommand };
