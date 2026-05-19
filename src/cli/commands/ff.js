/**
 * FF Command (Fast-Forward)
 * Generate a change with pre-populated tasks for immediate apply
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { validateChangeName } = require('../../utils/change-utils');

class FFCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async ensureChangesDir() {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    try {
      await fs.access(changesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw new Error(`Cannot access changes directory: ${error.message}`);
    }
    return changesDir;
  }

  generateChangeName() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `ff-${yyyy}${MM}${dd}-${HH}${mm}`;
  }

  toSafeFilename(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  workspaceContext(workspace) {
    if (!workspace) return null;
    const root = path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name;
    return {
      name: workspace.name,
      path: root,
      tag: this.toSafeFilename(root),
    };
  }

  generateProposal(description, workspace = null) {
    const timestamp = new Date().toISOString();
    const workspaceSection = workspace ? `
## Workspace

- Path: ${workspace.path}
- Package: ${workspace.name}
` : '';
    const workspaceRow = workspace ? `| Workspace | ${workspace.path} |
` : '';
    return `# Proposal: ${description}

## Intent

> 这个变更要解决什么问题？为什么现在要做？

${description}

## Scope

### In Scope

- [ ] 核心功能实现
- [ ] 基础单元测试

### Out of Scope

- 高级特性
- 性能优化

## Success Criteria

- [ ] 所有测试通过
- [ ] 无 ESLint 警告
${workspaceSection}

---

## Metadata

| Field | Value |
|-------|-------|
| Created | ${timestamp.split('T')[0]} |
| Author | [作者] |
| Status |  Draft |
${workspaceRow}
`;
  }

  generateTasks(description, workspace = null) {
    const workspaceHeader = workspace ? `
> Workspace: ${workspace.path}
` : '';
    return `# Tasks
${workspaceHeader}

- [ ] TASK-001: 环境准备与脚手架搭建
- [ ] TASK-002: ${description} 核心逻辑实现
- [ ] TASK-003: 单元测试编写与验证
`;
  }

  async execute(description, options = {}) {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required.');
    }

    const changesDir = await this.ensureChangesDir();
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = this.workspaceContext(workspace);

    const changeName = options.changeName || this.generateChangeName();
    validateChangeName(changeName);
    const changeDir = path.join(changesDir, changeName);

    try {
      await fs.mkdir(changeDir, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(`Change '${changeName}' already exists.`);
      }
      throw error;
    }

    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });

    await fs.writeFile(path.join(changeDir, 'proposal.md'), this.generateProposal(description, workspaceMeta));
    await fs.writeFile(path.join(changeDir, 'tasks.md'), this.generateTasks(description, workspaceMeta));

    console.log(chalk.green(`\n✅ Fast-forward change '${changeName}' created at stdd/changes/${changeName}/\n`));
    if (workspaceMeta) {
      console.log(chalk.cyan(`Workspace: ${workspaceMeta.path}`));
    }
    console.log('Next steps:');
    const workspaceArg = workspaceMeta ? ` --workspace ${workspaceMeta.path}` : '';
    console.log(chalk.cyan(`  stdd apply ${changeName}${workspaceArg}`));

    return { changeName, workspace: workspaceMeta };
  }
}

module.exports = { FFCommand };
