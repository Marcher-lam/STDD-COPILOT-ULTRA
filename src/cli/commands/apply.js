/**
 * Apply Command
 * Minimal TDD runner: pick a task, run tests, update status, log result
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { injectReporter } = require('../../utils/reporter-injector');
const { resolveTestCommands } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { runCommand: runParsedCommand } = require('../../utils/command-runner');
const { FixPacketCommand } = require('./fix-packet');

function getConfigTestCommand(cwd) {
  const configPath = path.join(cwd, 'stdd', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const config = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    return (config && config.test && config.test.command) || null;
  } catch {
    return null;
  }
}

const TASK_PATTERN = /^(\s*- )\[([ ~x✓✓])\]\s*(.*)$/;

function pickTask(tasks, options = {}) {
  if (options.task) {
    const target = String(options.task);
    return tasks.find(t =>
      !t.isDone && (t.description.includes(target) || t.line.includes(target))
    );
  }
  return tasks.find(t => !t.isDone);
}

function updateTaskLine(filePath, task, newStatus) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldLine = lines[task.index];
  if (!oldLine) {
    return;
  }
  lines[task.index] = oldLine.replace(/\[([ ~x✓✓])\]/, `[${newStatus}]`);
  fs.writeFileSync(filePath, lines.join('\n'));
}

function runCommand(cmd, cwd, additionalEnv) {
  const env = additionalEnv ? { ...process.env, ...additionalEnv } : undefined;
  return runParsedCommand(cmd, { cwd, stdio: 'inherit', env });
}

function writeLog(changeDir, entry) {
  const logPath = path.join(changeDir, 'apply.log');
  const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logPath, line);
}

function writeEvidence(changeDir, name, data) {
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const filePath = path.join(evidenceDir, `${name}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function delegationPlan(resultStatus, testResults, options = {}) {
  if (resultStatus !== 'failed') return null;
  const engines = ['claude_code', 'cursor', 'copilot', 'qwen_code'];
  return {
    trigger: 'apply-test-failure',
    strategy: options.delegate ? 'delegate-requested' : 'recommend-delegation',
    suggestedEngines: engines,
    reason: 'Tests failed during apply; request a fresh model or role to inspect failing output before retrying.',
    failedCommands: testResults.filter(r => !r.passed).map(r => ({ workspace: r.workspaceName, command: r.command })),
  };
}

class ApplyCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = findActiveChange(stddDir, options.change || changeName);
    if (!changeDir) {
      throw new Error(options.change
        ? `Change '${options.change}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    const changeNameActual = path.basename(changeDir);
    const tasksPath = path.join(changeDir, 'tasks.md');
    const requestedWorkspace = options.workspace ? resolveWorkspaceScope(cwd, options.workspace) : null;

    if (!fs.existsSync(tasksPath)) {
      throw new Error(`tasks.md not found in ${changeNameActual}. Add tasks before running apply.`);
    }

    const tasks = parseTasks(tasksPath);
    if (!tasks || tasks.length === 0) {
      throw new Error(`No tasks found in ${changeNameActual}/tasks.md.`);
    }

    const selectedTask = pickTask(tasks, { task: options.task });
    if (!selectedTask) {
      console.log(chalk.green(`\n✅ All tasks completed in ${changeNameActual}`));
      return;
    }

    console.log(chalk.bold(`\n📌 Applying task in ${changeNameActual}:\n`));
    console.log(`  ${chalk.cyan(selectedTask.description)}`);

    if (options.dryRun) {
      const testCommands = resolveTestCommands(cwd, {
        testCommand: options.testCommand,
        configCommand: getConfigTestCommand(cwd),
        workspace: options.workspace,
      });
      console.log(`\n  ${chalk.yellow('Dry run mode')} — no commands will execute.`);
      if (testCommands.length > 0) {
        for (const testCommand of testCommands) {
          const rel = path.relative(cwd, testCommand.cwd) || '.';
          console.log(`  Test command would run (${testCommand.workspaceName}, ${rel}): ${chalk.cyan(testCommand.command)}`);
        }
      } else {
        console.log(`  ${chalk.dim('No test command configured.')}`);
      }
      return;
    }

    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: options.workspace,
    });

    const e2eEvidence = options.e2eCommand ? this.runE2EProbe(options.e2eCommand, cwd, changeDir) : null;

    // Mark task as in progress
    updateTaskLine(tasksPath, selectedTask, '~');

    let resultStatus;
    const testResults = [];
    if (testCommands.length === 0) {
      console.log(chalk.yellow(`  No test command configured. Skipping test execution.`));
      resultStatus = 'skipped';
    } else {
      console.log(`\n  📡 STDD Reporter linked for better evidence`);

      for (const testCommand of testCommands) {
        const injected = injectReporter(testCommand.command, testCommand.cwd);
        const testCmd = injected.command;
        const testEnv = injected.env;
        const label = testCommand.source === 'workspace'
          ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
          : testCommand.workspaceName;

        console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}\n`);

        let result = runCommand(testCmd, testCommand.cwd, testEnv);

        if (result.status !== 0 && injected.command !== testCommand.command) {
          console.log(chalk.dim(`  Reporter injection failed, retrying without reporter...`));
          result = runCommand(testCommand.command, testCommand.cwd);
        }

        testResults.push({
          workspaceName: testCommand.workspaceName,
          source: testCommand.source,
          cwd: testCommand.cwd,
          command: testCommand.command,
          passed: result.status === 0,
          workspace: commandToWorkspaceScope(cwd, testCommand),
        });
      }

      resultStatus = testResults.every(result => result.passed) ? 'passed' : 'failed';
    }

    if (resultStatus === 'passed') {
      updateTaskLine(tasksPath, selectedTask, 'x');
      console.log(chalk.green(`\n✅ Task passed tests`));
    } else if (resultStatus === 'failed') {
      updateTaskLine(tasksPath, selectedTask, ' ');
      console.log(chalk.red(`\n✗ Task failed tests — reverted to pending`));
      const fixPacket = new FixPacketCommand(cwd).execute(changeNameActual, {
        task: selectedTask.description,
        testCommand: testCommands.map(testCommand => testCommand.command).join(' && '),
        silent: true,
      });
      console.log(chalk.yellow(`  Fix packet: ${fixPacket.output}`));
    } else {
      updateTaskLine(tasksPath, selectedTask, 'x');
      console.log(chalk.dim(`\n  Task marked complete (tests skipped)`));
    }

    const workspaceResults = testResults.map(result => result.workspace).filter(Boolean);
    const logEntry = {
      change: changeNameActual,
      task: selectedTask.description,
      command: testCommands.length > 0 ? testCommands.map(testCommand => testCommand.command).join(' && ') : '(none)',
      workspaces: testResults,
      status: resultStatus,
    };
    if (requestedWorkspace) {
      logEntry.workspace = requestedWorkspace;
    } else if (workspaceResults.length === 1) {
      logEntry.workspace = workspaceResults[0];
    } else if (workspaceResults.length > 1) {
      logEntry.workspaceScopes = workspaceResults;
    }
    const delegation = delegationPlan(resultStatus, testResults, options);
    if (delegation) {
      logEntry.delegation = delegation;
      const evidencePath = writeEvidence(changeDir, 'delegation', {
        status: 'recommend',
        change: changeNameActual,
        task: selectedTask.description,
        delegation,
      });
      console.log(chalk.yellow(`  Delegation evidence: ${path.relative(cwd, evidencePath)}`));
    }
    if (e2eEvidence) {
      logEntry.e2e = e2eEvidence;
    }
    writeLog(changeDir, logEntry);

    if (resultStatus === 'failed') {
      process.exit(1);
    }
  }

  runE2EProbe(command, cwd, changeDir) {
    console.log(`\n  Running E2E probe: ${chalk.cyan(command)}\n`);
    const result = runCommand(command, cwd);
    const report = {
      status: result.status === 0 ? 'pass' : 'fail',
      command,
      timestamp: new Date().toISOString(),
    };
    const evidencePath = writeEvidence(changeDir, 'e2e', report);
    report.evidence = path.relative(cwd, evidencePath);
    return report;
  }
}

module.exports = { ApplyCommand, findActiveChange, parseTasks, pickTask };
