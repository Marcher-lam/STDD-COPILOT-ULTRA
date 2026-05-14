const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

/**
 * Integration Test Helper
 * 
 * Provides utilities for end-to-end testing of STDD Copilot CLI commands.
 */

const CLI_PATH = path.join(__dirname, '..', 'cli.js');

/**
 * Run a CLI command and return the result
 * @param {string[]} args - Command arguments
 * @param {string} cwd - Working directory
 * @returns {object} { status, stdout, stderr }
 */
function runCli(args, cwd) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

/**
 * Create a temporary project directory with STDD initialized
 * @param {string} name - Project name
 * @param {object} options - Additional options
 * @returns {string} Project path
 */
function createTempProject(name, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-integration-test-'));
  const projectPath = path.join(root, name);
  fs.mkdirSync(projectPath, { recursive: true });

  // Initialize STDD
  const initResult = runCli(['init', '--yes'], projectPath);
  if (initResult.status !== 0) {
    throw new Error(`Failed to initialize STDD: ${initResult.stderr}`);
  }

  // Create a change if specified
  if (options.changeName) {
    const changeResult = runCli(['new', 'change', options.changeName], projectPath);
    if (changeResult.status !== 0) {
      throw new Error(`Failed to create change: ${changeResult.stderr}`);
    }
  }

  return projectPath;
}

/**
 * Clean up temporary project
 * @param {string} projectPath - Project path
 */
function cleanupTempProject(projectPath) {
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runCli,
  createTempProject,
  cleanupTempProject,
  sleep,
};
