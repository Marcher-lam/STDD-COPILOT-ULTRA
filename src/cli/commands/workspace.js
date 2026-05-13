const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { detectWorkspaces, loadWorkspaceRegistry } = require('../../utils/workspace-detector');

class WorkspaceCommand {
  validate(options = {}) {
    const root = path.resolve(options.cwd || process.cwd());
    const registry = loadWorkspaceRegistry(root);
    const dynamic = detectWorkspaces(root, { refresh: true });
    const report = this.buildValidationReport(root, registry, dynamic);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this.printValidationReport(report);
    }

    if (report.exitCode !== 0) {
      process.exitCode = report.exitCode;
    }
    return report;
  }

  repair(options = {}) {
    const root = path.resolve(options.cwd || process.cwd());
    const configPath = path.join(root, 'stdd', 'config.yaml');
    const before = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
    const dynamic = detectWorkspaces(root, { refresh: true });
    const after = this.updateWorkspaceRegistryBlock(before, root, dynamic);
    const changed = after !== before;
    const result = {
      root,
      configPath,
      dryRun: Boolean(options.dryRun),
      changed,
      workspaces: dynamic.map(workspace => this.workspaceToRegistryItem(root, workspace)),
    };

    if (options.dryRun) {
      console.log(changed
        ? chalk.yellow(`Workspace registry would be repaired (${dynamic.length} workspace(s)).`)
        : chalk.green('Workspace registry is already up to date.'));
      return result;
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, after);
    console.log(changed
      ? chalk.green(`Workspace registry repaired (${dynamic.length} workspace(s)).`)
      : chalk.green('Workspace registry is already up to date.'));
    return result;
  }

  list(options = {}) {
    const root = path.resolve(options.cwd || process.cwd());
    const registry = loadWorkspaceRegistry(root);
    const source = registry.length > 0 ? 'registry' : 'dynamic';
    const workspaces = registry.length > 0 ? registry : detectWorkspaces(root, { refresh: true });
    const result = {
      root,
      source,
      workspaces: workspaces.map(workspace => this.workspaceToOutput(root, workspace)),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.printList(result);
    }
    return result;
  }

  buildValidationReport(root, registry, dynamic) {
    const registryItems = registry.map(workspace => this.workspaceToOutput(root, workspace));
    const dynamicItems = dynamic.map(workspace => this.workspaceToOutput(root, workspace));
    const dynamicKeys = this.workspaceKeySet(dynamicItems);
    const registryKeys = this.workspaceKeySet(registryItems);

    const stale = [];
    const missingPackageJson = [];
    const sourceRootMissing = [];
    const missing = [];
    const added = [];

    for (const item of registryItems) {
      const rootExists = fs.existsSync(path.join(root, item.root));
      const packageJsonExists = fs.existsSync(path.join(root, item.package_json));
      const sourceRootExists = fs.existsSync(path.join(root, item.source_root));

      if (!rootExists) {
        stale.push(item);
        continue;
      }
      if (!packageJsonExists) {
        missingPackageJson.push(item);
      }
      if (!sourceRootExists) {
        sourceRootMissing.push(item);
      }
      if (!this.hasWorkspaceKey(dynamicKeys, item)) {
        missing.push(item);
      }
    }

    for (const item of dynamicItems) {
      if (!this.hasWorkspaceKey(registryKeys, item)) {
        added.push(item);
      }
    }

    const exitCode = stale.length > 0 || missingPackageJson.length > 0 ? 1 : 0;
    return {
      ok: exitCode === 0,
      exitCode,
      root,
      registry: registryItems,
      dynamic: dynamicItems,
      issues: {
        stale,
        missingPackageJson,
        sourceRootMissing,
        missing,
        new: added,
      },
    };
  }

  printValidationReport(report) {
    console.log(chalk.bold('\nWorkspace Registry Validation'));
    console.log(`  Root: ${report.root}`);
    console.log(`  Registry: ${report.registry.length} workspace(s)`);
    console.log(`  Dynamic: ${report.dynamic.length} workspace(s)`);

    this.printIssueList('Stale roots', report.issues.stale, 'red');
    this.printIssueList('Missing package_json', report.issues.missingPackageJson, 'red');
    this.printIssueList('Missing source_root', report.issues.sourceRootMissing, 'yellow');
    this.printIssueList('Registry missing from dynamic detection', report.issues.missing, 'yellow');
    this.printIssueList('New dynamic workspaces', report.issues.new, 'yellow');

    if (report.ok) {
      console.log(chalk.green('\nWorkspace registry validation passed.'));
    } else {
      console.log(chalk.red('\nWorkspace registry validation failed. Run `stdd workspace repair` to refresh it.'));
    }
  }

  printIssueList(title, items, color) {
    if (!items.length) return;
    console.log(chalk[color](`\n  ${title}:`));
    for (const item of items) {
      console.log(chalk[color](`    - ${item.name} (${item.root})`));
    }
  }

  printList(result) {
    console.log(chalk.bold(`\nWorkspaces (${result.source})`));
    if (result.workspaces.length === 0) {
      console.log('  No workspaces found.');
      return;
    }
    for (const workspace of result.workspaces) {
      console.log(`  - ${workspace.name}`);
      console.log(`    root: ${workspace.root}`);
      console.log(`    source_root: ${workspace.source_root}`);
      console.log(`    package_json: ${workspace.package_json}`);
    }
  }

  workspaceKeySet(items) {
    const keys = new Set();
    for (const item of items) {
      keys.add(`name:${item.name}`);
      keys.add(`root:${item.root}`);
    }
    return keys;
  }

  hasWorkspaceKey(keys, item) {
    return keys.has(`name:${item.name}`) || keys.has(`root:${item.root}`);
  }

  workspaceToOutput(root, workspace) {
    return {
      name: workspace.name,
      root: this.relativePath(root, workspace.root),
      source_root: this.relativePath(root, workspace.sourceDir),
      package_json: this.relativePath(root, workspace.packageJsonPath),
    };
  }

  workspaceToRegistryItem(root, workspace) {
    return this.workspaceToOutput(root, workspace);
  }

  updateWorkspaceRegistryBlock(configContent, root, detectedWorkspaces) {
    const config = configContent ? (yaml.load(configContent) || {}) : {};
    const existingWorkspaces = config.workspaces && typeof config.workspaces === 'object'
      ? config.workspaces
      : {};
    const existingItems = Array.isArray(existingWorkspaces.items) ? existingWorkspaces.items : [];
    const mergedItems = [];

    for (const workspace of detectedWorkspaces) {
      const standardItem = this.workspaceToRegistryItem(root, workspace);
      const existing = existingItems.find(item => item && (
        item.name === standardItem.name ||
        item.root === standardItem.root
      ));
      mergedItems.push({ ...(existing || {}), ...standardItem });
    }

    const nextBlock = this.renderWorkspaceRegistryBlock({
      ...existingWorkspaces,
      enabled: true,
      items: mergedItems,
    });
    return this.replaceWorkspaceRegistryBlock(configContent, nextBlock);
  }

  renderWorkspaceRegistryBlock(workspaces) {
    const lines = [
      'workspaces:',
      `  enabled: ${workspaces.enabled !== false ? 'true' : 'false'}`,
      '  items:'
    ];

    for (const item of workspaces.items || []) {
      const customKeys = Object.keys(item).filter(key => !['name', 'root', 'source_root', 'package_json'].includes(key));
      lines.push(`    - name: "${item.name}"`);
      lines.push(`      root: "${item.root}"`);
      lines.push(`      source_root: "${item.source_root}"`);
      lines.push(`      package_json: "${item.package_json}"`);
      for (const key of customKeys) {
        lines.push(`      ${key}: ${this.formatYamlScalar(item[key])}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  replaceWorkspaceRegistryBlock(configContent, nextBlock) {
    const lines = configContent.split('\n');
    const start = lines.findIndex(line => /^workspaces:\s*$/.test(line));
    if (start === -1) {
      const separator = configContent.endsWith('\n') ? '\n' : '\n\n';
      return `${configContent}${separator}# Monorepo Workspace Registry\n${nextBlock}`;
    }

    let end = start + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && !line.trim().startsWith('#')) {
        break;
      }
      end++;
    }

    const before = lines.slice(0, start).join('\n');
    const after = lines.slice(end).join('\n');
    return `${before}${before ? '\n' : ''}${nextBlock}${after || ''}`;
  }

  formatYamlScalar(value) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return 'null';
    return String(value).match(/^[A-Za-z0-9_./@-]+$/) ? String(value) : JSON.stringify(String(value));
  }

  relativePath(root, absolutePath) {
    return path.relative(root, absolutePath).replace(/\\/g, '/');
  }
}

module.exports = { WorkspaceCommand };
