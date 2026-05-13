const fs = require('fs');
const path = require('path');
const os = require('os');
const { TechStackDetector } = require('../src/utils/tech-stack-detector');

describe('TechStackDetector', () => {
  let tempDirs = [];

  function createTempDir(prefix = 'stdd-tech-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('Node.js projects', () => {
    it('detects Node/Jest from package.json with jest devDependency', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jest: '^29.0.0' },
          scripts: { test: 'jest' },
        })
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('node');
      expect(result.testRunner).toBe('jest');
      expect(result.framework).toBe('unknown');
      expect(result.testCommand).toBe('npx jest');
    });

    it('detects Node/Vitest/React from package.json', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'react-app',
          dependencies: { react: '^18.0.0' },
          devDependencies: { vitest: '^1.0.0' },
        })
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('node');
      expect(result.testRunner).toBe('vitest');
      expect(result.framework).toBe('react');
      expect(result.testCommand).toBe('npx vitest run');
    });

    it('detects Node/Mocha/Express', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'api-server',
          dependencies: { express: '^4.0.0' },
          devDependencies: { mocha: '^10.0.0' },
        })
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('node');
      expect(result.testRunner).toBe('mocha');
      expect(result.framework).toBe('express');
      expect(result.testCommand).toBe('npx mocha');
    });

    it('defaults to npm test when no known test runner is found', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'minimal',
          scripts: { test: 'node test.js' },
        })
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('node');
      expect(result.testRunner).toBe('unknown');
      expect(result.testCommand).toBe('npm test');
    });
  });

  describe('Python projects', () => {
    it('detects Python/pytest from requirements.txt', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'requirements.txt'),
        'flask==2.0\npytest==7.0\nrequests==2.28\n'
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('python');
      expect(result.testRunner).toBe('pytest');
      expect(result.framework).toBe('unknown');
      expect(result.testCommand).toBe('pytest');
    });

    it('detects Python/unittest when no pytest in requirements', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'requirements.txt'),
        'flask==2.0\nrequests==2.28\n'
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('python');
      expect(result.testRunner).toBe('unittest');
      expect(result.testCommand).toBe('python -m unittest discover');
    });

    it('detects pytest from pyproject.toml', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'pyproject.toml'),
        '[tool.pytest.ini_options]\nminversion = "6.0"\n'
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('python');
      expect(result.testRunner).toBe('pytest');
      expect(result.testCommand).toBe('pytest');
    });
  });

  describe('Rust projects', () => {
    it('detects Rust/Cargo from Cargo.toml', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'Cargo.toml'),
        '[package]\nname = "my-project"\nversion = "0.1.0"\n'
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('rust');
      expect(result.testRunner).toBe('cargo');
      expect(result.framework).toBe('unknown');
      expect(result.testCommand).toBe('cargo test');
    });
  });

  describe('Go projects', () => {
    it('detects Go from go.mod', () => {
      const dir = createTempDir();
      fs.writeFileSync(
        path.join(dir, 'go.mod'),
        'module example.com/myproject\n\ngo 1.21\n'
      );

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('go');
      expect(result.testRunner).toBe('go test');
      expect(result.framework).toBe('unknown');
      expect(result.testCommand).toBe('go test ./...');
    });
  });

  describe('Unknown projects', () => {
    it('returns unknown for unrecognizable project', () => {
      const dir = createTempDir();

      const result = TechStackDetector.analyze(dir);

      expect(result.language).toBe('unknown');
      expect(result.testRunner).toBe('unknown');
      expect(result.framework).toBe('unknown');
      expect(result.testCommand).toBe('');
    });
  });

  describe('Static methods', () => {
    it('_detectLanguage returns correct values', () => {
      const nodeDir = createTempDir();
      fs.writeFileSync(path.join(nodeDir, 'package.json'), '{}');
      expect(TechStackDetector._detectLanguage(nodeDir)).toBe('node');

      const pyDir = createTempDir();
      fs.writeFileSync(path.join(pyDir, 'setup.py'), '...');
      expect(TechStackDetector._detectLanguage(pyDir)).toBe('python');

      const rustDir = createTempDir();
      fs.writeFileSync(path.join(rustDir, 'Cargo.toml'), '...');
      expect(TechStackDetector._detectLanguage(rustDir)).toBe('rust');

      const goDir = createTempDir();
      fs.writeFileSync(path.join(goDir, 'go.mod'), '...');
      expect(TechStackDetector._detectLanguage(goDir)).toBe('go');

      const emptyDir = createTempDir();
      expect(TechStackDetector._detectLanguage(emptyDir)).toBe('unknown');
    });

    it('_allDeps merges dependencies and devDependencies', () => {
      const pkg = {
        dependencies: { 'lodash': '^4.0.0' },
        devDependencies: { 'jest': '^29.0.0' },
      };
      const merged = TechStackDetector._allDeps(pkg);
      expect(merged['lodash']).toBeDefined();
      expect(merged['jest']).toBeDefined();
    });

    it('_detectNodeFramework identifies react, express, fastify, nestjs', () => {
      expect(TechStackDetector._detectNodeFramework({ dependencies: { react: '18' } })).toBe('react');
      expect(TechStackDetector._detectNodeFramework({ dependencies: { next: '14' } })).toBe('react');
      expect(TechStackDetector._detectNodeFramework({ dependencies: { express: '4' } })).toBe('express');
      expect(TechStackDetector._detectNodeFramework({ dependencies: { fastify: '4' } })).toBe('fastify');
      expect(TechStackDetector._detectNodeFramework({ dependencies: { '@nestjs/core': '10' } })).toBe('nestjs');
      expect(TechStackDetector._detectNodeFramework({})).toBe('unknown');
    });

    it('_detectNodeFramework checks devDependencies', () => {
      const pkg = { devDependencies: { react: '18' } };
      expect(TechStackDetector._detectNodeFramework(pkg)).toBe('react');
    });

    it('_buildNodeTestCommand returns correct commands', () => {
      expect(TechStackDetector._buildNodeTestCommand('vitest')).toBe('npx vitest run');
      expect(TechStackDetector._buildNodeTestCommand('jest')).toBe('npx jest');
      expect(TechStackDetector._buildNodeTestCommand('mocha')).toBe('npx mocha');
      expect(TechStackDetector._buildNodeTestCommand('unknown')).toBe('npm test');
    });

    it('_buildPythonTestCommand returns correct commands', () => {
      expect(TechStackDetector._buildPythonTestCommand('pytest')).toBe('pytest');
      expect(TechStackDetector._buildPythonTestCommand('unittest')).toBe('python -m unittest discover');
    });
  });
});
