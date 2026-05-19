#!/usr/bin/env node

/**
 * PreToolUse Hook - Pre-file write check
 *
 * Enforced Constitution Articles:
 * - Article 2: TDD (Test-First)
 * - Article 4: Code Style
 * - Article 7: Security
 */

const fs = require('fs');
const path = require('path');

async function runChecks(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return { block: false };
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const violations = [];

  // Article 2: TDD Check
  if (isImplementationFile(filePath)) {
    const testFile = getCorrespondingTestFile(filePath);
    if (!fs.existsSync(testFile)) {
      violations.push({
        article: 2,
        level: 'error',
        message: `Test file not found: ${testFile}`,
        suggestion: 'Create a failing test first: /stdd:apply'
      });
    }
  }

  // Article 4: Code Style Check
  violations.push(...checkCodeStyle(content, filePath));

  // Article 7: Security Check
  violations.push(...checkSecurity(content, filePath));

  const hasErrors = violations.some(v => v.level === 'error');

  return {
    block: hasErrors,
    violations,
    message: hasErrors ? formatViolationMessage(violations) : null
  };
}

function isImplementationFile(filePath) {
  const implPattern = /\/(src|lib|app|server|modules|services|components|pages)\//;
  const testPattern = /\.(test|spec)\./;
  const declPattern = /\.d\.ts$/;
  return implPattern.test(filePath) && !testPattern.test(filePath) && !declPattern.test(filePath);
}

function getCorrespondingTestFile(filePath) {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);

  // Derive test file name for the extension
  function testFileName(name, extension) {
    switch (extension) {
      case '.ts':
      case '.js':
        return `${name}.test${extension}`;
      case '.py':
        return `${name}_test.py`;
      case '.go':
        return `${name}_test.go`;
      default:
        return `${name}.test${extension}`;
    }
  }

  // Find project root by looking up for package.json or using cwd
  const cwd = process.cwd();
  const candidates = [];

  // 1. Co-located test (same directory, .test./.spec. pattern)
  candidates.push(path.join(dir, testFileName(base, ext)));
  candidates.push(path.join(dir, base + '.spec' + ext));

  // 2. __tests__/ in the same parent directory
  candidates.push(path.join(dir, '__tests__', testFileName(base, ext)));

  // 3. test/ directory at project root
  candidates.push(path.join(cwd, 'test', testFileName(base, ext)));

  // 4. tests/ directory at project root
  candidates.push(path.join(cwd, 'tests', testFileName(base, ext)));

  // 5. __tests__/ at project root
  candidates.push(path.join(cwd, '__tests__', testFileName(base, ext)));

  // 6. Original convention: replace impl dir segment with __tests__
  const implDirPattern = /\/(src|lib|app|server|modules|services|components|pages)\//;
  if (implDirPattern.test(filePath)) {
    candidates.push(
      filePath
        .replace(implDirPattern, '/$1/__tests__/')
        .replace(/\.ts$/, '.test.ts')
        .replace(/\.js$/, '.test.js')
        .replace(/\.py$/, '_test.py')
        .replace(/\.go$/, '_test.go')
    );
  }

  // Return the first candidate that exists, or the first candidate as default
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function checkCodeStyle(content) {
  const violations = [];

  const lines = content.split('\n');
  if (lines.length > 500) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `File too long: ${lines.length} lines (recommended < 500)`,
      suggestion: 'Consider splitting into smaller modules'
    });
  }

  return violations;
}

function checkSecurity(content) {
  const violations = [];

  const sensitivePatterns = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, name: 'password' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, name: 'API key' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/i, name: 'secret' },
    { pattern: /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'token' }
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(content)) {
      violations.push({
        article: 7,
        level: 'error',
        message: `Hardcoded sensitive data detected: ${name}`,
        suggestion: 'Use environment variables instead'
      });
    }
  }

  return violations;
}

function formatViolationMessage(violations) {
  const errors = violations.filter(v => v.level === 'error');
  const warnings = violations.filter(v => v.level === 'warning');

  let message = 'STDD Guard - Constitution Violation\n\n';

  if (errors.length > 0) {
    message += 'Blocking Issues:\n';
    errors.forEach(e => {
      message += `  - Article ${e.article}: ${e.message}\n`;
      message += `    Suggestion: ${e.suggestion}\n`;
    });
  }

  if (warnings.length > 0) {
    message += '\nWarnings:\n';
    warnings.forEach(w => {
      message += `  - Article ${w.article}: ${w.message}\n`;
    });
  }

  return message;
}

module.exports = {
  runChecks,
  isImplementationFile,
  getCorrespondingTestFile,
  checkCodeStyle,
  checkSecurity,
  formatViolationMessage,
};

// ─── stdin entry point (only runs when executed directly) ───
if (require.main === module) {
  let inputData = '';
  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      if (process.env.STDD_HOOKS_DISABLED) {
        console.log(JSON.stringify({ block: false }));
        process.exit(0);
        return;
      }

      const data = JSON.parse(inputData);
      const result = await runChecks(data);

      console.log(JSON.stringify(result));
      process.exit(result.block ? 1 : 0);
    } catch (error) {
      console.error('STDD Hook error:', error.message);
      process.exit(0);
    }
  });
}
