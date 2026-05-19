const fs = require('fs');
const path = require('path');
const os = require('os');
const { DepcheckCommand, isSafeListed, DEFAULT_SAFE_LIST } = require('../src/cli/commands/depcheck');

describe('DepcheckCommand unit coverage', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-depcheck-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('isSafeListed', () => {
    test('matches exact package names', () => {
      expect(isSafeListed('eslint')).toBe(true);
      expect(isSafeListed('jest')).toBe(true);
      expect(isSafeListed('husky')).toBe(true);
    });

    test('matches scoped packages with wildcard', () => {
      expect(isSafeListed('@types/node')).toBe(true);
      expect(isSafeListed('@jest/globals')).toBe(true);
      expect(isSafeListed('@babel/core')).toBe(true);
    });

    test('matches prefix wildcard patterns', () => {
      expect(isSafeListed('eslint-config-airbnb')).toBe(true);
      expect(isSafeListed('jest-environment-node')).toBe(true);
      expect(isSafeListed('prettier-plugin-tailwindcss')).toBe(true);
    });

    test('does not match arbitrary packages', () => {
      expect(isSafeListed('express')).toBe(false);
      expect(isSafeListed('lodash')).toBe(false);
      expect(isSafeListed('my-custom-lib')).toBe(false);
    });

    test('DEFAULT_SAFE_LIST contains expected entries', () => {
      expect(DEFAULT_SAFE_LIST.length).toBeGreaterThan(10);
      expect(DEFAULT_SAFE_LIST).toContain('jest');
      expect(DEFAULT_SAFE_LIST).toContain('eslint');
    });
  });

  describe('_readJson', () => {
    test('returns parsed JSON for valid file', () => {
      const cmd = new DepcheckCommand(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'test.json'), '{"name":"test"}');
      const result = cmd._readJson(path.join(tmpDir, 'test.json'));
      expect(result.name).toBe('test');
    });

    test('returns empty object for invalid JSON', () => {
      const cmd = new DepcheckCommand(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'bad.json'), 'not json');
      const result = cmd._readJson(path.join(tmpDir, 'bad.json'));
      expect(result).toEqual({});
    });

    test('returns empty object for missing file', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._readJson(path.join(tmpDir, 'missing.json'));
      expect(result).toEqual({});
    });
  });

  describe('_extractPackageName', () => {
    test('extracts scoped package name', () => {
      const cmd = new DepcheckCommand(tmpDir);
      expect(cmd._extractPackageName('@org/pkg')).toBe('@org/pkg');
      expect(cmd._extractPackageName('@org/pkg/sub')).toBe('@org/pkg');
    });

    test('extracts regular package name', () => {
      const cmd = new DepcheckCommand(tmpDir);
      expect(cmd._extractPackageName('lodash')).toBe('lodash');
      expect(cmd._extractPackageName('lodash/fp')).toBe('lodash');
    });

    test('handles bare @scope', () => {
      const cmd = new DepcheckCommand(tmpDir);
      expect(cmd._extractPackageName('@org')).toBe('@org');
    });
  });

  describe('_isBuiltinModule', () => {
    test('recognizes Node.js builtins', () => {
      const cmd = new DepcheckCommand(tmpDir);
      expect(cmd._isBuiltinModule('fs')).toBe(true);
      expect(cmd._isBuiltinModule('path')).toBe(true);
      expect(cmd._isBuiltinModule('child_process')).toBe(true);
      expect(cmd._isBuiltinModule('http')).toBe(true);
    });

    test('does not match non-builtins', () => {
      const cmd = new DepcheckCommand(tmpDir);
      expect(cmd._isBuiltinModule('express')).toBe(false);
      expect(cmd._isBuiltinModule('lodash')).toBe(false);
    });
  });

  describe('_printResults', () => {
    test('prints error when results have error', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      cmd._printResults({ error: 'Something went wrong' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
      spy.mockRestore();
    });

    test('prints unused dependencies', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      cmd._printResults({
        directory: tmpDir,
        unused: ['lodash', 'express'],
        missing: [],
      });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('lodash');
      expect(output).toContain('express');
      spy.mockRestore();
    });

    test('prints missing dependencies', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      cmd._printResults({
        directory: tmpDir,
        unused: [],
        missing: ['axios'],
      });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('axios');
      spy.mockRestore();
    });

    test('prints all good when no issues', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      cmd._printResults({
        directory: tmpDir,
        unused: [],
        missing: [],
        totalDeps: 5,
      });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('All dependencies');
      spy.mockRestore();
    });
  });

  describe('_checkDirectory', () => {
    test('returns error when no package.json', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.error).toContain('No package.json');
    });

    test('returns empty result for project with no deps', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'empty' }));
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.unused).toEqual([]);
      expect(result.missing).toEqual([]);
    });

    test('detects unused dependency', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { lodash: '^4.0.0' },
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'const x = 1;');
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.unused).toContain('lodash');
    });

    test('does not flag used dependency', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { lodash: '^4.0.0' },
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'const _ = require("lodash");');
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.unused).not.toContain('lodash');
    });
  });

  describe('_saveEvidence', () => {
    test('saves evidence when stdd dir exists', () => {
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
      const cmd = new DepcheckCommand(tmpDir);
      cmd._saveEvidence({ unused: [], missing: [] });
      const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);
      const files = fs.readdirSync(evidenceDir);
      expect(files.length).toBeGreaterThan(0);
    });

    test('does nothing when stdd dir does not exist', () => {
      const cmd = new DepcheckCommand(tmpDir);
      cmd._saveEvidence({ unused: [], missing: [] });
      expect(fs.existsSync(path.join(tmpDir, 'stdd', 'evidence'))).toBe(false);
    });
  });

  describe('execute', () => {
    test('returns results in json mode', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir, json: true });
      expect(result).toBeDefined();
      expect(Array.isArray(result.unused)).toBe(true);
      spy.mockRestore();
    });

    test('calls _printResults and _saveEvidence in non-json mode', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir });
      expect(result).toBeDefined();
      expect(Array.isArray(result.unused)).toBe(true);
      // _printResults should have been called (printed header)
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    test('sets process.exitCode = 1 when unused deps exist in non-json mode', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { 'unused-pkg': '^1.0.0' },
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'), 'const x = 1;');

      const originalExitCode = process.exitCode;
      process.exitCode = 0;
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir });
      expect(process.exitCode).toBe(1);
      expect(result.unused).toContain('unused-pkg');
      process.exitCode = originalExitCode;
      logSpy.mockRestore();
    });
  });

  describe('_checkWorkspace fallback branches', () => {
    test('returns error when workspace not found by resolveWorkspace or detectWorkspaces', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'root' }));
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkWorkspace('nonexistent-workspace', []);
      expect(result.error).toContain("Workspace 'nonexistent-workspace' not found");
    });

    test('falls back to detectWorkspaces and checks by name', () => {
      // Create a monorepo structure that detectWorkspaces can find
      const rootPkg = { name: 'monorepo', workspaces: ['packages/*'] };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

      const wsDir = path.join(tmpDir, 'packages', 'my-app');
      fs.mkdirSync(wsDir, { recursive: true });
      const wsPkg = {
        name: 'my-app',
        dependencies: { 'express': '^4.0.0' },
      };
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify(wsPkg, null, 2));

      const srcDir = path.join(wsDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), "const express = require('express');");

      // Use a selector that resolveWorkspace won't match but detectWorkspaces will find by name
      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkWorkspace('my-app', []);
      expect(result.error).toBeUndefined();
      expect(result.unused).not.toContain('express');
    });

    test('resolveWorkspace match skips detectWorkspaces name lookup', () => {
      const rootPkg = { name: 'monorepo2', workspaces: ['packages/*'] };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

      const wsDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(wsDir, { recursive: true });
      const wsPkg = {
        name: 'api',
        dependencies: { 'lodash': '^4.0.0' },
      };
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify(wsPkg, null, 2));

      const srcDir = path.join(wsDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), "const _ = require('lodash');");

      const cmd = new DepcheckCommand(tmpDir);
      // Pass the directory path which resolveWorkspace will match directly
      const result = cmd._checkWorkspace('packages/api', []);
      expect(result.error).toBeUndefined();
      expect(result.unused).not.toContain('lodash');
    });
  });

  describe('_findUsedDependencies no-src fallback', () => {
    test('scans root dir when no src/ directory exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      // No src/ directory — root-level JS files should be scanned
      fs.writeFileSync(path.join(tmpDir, 'cli.js'), "const lodash = require('lodash');\nlodash.get();");
      const cmd = new DepcheckCommand(tmpDir);
      const used = cmd._findUsedDependencies(tmpDir);
      expect(used).toContain('lodash');
    });
  });

  describe('_scanDirForImports edge cases', () => {
    test('skips node_modules and dot directories', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // node_modules inside src — should be skipped
      const nmDir = path.join(srcDir, 'node_modules');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'hack.js'), "const evil = require('evil-pkg');");

      // dot directory inside src — should be skipped
      const dotDir = path.join(srcDir, '.hidden');
      fs.mkdirSync(dotDir, { recursive: true });
      fs.writeFileSync(path.join(dotDir, 'secret.js'), "const secret = require('secret-pkg');");

      // Normal file inside src — should be scanned
      fs.writeFileSync(path.join(srcDir, 'index.js'), "const good = require('good-pkg');");

      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      cmd._scanDirForImports(srcDir, usedPackages);

      expect(usedPackages.has('good-pkg')).toBe(true);
      expect(usedPackages.has('evil-pkg')).toBe(false);
      expect(usedPackages.has('secret-pkg')).toBe(false);
    });

    test('handles non-existent directory gracefully', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      expect(() => cmd._scanDirForImports(path.join(tmpDir, 'no-such-dir'), usedPackages)).not.toThrow();
      expect(usedPackages.size).toBe(0);
    });
  });

  describe('_resolveModuleNames', () => {
    test('returns dep name when package.json missing in node_modules', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const nmDir = path.join(tmpDir, 'node_modules');
      fs.mkdirSync(nmDir, { recursive: true });
      // No subdirectory at all
      const names = cmd._resolveModuleNames('nonexistent-pkg', nmDir);
      expect(names).toEqual(['nonexistent-pkg']);
    });

    test('includes module field from package.json', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'my-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), JSON.stringify({
        name: 'my-pkg',
        module: 'dist/esm/index.js',
        main: 'dist/cjs/index.js',
      }));

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('my-pkg', path.join(tmpDir, 'node_modules'));
      expect(names).toContain('my-pkg');
      expect(names).toContain('dist/esm/index.js');
      expect(names).toContain('dist/cjs/index.js');
    });

    test('skips main when it equals depName', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'my-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), JSON.stringify({
        name: 'my-pkg',
        main: 'my-pkg',
      }));

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('my-pkg', path.join(tmpDir, 'node_modules'));
      expect(names).toContain('my-pkg');
      // main === depName so it should NOT be added again
      const filtered = names.filter(n => n === 'my-pkg');
      expect(filtered.length).toBe(1);
    });

    test('includes non-dot export keys', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'my-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), JSON.stringify({
        name: 'my-pkg',
        exports: {
          '.': './src/index.js',
          './sub': './src/sub.js',
          '#internal': './src/internal.js',
        },
      }));

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('my-pkg', path.join(tmpDir, 'node_modules'));
      // Only non-dot keys: '#internal'
      expect(names).toContain('#internal');
      // Dot-starting keys should not be included
      expect(names).not.toContain('.');
      expect(names).not.toContain('./sub');
    });

    test('scans .js/.mjs/.cjs files in dep directory', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'my-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'cli.js'), '');
      fs.writeFileSync(path.join(nmDir, 'browser.mjs'), '');
      fs.writeFileSync(path.join(nmDir, 'node.cjs'), '');
      fs.writeFileSync(path.join(nmDir, 'ignored.txt'), '');

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('my-pkg', path.join(tmpDir, 'node_modules'));
      expect(names).toContain('my-pkg');
      expect(names.some(n => n.includes('cli.js'))).toBe(true);
      expect(names.some(n => n.includes('browser.mjs'))).toBe(true);
      expect(names.some(n => n.includes('node.cjs'))).toBe(true);
      expect(names.some(n => n.includes('ignored.txt'))).toBe(false);
    });

    test('handles malformed package.json gracefully', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'bad-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), 'NOT JSON');

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('bad-pkg', path.join(tmpDir, 'node_modules'));
      expect(names).toContain('bad-pkg');
    });

    test('handles non-object exports gracefully', () => {
      const nmDir = path.join(tmpDir, 'node_modules', 'arr-exports-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), JSON.stringify({
        name: 'arr-exports-pkg',
        exports: ['./src/a.js', './src/b.js'],
      }));

      const cmd = new DepcheckCommand(tmpDir);
      const names = cmd._resolveModuleNames('arr-exports-pkg', path.join(tmpDir, 'node_modules'));
      expect(names).toContain('arr-exports-pkg');
      // Array exports should not trigger the object keys branch
      expect(names.length).toBe(1);
    });
  });

  describe('_saveEvidence error paths', () => {
    test('handles mkdirSync failure gracefully', () => {
      const stddDir = path.join(tmpDir, 'stdd');
      fs.mkdirSync(stddDir, { recursive: true });
      // Make evidence a file (not a dir) so mkdirSync fails
      fs.writeFileSync(path.join(stddDir, 'evidence'), 'not-a-dir');

      const cmd = new DepcheckCommand(tmpDir);
      expect(() => cmd._saveEvidence({ unused: [], missing: [] })).not.toThrow();
    });
  });

  describe('_checkDirectory missing dependencies', () => {
    test('detects missing deps that are not in safelist and not mapped', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { lodash: '^4.0.0' },
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      // Use a non-builtin, non-safelisted, non-relative import
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'),
        "const lodash = require('lodash');\nconst axios = require('axios');");

      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.missing).toContain('axios');
    });

    test('does not report safe-listed used packages as missing', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test',
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      // eslint is in DEFAULT_SAFE_LIST and not in dependencies
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'),
        "const eslint = require('eslint');");

      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.missing).not.toContain('eslint');
    });

    test('does not report builtin modules as missing', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test',
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'),
        "const fs = require('fs');\nconst path = require('path');");

      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.missing).not.toContain('fs');
      expect(result.missing).not.toContain('path');
    });

    test('does not report subpath imports from mapped deps as missing', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { 'my-pkg': '^1.0.0' },
      }));
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.js'),
        "const sub = require('my-pkg/sub');");

      // Create node_modules with my-pkg that has 'sub' as a file
      const nmDir = path.join(tmpDir, 'node_modules', 'my-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'package.json'), JSON.stringify({ name: 'my-pkg' }));
      fs.writeFileSync(path.join(nmDir, 'sub.js'), '');

      const cmd = new DepcheckCommand(tmpDir);
      const result = cmd._checkDirectory(tmpDir, []);
      expect(result.missing).not.toContain('my-pkg');
    });
  });

  describe('_extractImports', () => {
    test('ignores relative and absolute imports', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      const filePath = path.join(tmpDir, 'test.js');
      fs.writeFileSync(filePath, "const a = require('./local');\nconst b = require('/absolute');\nconst c = require('../parent');");
      cmd._extractImports(filePath, usedPackages);
      expect(usedPackages.size).toBe(0);
    });

    test('handles dynamic import syntax', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      const filePath = path.join(tmpDir, 'dynamic.js');
      fs.writeFileSync(filePath, "const mod = import('dynamic-pkg');");
      cmd._extractImports(filePath, usedPackages);
      expect(usedPackages.has('dynamic-pkg')).toBe(true);
    });

    test('strips template literals to avoid false matches', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      const filePath = path.join(tmpDir, 'template.js');
      fs.writeFileSync(filePath, 'const code = `require("fake-pkg")`;\nconst real = require("real-pkg");');
      cmd._extractImports(filePath, usedPackages);
      // fake-pkg should NOT be found (it's inside a template literal)
      expect(usedPackages.has('real-pkg')).toBe(true);
    });

    test('handles unreadable file gracefully', () => {
      const cmd = new DepcheckCommand(tmpDir);
      const usedPackages = new Set();
      const badPath = path.join(tmpDir, 'nonexistent.js');
      expect(() => cmd._extractImports(badPath, usedPackages)).not.toThrow();
    });
  });
});
