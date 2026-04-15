/**
 * Update Command
 * Update STDD Copilot files in a project
 */

const fs = require('fs').promises;
const path = require('path');
const { getPackageRoot } = require('../../utils/path-resolver');
const chalk = require('chalk');

class UpdateCommand {
  constructor(spinner) {
    this.spinner = spinner || { text: '', start() {}, stop() {}, succeed() {}, fail() {} };
    this.report = this.createReport();
  }

  async execute(targetPath, options = {}) {
    this.report = this.createReport();
    const stddDir = path.join(targetPath, 'stdd');

    // Check if STDD is initialized
    if (!await this.exists(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const enginesConfig = require('../../config/engines.json');
    this.spinner.text = 'Updating Engine commands...';
    this.report.engineCommands = await this.updateEngineCommands(targetPath, options.force, enginesConfig.engines);

    // Update schemas if needed
    this.spinner.text = 'Updating schemas...';
    this.report.schemas = await this.updateSchemas(targetPath, options.force);

    this.printSummary();

    if (this.report.errors.length > 0) {
      throw new Error(`Update completed with ${this.report.errors.length} error(s).`);
    }

    console.log(chalk.green('\n✅ STDD Copilot updated!'));
  }

  createReport() {
    return {
      engineCommands: { updated: 0, skipped: 0, targetsVisited: 0, targetsMissing: 0 },
      schemas: { updated: 0, skipped: 0 },
      errors: []
    };
  }

  addError(scope, message, error, filePath = null) {
    this.report.errors.push({
      scope,
      message,
      filePath,
      error: error?.message || 'Unknown error'
    });
  }

  printSummary() {
    const { engineCommands, schemas, errors } = this.report;
    console.log(chalk.bold('\n📊 Update summary'));
    console.log(
      `  Engine commands: updated ${chalk.cyan(engineCommands.updated)}, ` +
      `skipped ${chalk.cyan(engineCommands.skipped)}, ` +
      `targets ${chalk.cyan(engineCommands.targetsVisited)}, ` +
      `missing ${chalk.cyan(engineCommands.targetsMissing)}`
    );
    console.log(
      `  Schemas: updated ${chalk.cyan(schemas.updated)}, ` +
      `skipped ${chalk.cyan(schemas.skipped)}`
    );

    if (errors.length > 0) {
      console.log(chalk.red(`  Errors: ${errors.length}`));
      errors.slice(0, 5).forEach((entry, index) => {
        const fileHint = entry.filePath ? ` (${entry.filePath})` : '';
        console.log(chalk.red(`    ${index + 1}. [${entry.scope}] ${entry.message}${fileHint}`));
        console.log(chalk.red(`       ${entry.error}`));
      });
      if (errors.length > 5) {
        console.log(chalk.red(`    ...and ${errors.length - 5} more`));
      }
    }
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  
  async updateEngineCommands(targetPath, force, engines) {
    const summary = { updated: 0, skipped: 0, targetsVisited: 0, targetsMissing: 0 };
    const defaultEngine = engines.find(e => e.checked) || engines[0];
    const sourceDir = path.join(getPackageRoot(), defaultEngine.value, 'commands', 'stdd');

    if (!await this.exists(sourceDir)) {
      this.addError('engine-commands', 'Source engine command directory not found', null, sourceDir);
      return summary;
    }

    for (const engine of engines) {
      const agentDir = path.join(targetPath, engine.value);
      if (!await this.exists(agentDir)) {
        summary.targetsMissing++;
        continue;
      }

      summary.targetsVisited++;
      const targetDir = path.join(agentDir, 'commands', 'stdd');

      const result = await this.syncDirectory(sourceDir, targetDir, {
        force,
        extensions: ['.md'],
        scope: `engine-commands:${engine.value}`
      });
      summary.updated += result.updated;
      summary.skipped += result.skipped;
    }

    return summary;
  }

  async syncDirectory(sourceDir, targetDir, options = {}) {
    const { force = false, extensions = null, scope = 'sync' } = options;
    const files = await this.collectFiles(sourceDir);
    let updated = 0;
    let skipped = 0;

    for (const srcFile of files) {
      if (extensions && !extensions.includes(path.extname(srcFile))) {
        continue;
      }

      const relativePath = path.relative(sourceDir, srcFile);
      const targetFile = path.join(targetDir, relativePath);
      await fs.mkdir(path.dirname(targetFile), { recursive: true });

      const targetExists = await this.exists(targetFile);
      if (targetExists && !force) {
        skipped++;
        continue;
      }

      try {
        const content = await fs.readFile(srcFile, 'utf-8');
        await fs.writeFile(targetFile, content);
        updated++;
      } catch (error) {
        this.addError(scope, `Failed to sync file '${relativePath}'`, error, targetFile);
      }
    }

    return { updated, skipped };
  }

  async collectFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.collectFiles(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  }

  async updateSchemas(targetPath, force) {
    const summary = { updated: 0, skipped: 0 };
    const sourceSchema = path.join(getPackageRoot(), 'schemas');
    const targetSchema = path.join(targetPath, 'schemas');

    if (!await this.exists(sourceSchema)) {
      this.addError('schemas', 'Source schema directory not found', null, sourceSchema);
      return summary;
    }

    await fs.mkdir(targetSchema, { recursive: true });
    const result = await this.syncDirectory(sourceSchema, targetSchema, {
      force,
      scope: 'schemas'
    });
    summary.updated += result.updated;
    summary.skipped += result.skipped;

    return summary;
  }
}

module.exports = { UpdateCommand };
