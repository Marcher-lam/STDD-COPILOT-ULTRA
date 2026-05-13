const fs = require('fs');
const path = require('path');

const COVERAGE_FILES = [
  { file: path.join('coverage', 'lcov.info'), type: 'lcov', parser: parseLcov },
  { file: path.join('coverage', 'coverage-summary.json'), type: 'coverage-summary', parser: parseCoverageSummary },
  { file: path.join('coverage', 'coverage-final.json'), type: 'istanbul-json', parser: parseIstanbulJson },
  { file: 'coverage-final.json', type: 'istanbul-json', parser: parseIstanbulJson },
  { file: 'coverage.xml', type: 'coverage-xml', parser: parseCoverageXml },
  { file: path.join('coverage', 'coverage.xml'), type: 'coverage-xml', parser: parseCoverageXml },
];

function pct(covered, total) {
  if (!total) return null;
  return Math.round((covered / total) * 10000) / 100;
}

function round(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 100) / 100;
}

function metric(covered, total) {
  return { covered, total, pct: pct(covered, total) };
}

function buildSummary(result) {
  const parts = [];
  for (const [label, value] of [
    ['lines', result.lines],
    ['branches', result.branches],
    ['functions', result.functions],
    ['statements', result.statements],
  ]) {
    if (value && value.pct !== null) parts.push(`${label}: ${value.pct}%`);
  }
  return parts.join(', ');
}

function normalizeResult(base, metrics) {
  const result = {
    found: true,
    file: base.file,
    type: base.type,
    lines: metrics.lines || null,
    branches: metrics.branches || null,
    functions: metrics.functions || null,
    statements: metrics.statements || null,
    summary: '',
  };
  result.summary = buildSummary(result);
  return result;
}

function parseLcov(filePath, base) {
  const content = fs.readFileSync(filePath, 'utf8');
  const totals = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(LF|LH|BRF|BRH|FNF|FNH):(\d+)/);
    if (match) totals[match[1]] += Number(match[2]);
  }

  return normalizeResult(base, {
    lines: metric(totals.LH, totals.LF),
    branches: metric(totals.BRH, totals.BRF),
    functions: metric(totals.FNH, totals.FNF),
  });
}

function parseCoverageSummary(filePath, base) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const total = data.total || {};

  const fromSummary = (name) => {
    const value = total[name];
    if (!value) return null;
    return {
      covered: Number.isFinite(value.covered) ? value.covered : null,
      total: Number.isFinite(value.total) ? value.total : null,
      pct: round(value.pct),
    };
  };

  return normalizeResult(base, {
    lines: fromSummary('lines'),
    branches: fromSummary('branches'),
    functions: fromSummary('functions'),
    statements: fromSummary('statements'),
  });
}

function countCovered(values) {
  let total = 0;
  let covered = 0;
  for (const value of values) {
    total++;
    if (Number(value) > 0) covered++;
  }
  return { covered, total };
}

function parseIstanbulJson(filePath, base) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const totals = {
    statements: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  };

  for (const fileCoverage of Object.values(data || {})) {
    if (!fileCoverage || typeof fileCoverage !== 'object') continue;

    const statements = countCovered(Object.values(fileCoverage.s || {}));
    totals.statements.covered += statements.covered;
    totals.statements.total += statements.total;

    const functions = countCovered(Object.values(fileCoverage.f || {}));
    totals.functions.covered += functions.covered;
    totals.functions.total += functions.total;

    for (const branchHits of Object.values(fileCoverage.b || {})) {
      if (!Array.isArray(branchHits)) continue;
      const branches = countCovered(branchHits);
      totals.branches.covered += branches.covered;
      totals.branches.total += branches.total;
    }

    const lineHits = new Map();
    const statementMap = fileCoverage.statementMap || {};
    for (const [id, hit] of Object.entries(fileCoverage.s || {})) {
      const start = statementMap[id] && statementMap[id].start;
      const line = start && start.line;
      if (!line) continue;
      lineHits.set(line, Math.max(lineHits.get(line) || 0, Number(hit) || 0));
    }

    if (lineHits.size > 0) {
      totals.lines.total += lineHits.size;
      totals.lines.covered += Array.from(lineHits.values()).filter(hit => hit > 0).length;
    } else {
      totals.lines.covered += statements.covered;
      totals.lines.total += statements.total;
    }
  }

  return normalizeResult(base, {
    lines: metric(totals.lines.covered, totals.lines.total),
    branches: metric(totals.branches.covered, totals.branches.total),
    functions: metric(totals.functions.covered, totals.functions.total),
    statements: metric(totals.statements.covered, totals.statements.total),
  });
}

function parseCoverageXml(filePath, base) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rootMatch = content.match(/<coverage\b[^>]*>/i);
  const root = rootMatch ? rootMatch[0] : '';
  const lineRate = root.match(/line-rate=["']([^"']+)["']/i);
  const branchRate = root.match(/branch-rate=["']([^"']+)["']/i);

  return normalizeResult(base, {
    lines: lineRate ? { covered: null, total: null, pct: round(Number(lineRate[1]) * 100) } : null,
    branches: branchRate ? { covered: null, total: null, pct: round(Number(branchRate[1]) * 100) } : null,
  });
}

function parseCoverage(root) {
  const workspaceRoot = root || process.cwd();
  for (const candidate of COVERAGE_FILES) {
    const fullPath = path.join(workspaceRoot, candidate.file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      return candidate.parser(fullPath, { file: fullPath, type: candidate.type });
    } catch (error) {
      return {
        found: true,
        file: fullPath,
        type: candidate.type,
        lines: null,
        branches: null,
        functions: null,
        statements: null,
        summary: `Failed to parse coverage report: ${error.message}`,
        error: error.message,
      };
    }
  }

  return { found: false };
}

module.exports = { parseCoverage };
