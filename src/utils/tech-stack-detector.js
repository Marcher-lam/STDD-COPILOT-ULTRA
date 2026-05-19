/**
 * Tech Stack Detector
 * Scans a project root to identify language, framework, and test runner.
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const logger = createLogger('tech-stack-detector');

class TechStackDetector {
  /**
   * Analyze a project root and return detected tech stack info.
   * @param {string} rootPath - Project root directory
   * @returns {{ language: string, testRunner: string, framework: string, testCommand: string }}
   */
  static analyze(rootPath) {
    const result = {
      language: 'unknown',
      testRunner: 'unknown',
      framework: 'unknown',
      testCommand: '',
    };

    result.language = this._detectLanguage(rootPath);

    if (result.language === 'node') {
      const pkg = this._readPackageJson(rootPath);
      result.framework = this._detectNodeFramework(pkg);
      result.testRunner = this._detectNodeTestRunner(pkg);
      result.testCommand = this._buildNodeTestCommand(result.testRunner);
    } else if (result.language === 'python') {
      result.testRunner = this._detectPythonTestRunner(rootPath);
      result.testCommand = this._buildPythonTestCommand(result.testRunner);
    } else if (result.language === 'rust') {
      result.testRunner = 'cargo';
      result.testCommand = 'cargo test';
    } else if (result.language === 'go') {
      result.testRunner = 'go test';
      result.testCommand = 'go test ./...';
    }

    return result;
  }

  static _detectLanguage(rootPath) {
    if (this._hasFile(rootPath, 'package.json')) {
      return 'node';
    }
    if (
      this._hasFile(rootPath, 'requirements.txt') ||
      this._hasFile(rootPath, 'pyproject.toml') ||
      this._hasFile(rootPath, 'setup.py')
    ) {
      return 'python';
    }
    if (this._hasFile(rootPath, 'Cargo.toml')) {
      return 'rust';
    }
    if (this._hasFile(rootPath, 'go.mod')) {
      return 'go';
    }
    return 'unknown';
  }

  static _readPackageJson(rootPath) {
    const pkgPath = path.join(rootPath, 'package.json');
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
      return {};
    }
  }

  static _hasFile(rootPath, fileName) {
    return fs.existsSync(path.join(rootPath, fileName));
  }

  static _allDeps(pkg) {
    const deps = { ...((pkg && pkg.dependencies) || {}) };
    const devDeps = { ...((pkg && pkg.devDependencies) || {}) };
    return { ...deps, ...devDeps };
  }

  static _detectNodeFramework(pkg) {
    const allDeps = this._allDeps(pkg);
    if (allDeps['react'] || allDeps['next']) return 'react';
    if (allDeps['express']) return 'express';
    if (allDeps['fastify']) return 'fastify';
    if (allDeps['nestjs'] || allDeps['@nestjs/core']) return 'nestjs';
    return 'unknown';
  }

  static _detectNodeTestRunner(pkg) {
    const allDeps = this._allDeps(pkg);
    if (allDeps['vitest']) return 'vitest';
    if (allDeps['jest'] || allDeps['ts-jest']) return 'jest';
    if (allDeps['mocha']) return 'mocha';
    return 'unknown';
  }

  static _buildNodeTestCommand(testRunner) {
    if (testRunner === 'vitest') return 'npx vitest run';
    if (testRunner === 'jest') return 'npx jest';
    if (testRunner === 'mocha') return 'npx mocha';
    return 'npm test';
  }

  static _detectPythonTestRunner(rootPath) {
    const reqPath = path.join(rootPath, 'requirements.txt');
    if (this._hasFile(rootPath, 'requirements.txt')) {
      try {
        const content = fs.readFileSync(reqPath, 'utf-8').toLowerCase();
        if (content.includes('pytest')) return 'pytest';
      } catch (err) {
        if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
      }
    }
    const pyprojectPath = path.join(rootPath, 'pyproject.toml');
    if (this._hasFile(rootPath, 'pyproject.toml')) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8').toLowerCase();
        if (content.includes('pytest')) return 'pytest';
      } catch (err) {
        if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
      }
    }
    const setupPath = path.join(rootPath, 'setup.py');
    if (this._hasFile(rootPath, 'setup.py')) {
      try {
        const content = fs.readFileSync(setupPath, 'utf-8').toLowerCase();
        if (content.includes('pytest')) return 'pytest';
      } catch (err) {
        if (err.code !== 'ENOENT' && err.code !== 'EACCES') logger.warn(err.message);
      }
    }
    return 'unittest';
  }

  static _buildPythonTestCommand(testRunner) {
    if (testRunner === 'pytest') return 'pytest';
    return 'python -m unittest discover';
  }
}

module.exports = { TechStackDetector, mergePackageDeps: TechStackDetector._allDeps };
