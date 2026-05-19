const fs = require('fs');
const path = require('path');

const SCENARIO_RE = /^\s*(?:#{2,5}\s*)?Scenario:\s*(.+)$/i;
const STEP_RE = /^\s*(?:[-*]\s*)?(Given|When|Then|And|But)\b/i;

function parseBddScenarios(files, cwd) {
  const scenarios = [];
  for (const file of files) {
    let current = null;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(SCENARIO_RE);
      if (match) {
        current = { name: match[1].trim(), steps: [], source: cwd ? path.relative(cwd, file) : file };
        scenarios.push(current);
      } else if (current && STEP_RE.test(line)) {
        current.steps.push(line.trim().replace(/^[-*]\s*/, ''));
      }
    }
  }
  return scenarios;
}

module.exports = { parseBddScenarios };
