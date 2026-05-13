/**
 * Explore Command
 * Scans a project to generate an architecture summary, quality hotspots,
 * and actionable suggestions to seed a proposal.md.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const { MemoryScanner } = require('./memory-scan');

const LONG_FILE_THRESHOLD = 500;
const HIGH_EXPORT_THRESHOLD = 10;

class ExploreCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  async execute(scope, options = {}) {
    const techStack = TechStackDetector.analyze(this.cwd);

    const scanner = new MemoryScanner(this.cwd);
    await scanner.resolveConfig();
    const sourceDir = options.sourceDir || scanner.sourceRoot;
    const sourceFiles = fs.existsSync(sourceDir)
      ? await scanner.findSourceFiles(sourceDir)
      : [];

    const { sourceFiles: srcFiles, testFiles } = this._categorizeSourceFiles(sourceFiles);

    const untestedFiles = this._findUntestedFiles(srcFiles, testFiles);
    const longFiles = this._findLongFiles(srcFiles);
    const highExportFiles = this._findHighExportFiles(srcFiles);

    const suggestions = this._generateSuggestions(untestedFiles, longFiles, highExportFiles);

    const report = {
      techStack,
      directoryStructure: scanner.buildFileTree(sourceFiles),
      entryFiles: this._findEntryFiles(srcFiles),
      coreDependencies: this._getCoreDependencies(),
      untestedFiles: untestedFiles,
      longFiles: longFiles,
      highExportFiles: highExportFiles,
      suggestions,
      scope,
    };

    if (options.output) {
      const outputPath = path.resolve(this.cwd, options.output);
      const md = this._toMarkdown(report);
      fs.writeFileSync(outputPath, md, 'utf-8');
    }

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this._printReport(report);
    }

    return report;
  }

  _categorizeSourceFiles(files) {
    const sourceFiles = [];
    const testFiles = [];
    for (const file of files) {
      const basename = path.basename(file);
      if (basename.includes('.test.') || basename.includes('.spec.')) {
        testFiles.push(file);
      } else {
        sourceFiles.push(file);
      }
    }
    return { sourceFiles, testFiles };
  }

  _findUntestedFiles(sourceFiles, testFiles) {
    const testBasenames = new Set(
      testFiles.map((f) => {
        const b = path.basename(f);
        return b.replace(/\.test\./, '.').replace(/\.spec\./, '.');
      })
    );
    return sourceFiles.filter((f) => {
      const b = path.basename(f);
      return !testBasenames.has(b);
    });
  }

  _findLongFiles(sourceFiles) {
    const results = [];
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lineCount = content.split('\n').length;
        if (lineCount > LONG_FILE_THRESHOLD) {
          results.push({ file, lineCount });
        }
      } catch {
        // skip unreadable
      }
    }
    return results;
  }

  _findHighExportFiles(sourceFiles) {
    const results = [];
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const moduleExportMatch = content.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/m);
        let exportCount = 0;
        if (moduleExportMatch) {
          exportCount = moduleExportMatch[1]
            .split(',')
            .map((n) => n.trim().replace(/\n/g, '').split(/\s*:\s*/)[0])
            .filter(Boolean).length;
        }
        const exportFnMatches = content.match(/exports\.\w+\s*=/g) || [];
        exportCount += exportFnMatches.length;

        if (exportCount > HIGH_EXPORT_THRESHOLD) {
          results.push({ file, exportCount });
        }
      } catch {
        // skip unreadable
      }
    }
    return results;
  }

  _findEntryFiles(sourceFiles) {
    const entryPatterns = ['index.js', 'index.ts', 'app.js', 'app.ts', 'main.js', 'main.ts', 'main.py'];
    return sourceFiles.filter((f) => entryPatterns.includes(path.basename(f)));
  }

  _getCoreDependencies() {
    const pkgPath = path.join(this.cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...((pkg && pkg.dependencies) || {}), ...((pkg && pkg.devDependencies) || {}) };
      return Object.keys(deps).sort();
    } catch {
      return [];
    }
  }

  _generateSuggestions(untestedFiles, longFiles, highExportFiles) {
    const suggestions = [];
    const cwd = this.cwd;

    for (const file of untestedFiles) {
      const rel = path.relative(cwd, file);
      suggestions.push({
        type: 'untested',
        message: `建议优先为 ${rel} 编写测试`,
        priority: 'high',
      });
    }

    for (const { file, lineCount } of longFiles) {
      const rel = path.relative(cwd, file);
      suggestions.push({
        type: 'long-file',
        message: `建议重构 ${rel} (${lineCount} 行)`,
        priority: 'medium',
      });
    }

    for (const { file, exportCount } of highExportFiles) {
      const rel = path.relative(cwd, file);
      suggestions.push({
        type: 'high-exports',
        message: `建议拆分 ${rel} (导出了 ${exportCount} 个模块)`,
        priority: 'medium',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'info',
        message: '项目结构良好，暂无明显改进建议',
        priority: 'low',
      });
    }

    return suggestions;
  }

  _printReport(report) {
    console.log(chalk.bold('\n🔍 STDD Project Exploration Report\n'));

    console.log(chalk.bold(chalk.cyan('  Architecture Summary')));
    console.log(chalk.cyan(`    Language:     ${chalk.white(report.techStack.language)}`));
    console.log(chalk.cyan(`    Framework:    ${chalk.white(report.techStack.framework)}`));
    console.log(chalk.cyan(`    Test Runner:  ${chalk.white(report.techStack.testRunner)}`));
    console.log(chalk.cyan(`    Test Command: ${chalk.white(report.techStack.testCommand || 'N/A')}`));

    if (report.entryFiles.length > 0) {
      console.log(chalk.cyan('\n    Entry Files:'));
      for (const f of report.entryFiles) {
        console.log(chalk.cyan(`      - ${chalk.white(path.relative(this.cwd, f))}`));
      }
    }

    if (report.coreDependencies.length > 0) {
      console.log(chalk.cyan('\n    Core Dependencies:'));
      const show = report.coreDependencies.slice(0, 10);
      for (const dep of show) {
        console.log(chalk.cyan(`      - ${chalk.white(dep)}`));
      }
      if (report.coreDependencies.length > 10) {
        console.log(chalk.cyan(`      ... and ${report.coreDependencies.length - 10} more`));
      }
    }

    console.log(chalk.bold(chalk.red('\n  Quality Hotspots')));

    console.log(chalk.red(`\n    Untested Files (${report.untestedFiles.length}):`));
    if (report.untestedFiles.length === 0) {
      console.log(chalk.green('      All source files have corresponding tests!'));
    } else {
      const show = report.untestedFiles.slice(0, 10);
      for (const f of show) {
        console.log(chalk.red(`      ⚠ ${path.relative(this.cwd, f)}`));
      }
      if (report.untestedFiles.length > 10) {
        console.log(chalk.dim(`      ... and ${report.untestedFiles.length - 10} more`));
      }
    }

    console.log(chalk.yellow(`\n    Long Files (>${LONG_FILE_THRESHOLD} lines):`));
    if (report.longFiles.length === 0) {
      console.log(chalk.green('      No files exceed the threshold.'));
    } else {
      for (const { file, lineCount } of report.longFiles) {
        console.log(chalk.yellow(`      ⚠ ${path.relative(this.cwd, file)} (${lineCount} lines)`));
      }
    }

    console.log(chalk.magenta(`\n    Files with Many Exports (>${HIGH_EXPORT_THRESHOLD}):`));
    if (report.highExportFiles.length === 0) {
      console.log(chalk.green('      No files exceed the threshold.'));
    } else {
      for (const { file, exportCount } of report.highExportFiles) {
        console.log(chalk.magenta(`      ⚠ ${path.relative(this.cwd, file)} (${exportCount} exports)`));
      }
    }

    console.log(chalk.bold(chalk.green('\n  Suggestions')));
    for (const s of report.suggestions) {
      const color = s.priority === 'high' ? chalk.red : s.priority === 'medium' ? chalk.yellow : chalk.green;
      console.log(color(`    • ${s.message}`));
    }

    if (report.scope) {
      console.log(chalk.dim(`\n  Scope filter: "${report.scope}" (showing full report; scope filtering is a future enhancement)`));
    }

    console.log('');
  }

  _toMarkdown(report) {
    const lines = [];
    lines.push('# STDD Project Exploration Report');
    lines.push('');
    lines.push('## Architecture Summary');
    lines.push('');
    lines.push(`- **Language:** ${report.techStack.language}`);
    lines.push(`- **Framework:** ${report.techStack.framework}`);
    lines.push(`- **Test Runner:** ${report.techStack.testRunner}`);
    lines.push(`- **Test Command:** ${report.techStack.testCommand || 'N/A'}`);
    lines.push('');

    if (report.entryFiles.length > 0) {
      lines.push('### Entry Files');
      lines.push('');
      for (const f of report.entryFiles) {
        lines.push(`- \`${path.relative(this.cwd, f)}\``);
      }
      lines.push('');
    }

    if (report.coreDependencies.length > 0) {
      lines.push('### Core Dependencies');
      lines.push('');
      for (const dep of report.coreDependencies) {
        lines.push(`- ${dep}`);
      }
      lines.push('');
    }

    lines.push('## Quality Hotspots');
    lines.push('');

    lines.push('### Untested Files');
    lines.push('');
    if (report.untestedFiles.length === 0) {
      lines.push('All source files have corresponding tests.');
    } else {
      for (const f of report.untestedFiles) {
        lines.push(`- \`${path.relative(this.cwd, f)}\``);
      }
    }
    lines.push('');

    lines.push('### Long Files (>500 lines)');
    lines.push('');
    if (report.longFiles.length === 0) {
      lines.push('No files exceed the threshold.');
    } else {
      for (const { file, lineCount } of report.longFiles) {
        lines.push(`- \`${path.relative(this.cwd, file)}\` (${lineCount} lines)`);
      }
    }
    lines.push('');

    lines.push('### Files with Many Exports (>10)');
    lines.push('');
    if (report.highExportFiles.length === 0) {
      lines.push('No files exceed the threshold.');
    } else {
      for (const { file, exportCount } of report.highExportFiles) {
        lines.push(`- \`${path.relative(this.cwd, file)}\` (${exportCount} exports)`);
      }
    }
    lines.push('');

    lines.push('## Suggestions');
    lines.push('');
    for (const s of report.suggestions) {
      lines.push(`- ${s.message}`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = { ExploreCommand };
