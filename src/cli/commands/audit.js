/**
 * Audit Command
 * Analyzes historical compliance evidence to surface trends and hotspots.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { detectWorkspaces } = require('../../utils/workspace-detector');
const { evidenceMatchesWorkspace, extractEvidenceWorkspaceRefs } = require('../../utils/workspace-scope');

const ARTICLE_NAMES = {
  1: 'Library-First',
  2: 'TDD',
  3: 'Small Commits',
  4: 'Code Style',
  5: 'Documentation',
  6: 'Error Handling',
  7: 'Security',
  8: 'Performance',
  9: 'CI/CD',
};

class AuditCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  async execute(options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      return this._handleEmpty(options, 'Not initialized');
    }

    const evidenceFiles = this._collectEvidence(stddDir, options);

    if (evidenceFiles.length === 0) {
      return this._handleEmpty(options);
    }

    const aggregation = this._aggregate(evidenceFiles);

    if (options.json) {
      console.log(JSON.stringify(aggregation, null, 2));
      return aggregation;
    }

    this._printReport(aggregation);
    return aggregation;
  }

  _handleEmpty(options, reason) {
    if (options.json) {
      const empty = {
        totalChecks: 0,
        avgCompliance: 0,
        topViolations: [],
        riskiestFiles: [],
        workspaceBreakdown: [],
      };
      console.log(JSON.stringify(empty, null, 2));
      return empty;
    }
    console.log(chalk.yellow('No history found.') + (reason ? ` (${reason})` : '') );
    return { totalChecks: 0, avgCompliance: 0, topViolations: [], riskiestFiles: [], workspaceBreakdown: [] };
  }

  _collectEvidence(stddDir, options = {}) {
    const files = [];
    const dirs = [path.join(stddDir, 'evidence')];

    const changesDir = path.join(stddDir, 'changes');
    if (fs.existsSync(changesDir)) {
      const changes = fs.readdirSync(changesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'archive')
        .map(d => path.join(changesDir, d.name, 'evidence'));
      dirs.push(...changes);
    }

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /^verify-.*\.json$|^guard-.*\.json$/.test(entry.name)) {
          const filePath = path.join(dir, entry.name);
          if (options.workspace && !this._evidenceFileMatchesWorkspace(filePath, options.workspace)) {
            continue;
          }
          files.push(filePath);
        }
      }
    }

    return files;
  }

  _evidenceFileMatchesWorkspace(filePath, workspace) {
    try {
      return evidenceMatchesWorkspace(JSON.parse(fs.readFileSync(filePath, 'utf-8')), workspace);
    } catch {
      return false;
    }
  }

  _aggregate(evidenceFiles) {
    const violationCount = {};
    const fileFailCount = {};
    const workspaceStats = {};
    const workspaces = this._workspaceIndex();
    let totalRuns = 0;
    let passCount = 0;

    for (const filePath of evidenceFiles) {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        continue;
      }

      totalRuns++;

      if (data.status === 'pass') {
        passCount++;
      }

      const results = data.results || {};
      const explicitWorkspaces = extractEvidenceWorkspaceRefs(data);
      if (explicitWorkspaces.length > 0) {
        for (const workspaceName of explicitWorkspaces) {
          if (!workspaceStats[workspaceName]) {
            workspaceStats[workspaceName] = { totalIssues: 0, blockingIssues: 0, warningIssues: 0, articles: {} };
          }
        }
      }

      // Extract constitution violations
      const constitutionResults = results.constitution;
      if (constitutionResults) {
        const details = constitutionResults.details || constitutionResults.issues || null;
        if (details) {
          const blocking = details.blocking || [];
          const warnings = details.warning || [];
          const allIssues = [
            ...blocking.map(issue => ({ issue, severity: 'blocking' })),
            ...warnings.map(issue => ({ issue, severity: 'warning' })),
          ];

          for (const item of allIssues) {
            const issue = item.issue;
            if (issue.article !== undefined) {
              const articleNum = Number(issue.article);
              if (!Number.isNaN(articleNum)) {
                violationCount[articleNum] = (violationCount[articleNum] || 0) + 1;
              }
            }

            const issueFiles = this._extractIssueFiles(issue);
            for (const issueFile of issueFiles) {
              fileFailCount[issueFile] = (fileFailCount[issueFile] || 0) + 1;
              this._recordWorkspaceIssue(workspaceStats, workspaces, issueFile, item.severity, issue.article);
            }
          }
        }
      }

      // Extract file info from lint issues
      const lintResults = results.lint;
      if (lintResults && lintResults.details) {
        const output = lintResults.details.output || '';
        const lines = output.split('\n');
        for (const line of lines) {
          const pathMatch = line.match(/^(\S+\.js(?:on)?|\.ts|\.py)/);
          if (pathMatch) {
            fileFailCount[pathMatch[1]] = (fileFailCount[pathMatch[1]] || 0) + 1;
            this._recordWorkspaceIssue(workspaceStats, workspaces, pathMatch[1], 'warning', null);
          }
        }
      }

      // Direct metadata file references
      if (data.metadata && data.metadata.file) {
        fileFailCount[data.metadata.file] = (fileFailCount[data.metadata.file] || 0) + 1;
        this._recordWorkspaceIssue(workspaceStats, workspaces, data.metadata.file, 'warning', null);
      }
    }

    const avgCompliance = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;

    const topViolations = Object.entries(violationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([article, count]) => ({
        article: Number(article),
        name: ARTICLE_NAMES[article] || `Article ${article}`,
        count,
      }));

    const riskiestFiles = Object.entries(fileFailCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => ({ file, count }));

    const workspaceBreakdown = Object.entries(workspaceStats)
      .sort((a, b) => b[1].totalIssues - a[1].totalIssues)
      .map(([workspaceName, stats]) => ({
        workspaceName,
        totalIssues: stats.totalIssues,
        blockingIssues: stats.blockingIssues,
        warningIssues: stats.warningIssues,
        topArticles: Object.entries(stats.articles)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([article, count]) => ({
            article: Number(article),
            name: ARTICLE_NAMES[article] || `Article ${article}`,
            count,
          })),
      }));

    return {
      totalChecks: totalRuns,
      avgCompliance,
      topViolations,
      riskiestFiles,
      workspaceBreakdown,
    };
  }

  _workspaceIndex() {
    return detectWorkspaces(this.cwd).map(workspace => ({
      name: path.relative(this.cwd, workspace.root).replace(/\\/g, '/') || workspace.name,
      root: path.relative(this.cwd, workspace.root).replace(/\\/g, '/'),
    }));
  }

  _recordWorkspaceIssue(workspaceStats, workspaces, issueFile, severity, article) {
    const workspace = this._workspaceForPath(workspaces, issueFile);
    if (!workspace) return;

    if (!workspaceStats[workspace.name]) {
      workspaceStats[workspace.name] = { totalIssues: 0, blockingIssues: 0, warningIssues: 0, articles: {} };
    }

    const stats = workspaceStats[workspace.name];
    stats.totalIssues++;
    if (severity === 'blocking') stats.blockingIssues++;
    if (severity === 'warning') stats.warningIssues++;

    const articleNum = Number(article);
    if (!Number.isNaN(articleNum)) {
      stats.articles[articleNum] = (stats.articles[articleNum] || 0) + 1;
    }
  }

  _workspaceForPath(workspaces, filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
    return workspaces.find(workspace => normalized === workspace.root || normalized.startsWith(workspace.root + '/')) || null;
  }

  _extractIssueFiles(issue) {
    const files = [];
    for (const key of ['file', 'path', 'filepath', 'filePath']) {
      if (typeof issue[key] === 'string') files.push(issue[key]);
    }

    if (Array.isArray(issue.files)) {
      files.push(...issue.files.filter(f => typeof f === 'string'));
    }

    if (issue.message) {
      const matches = String(issue.message).match(/[\w.-]+(?:\/[\w.-]+)+\.(?:js|jsx|ts|tsx|py|json|md|yml|yaml)/g) || [];
      files.push(...matches);
    }

    return Array.from(new Set(files));
  }

  _printReport(aggregation) {
    console.log(chalk.bold('\n📊 STDD Constitution Audit Report\n'));

    console.log(`  Total Checks:     ${chalk.cyan(aggregation.totalChecks)}`);
    console.log(`  Avg Compliance:   ${chalk.cyan(aggregation.avgCompliance + '%')}\n`);

    if (aggregation.topViolations.length > 0) {
      console.log(chalk.bold('  Top Violations:'));
      aggregation.topViolations.forEach((v, i) => {
        console.log(`    ${i + 1}. Article ${v.article} (${v.name}): ${chalk.red(v.count + ' failures')}`);
      });
    } else {
      console.log(chalk.green('  No violations found.'));
    }

    console.log('');

    if (aggregation.riskiestFiles.length > 0) {
      console.log(chalk.bold('  Riskiest Files:'));
      aggregation.riskiestFiles.forEach((f, i) => {
        console.log(`    ${i + 1}. ${chalk.yellow(f.file)}: (Failed ${f.count} times)`);
      });
    } else {
      console.log(chalk.green('  No risky files identified.'));
    }

    console.log('');

    if (aggregation.workspaceBreakdown.length > 0) {
      console.log(chalk.bold('  Workspace Breakdown:'));
      aggregation.workspaceBreakdown.forEach((workspace, i) => {
        console.log(`    ${i + 1}. ${chalk.yellow(workspace.workspaceName)}: ${workspace.totalIssues} issues (${workspace.blockingIssues} blocking, ${workspace.warningIssues} warning)`);
      });
    } else {
      console.log(chalk.green('  No workspace-specific issues identified.'));
    }

    console.log('');
  }
}

module.exports = { AuditCommand };
