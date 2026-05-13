const fs = require('fs');
const path = require('path');
const { ensureInsideDir } = require('../../utils/change-utils');

function validateExtensionName(name) {
  if (!name || typeof name !== 'string') throw new Error('Extension manifest name is required.');
  if (name.length > 128) throw new Error(`Invalid extension name '${name}': maximum length is 128 characters.`);
  if (name !== path.basename(name)) throw new Error(`Invalid extension name '${name}': must not contain path separators.`);
  if (/\.\./.test(name)) throw new Error(`Invalid extension name '${name}': path traversal not allowed.`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    throw new Error(`Invalid extension name '${name}': only alphanumeric, hyphens, underscores, and dots are allowed.`);
  }
}

class ExtensionsCommand {
  constructor(cwd = process.cwd()) { this.cwd = cwd; }

  execute(action = 'list', args = [], options = {}) {
    if (action === 'install') return this.install(args[0], options);
    if (action === 'validate') return this.validate(args[0], options);
    if (action === 'publish') return this.publish(args[0], options);
    return this.list(options);
  }

  catalogPath() { return path.join(this.cwd, 'stdd', 'extensions', 'catalog.json'); }
  installedDir() { return path.join(this.cwd, 'stdd', 'extensions', 'installed'); }

  ensureCatalog() {
    const file = this.catalogPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ extensions: [] }, null, 2), 'utf8');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  list(options = {}) {
    const catalog = this.ensureCatalog();
    if (options.json) console.log(JSON.stringify(catalog, null, 2));
    else {
      console.log('\nSTDD Extensions\n');
      if (!catalog.extensions.length) console.log('  No extensions registered.');
      for (const ext of catalog.extensions) console.log(`  ${ext.name} ${ext.version || ''} - ${ext.description || ''}`);
      console.log('');
    }
    return catalog;
  }

  install(source, options = {}) {
    if (!source) throw new Error('Extension source is required.');
    const sourcePath = path.resolve(this.cwd, source);
    if (!fs.existsSync(sourcePath)) throw new Error(`Extension source not found: ${source}`);
    const manifestPath = path.join(sourcePath, 'extension.json');
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : { name: path.basename(sourcePath), version: '0.0.0', description: 'Local extension' };
    validateExtensionName(manifest.name);
    const installedDir = this.installedDir();
    const target = ensureInsideDir(installedDir, path.join(installedDir, manifest.name), 'extension install path');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(sourcePath, target, { recursive: true });
    const catalog = this.ensureCatalog();
    catalog.extensions = catalog.extensions.filter(ext => ext.name !== manifest.name);
    catalog.extensions.push({ ...manifest, installedAt: new Date().toISOString(), path: path.relative(this.cwd, target) });
    fs.writeFileSync(this.catalogPath(), JSON.stringify(catalog, null, 2), 'utf8');
    if (options.json) console.log(JSON.stringify({ status: 'installed', extension: manifest.name }, null, 2));
    else console.log(`Installed extension: ${manifest.name}`);
    return { status: 'installed', extension: manifest.name };
  }

  validate(target, options = {}) {
    const targetPath = path.resolve(this.cwd, target || 'stdd/extensions');
    const manifests = [];
    this.walk(targetPath, file => { if (path.basename(file) === 'extension.json') manifests.push(file); });
    const errors = [];
    for (const file of manifests) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data.name) errors.push({ file, error: 'missing name' });
        if (!data.version) errors.push({ file, error: 'missing version' });
      } catch (error) {
        errors.push({ file, error: error.message });
      }
    }
    const result = { status: errors.length ? 'fail' : 'pass', manifests: manifests.length, errors };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(errors.length ? `Extension validation failed: ${errors.length} error(s)` : `Validated ${manifests.length} extension manifest(s).`);
    if (errors.length) process.exitCode = 1;
    return result;
  }

  publish(target, options = {}) {
    const result = this.validate(target, { json: false });
    if (result.status !== 'pass') return result;
    const packagePath = path.join(this.cwd, 'stdd', 'extensions', `publish-${Date.now()}.json`);
    fs.writeFileSync(packagePath, JSON.stringify({ target: target || 'stdd/extensions', createdAt: new Date().toISOString() }, null, 2), 'utf8');
    if (options.json) console.log(JSON.stringify({ status: 'packaged', path: packagePath }, null, 2));
    else console.log(`Extension package manifest: ${path.relative(this.cwd, packagePath)}`);
    return { status: 'packaged', path: packagePath };
  }

  walk(dir, visit) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) this.walk(fullPath, visit);
      else if (entry.isFile()) visit(fullPath);
    }
  }
}

module.exports = { ExtensionsCommand };
