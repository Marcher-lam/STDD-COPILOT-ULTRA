function parseCommand(command, errorPrefix = 'Command') {
  const input = String(command || '').trim();
  if (!input) throw new Error(`${errorPrefix} is required.`);

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
  if (quote) throw new Error(`Unterminated quote in ${errorPrefix.toLowerCase()}.`);
  if (current) args.push(current);
  if (args.length === 0) throw new Error(`${errorPrefix} is required.`);
  return { bin: args[0], args: args.slice(1) };
}

module.exports = { parseCommand };
