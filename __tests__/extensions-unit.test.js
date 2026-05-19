const fs = require('fs');
const path = require('path');
const os = require('os');
const { ExtensionsCommand } = require('../src/cli/commands/extensions');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ext-'));
}

function makeProject(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(stdd, { recursive: true });
  return stdd;
}

function makeExtension(root, name, manifest = {}) {
  const dir = path.join(root, 'ext-src', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'extension.json'), JSON.stringify({
    name,
    version: '1.0.0',
    description: `Test extension ${name}`,
    ...manifest,
  }));
  return dir;
}

describe('ExtensionsCommand', () => {
  let cmd;
  let logSpy;

  beforeEach(() => {
    cmd = new ExtensionsCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  describe('execute routing', () => {
    it('defaults to list action', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      const result = cmd.execute();

      expect(result).toBeDefined();
      expect(result.extensions).toEqual([]);
    });

    it('routes to validate action', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      const result = cmd.execute('validate', ['stdd/extensions']);

      expect(result).toBeDefined();
    });

    it('routes to install action', () => {
      const root = makeTmp();
      makeProject(root);
      makeExtension(root, 'my-ext');
      cmd = new ExtensionsCommand(root);

      const result = cmd.execute('install', [path.join('ext-src', 'my-ext')]);

      expect(result.status).toBe('installed');
      expect(result.extension).toBe('my-ext');
    });
  });

  describe('list', () => {
    it('shows empty extensions', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      cmd.list({});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No extensions');
    });

    it('lists registered extensions', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      // Install first
      makeExtension(root, 'listed-ext');
      cmd.install(path.join('ext-src', 'listed-ext'));

      logSpy.mockClear();
      cmd.list({});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('listed-ext');
    });

    it('outputs JSON', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      cmd.list({ json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json.extensions).toBeDefined();
    });
  });

  describe('install', () => {
    it('throws when source missing', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      expect(() => cmd.install()).toThrow('Extension source is required');
    });

    it('throws when source path does not exist', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      expect(() => cmd.install('nonexistent')).toThrow('Extension source not found');
    });

    it('installs extension and updates catalog', () => {
      const root = makeTmp();
      makeProject(root);
      makeExtension(root, 'install-test');
      cmd = new ExtensionsCommand(root);

      const result = cmd.install(path.join('ext-src', 'install-test'));

      expect(result.status).toBe('installed');
      expect(result.extension).toBe('install-test');

      const catalog = cmd.ensureCatalog();
      expect(catalog.extensions.some(e => e.name === 'install-test')).toBe(true);
    });

    it('overwrites existing extension on reinstall', () => {
      const root = makeTmp();
      makeProject(root);
      makeExtension(root, 're-ext');
      cmd = new ExtensionsCommand(root);

      cmd.install(path.join('ext-src', 're-ext'));
      cmd.install(path.join('ext-src', 're-ext'));

      const catalog = cmd.ensureCatalog();
      const count = catalog.extensions.filter(e => e.name === 're-ext').length;
      expect(count).toBe(1);
    });

    it('works without extension.json manifest', () => {
      const root = makeTmp();
      makeProject(root);
      const dir = path.join(root, 'no-manifest');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.js'), '// plugin');

      cmd = new ExtensionsCommand(root);
      const result = cmd.install('no-manifest');

      expect(result.extension).toBe('no-manifest');
    });

    it('outputs JSON when option set', () => {
      const root = makeTmp();
      makeProject(root);
      makeExtension(root, 'json-ext');
      cmd = new ExtensionsCommand(root);

      cmd.install(path.join('ext-src', 'json-ext'), { json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('installed');
    });
  });

  describe('validate', () => {
    it('passes for valid manifests', () => {
      const root = makeTmp();
      makeProject(root);
      const extDir = path.join(root, 'stdd', 'extensions', 'my-ext');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'extension.json'), JSON.stringify({
        name: 'valid-ext',
        version: '1.0.0',
      }));
      cmd = new ExtensionsCommand(root);

      const result = cmd.validate('stdd/extensions');

      expect(result.status).toBe('pass');
      expect(result.manifests).toBe(1);
    });

    it('fails for missing name', () => {
      const root = makeTmp();
      makeProject(root);
      const extDir = path.join(root, 'stdd', 'extensions', 'bad');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'extension.json'), JSON.stringify({
        version: '1.0.0',
      }));
      cmd = new ExtensionsCommand(root);

      const result = cmd.validate('stdd/extensions');

      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles invalid JSON', () => {
      const root = makeTmp();
      makeProject(root);
      const extDir = path.join(root, 'stdd', 'extensions', 'badjson');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'extension.json'), '{bad}');
      cmd = new ExtensionsCommand(root);

      const result = cmd.validate('stdd/extensions');

      expect(result.status).toBe('fail');
    });

    it('handles nonexistent target', () => {
      const root = makeTmp();
      makeProject(root);
      cmd = new ExtensionsCommand(root);

      const result = cmd.validate('nonexistent');

      expect(result.status).toBe('pass');
      expect(result.manifests).toBe(0);
    });
  });

  describe('publish', () => {
    it('packages valid extension', () => {
      const root = makeTmp();
      makeProject(root);
      const extDir = path.join(root, 'stdd', 'extensions', 'pub');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'extension.json'), JSON.stringify({
        name: 'pub-ext',
        version: '1.0.0',
      }));
      cmd = new ExtensionsCommand(root);

      const result = cmd.publish('stdd/extensions');

      expect(result.status).toBe('packaged');
    });
  });

  describe('validateExtensionName', () => {
    it('rejects empty name', () => {
      expect(() => cmd.install()).toThrow('Extension source is required');
    });

    it('validates via install rejecting path traversal', () => {
      const root = makeTmp();
      makeProject(root);
      const dir = path.join(root, 'bad-name');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'extension.json'), JSON.stringify({ name: '../evil' }));
      cmd = new ExtensionsCommand(root);

      expect(() => cmd.install('bad-name')).toThrow();
    });

    it('rejects names with special characters', () => {
      const root = makeTmp();
      makeProject(root);
      const dir = path.join(root, 'spec-name');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'extension.json'), JSON.stringify({ name: 'bad name!' }));
      cmd = new ExtensionsCommand(root);

      expect(() => cmd.install('spec-name')).toThrow('Invalid extension name');
    });
  });
});
