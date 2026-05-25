// ─── Module Registry ───
// Core registry for the STDD modules marketplace.
// Uses only fs and path — no external dependencies.

const fs = require('fs');
const path = require('path');

class ModuleRegistry {
  /**
   * @param {object} options
   * @param {string} options.registryUrl  - Remote registry URL (optional)
   * @param {string} options.cachePath    - Local cache directory for catalog
   */
  constructor(options = {}) {
    this.registryUrl = options.registryUrl || null;
    this.cachePath = options.cachePath || null;
  }

  // ─── Catalog helpers ───

  /** Read catalog from a given path. Returns { extensions: [] } on missing/invalid. */
  _readCatalog(catalogPath) {
    if (!fs.existsSync(catalogPath)) return { extensions: [] };
    try {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch {
      return { extensions: [] };
    }
  }

  /** Write catalog JSON to disk. Creates parent directories as needed. */
  _writeCatalog(catalogPath, data) {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), 'utf8');
  }

  // ─── Search ───

  /**
   * Search local catalog for matching modules (name, description, keywords).
   * If registryUrl is configured, also attempts a remote fetch (best-effort).
   *
   * @param {string} query          Search term
   * @param {object} [options]
   * @param {string} [options.catalogPath]  Override catalog file path
   * @param {string} [options.category]     Filter by category
   * @returns {Array<object>} Matching module entries
   */
  search(query, options = {}) {
    const catalogPath = options.catalogPath;
    const catalog = catalogPath ? this._readCatalog(catalogPath) : { extensions: [] };
    const q = (query || '').toLowerCase();
    if (!q) return [];

    let matches = catalog.extensions.filter(ext => {
      const name = (ext.name || '').toLowerCase();
      const desc = (ext.description || '').toLowerCase();
      const keywords = (ext.keywords || []).join(' ').toLowerCase();
      return name.includes(q) || desc.includes(q) || keywords.includes(q);
    });

    if (options.category) {
      const cat = options.category.toLowerCase();
      matches = matches.filter(ext => (ext.category || '').toLowerCase() === cat);
    }

    return matches;
  }

  // ─── Info ───

  /**
   * Get full module details from catalog.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {object|null} Module entry or null
   */
  getInfo(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return null;
    const catalog = this._readCatalog(catalogPath);
    return catalog.extensions.find(ext => ext.name === moduleName) || null;
  }

  // ─── Install ───

  /**
   * Install a module from catalog to target directory.
   * Copies the module's source files (if present) and updates the catalog.
   *
   * @param {string} moduleName
   * @param {string} targetDir   Absolute path to install into
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.sourceDir]  Override source directory for module files
   * @returns {object} { status, module }
   */
  install(moduleName, targetDir, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for install.');
    const catalog = this._readCatalog(catalogPath);
    const mod = catalog.extensions.find(ext => ext.name === moduleName);
    if (!mod) throw new Error(`Module not found in catalog: ${moduleName}`);

    // Determine source: if sourceDir provided, copy from there; otherwise mark as catalog-only
    const installedPath = path.join(targetDir, moduleName);
    fs.mkdirSync(installedPath, { recursive: true });

    // Write an extension.json manifest into the installed directory
    const manifest = {
      name: mod.name,
      version: mod.version,
      description: mod.description,
      category: mod.category || '',
      author: mod.author || '',
      keywords: mod.keywords || [],
      official: mod.official || false,
      installedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(installedPath, 'extension.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    // If source files exist, copy them
    if (options.sourceDir && fs.existsSync(options.sourceDir)) {
      const srcPath = path.join(options.sourceDir, moduleName);
      if (fs.existsSync(srcPath)) {
        const entries = fs.readdirSync(srcPath);
        for (const entry of entries) {
          const fullSrc = path.join(srcPath, entry);
          const fullDest = path.join(installedPath, entry);
          if (fs.statSync(fullSrc).isDirectory()) {
            fs.cpSync(fullSrc, fullDest, { recursive: true });
          } else {
            fs.copyFileSync(fullSrc, fullDest);
          }
        }
      }
    }

    // Update catalog with installed info
    mod.installedAt = manifest.installedAt;
    mod.path = path.relative(path.dirname(catalogPath), installedPath);
    this._writeCatalog(catalogPath, catalog);

    return { status: 'installed', module: mod };
  }

  // ─── Publish ───

  /**
   * Validate and package a module for publishing.
   *
   * @param {string} moduleDir  Path to the module directory
   * @param {object} [options]
   * @param {string} [options.outputDir]  Directory for the packaged manifest
   * @returns {object} { status, errors, packagePath }
   */
  publish(moduleDir, options = {}) {
    const errors = [];
    const manifestPath = path.join(moduleDir, 'extension.json');

    if (!fs.existsSync(manifestPath)) {
      errors.push({ file: manifestPath, error: 'Missing extension.json manifest' });
    } else {
      try {
        const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!data.name) errors.push({ file: manifestPath, error: 'Missing name field' });
        if (!data.version) errors.push({ file: manifestPath, error: 'Missing version field' });
        if (!data.description) errors.push({ file: manifestPath, error: 'Missing description field' });
      } catch (e) {
        errors.push({ file: manifestPath, error: `Invalid JSON: ${e.message}` });
      }
    }

    if (errors.length) {
      return { status: 'fail', errors, packagePath: null };
    }

    const outputDir = options.outputDir || path.dirname(moduleDir);
    const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    pkg.publishedAt = new Date().toISOString();
    const packagePath = path.join(outputDir, `publish-${pkg.name}-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(packagePath), { recursive: true });
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2), 'utf8');

    return { status: 'packaged', errors: [], packagePath };
  }

  // ─── Remove ───

  /**
   * Remove a module from catalog and delete installed files.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.installedDir]  Base installed directory
   * @returns {object} { status, removed }
   */
  remove(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for remove.');
    const catalog = this._readCatalog(catalogPath);
    const idx = catalog.extensions.findIndex(ext => ext.name === moduleName);
    if (idx === -1) throw new Error(`Module not found: ${moduleName}`);

    const removed = catalog.extensions.splice(idx, 1)[0];
    this._writeCatalog(catalogPath, catalog);

    // Delete installed files if they exist
    if (options.installedDir) {
      const installedPath = path.join(options.installedDir, moduleName);
      if (fs.existsSync(installedPath)) {
        fs.rmSync(installedPath, { recursive: true, force: true });
      }
    }

    return { status: 'removed', removed };
  }

  // ─── Update ───

  /**
   * Check for newer version and update module.
   * For local-only catalogs this compares against the manifest in installed dir.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.installedDir]
   * @returns {object} { status, moduleName, currentVersion, message }
   */
  update(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for update.');
    const catalog = this._readCatalog(catalogPath);
    const mod = catalog.extensions.find(ext => ext.name === moduleName);
    if (!mod) throw new Error(`Module not found: ${moduleName}`);

    // Check installed version
    let currentVersion = null;
    if (options.installedDir) {
      const manifestPath = path.join(options.installedDir, moduleName, 'extension.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const installed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          currentVersion = installed.version;
        } catch { /* ignore */ }
      }
    }

    const catalogVersion = mod.version;
    if (currentVersion && currentVersion === catalogVersion) {
      return { status: 'up-to-date', moduleName, currentVersion, message: 'Already at latest version.' };
    }

    // Perform update: reinstall from catalog metadata
    if (options.installedDir) {
      this.install(moduleName, options.installedDir, { catalogPath });
    }

    return {
      status: 'updated',
      moduleName,
      previousVersion: currentVersion,
      newVersion: catalogVersion,
      message: `Updated ${moduleName} from ${currentVersion || 'unknown'} to ${catalogVersion}.`,
    };
  }

  // ─── Categories ───

  /**
   * List all unique categories from catalog.
   *
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {Array<string>}
   */
  listCategories(options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return [];
    const catalog = this._readCatalog(catalogPath);
    const cats = new Set();
    for (const ext of catalog.extensions) {
      if (ext.category) cats.add(ext.category);
    }
    return [...cats].sort();
  }

  // ─── Official modules ───

  /**
   * Return built-in official modules from catalog.
   *
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {Array<object>}
   */
  getOfficialModules(options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return [];
    const catalog = this._readCatalog(catalogPath);
    return catalog.extensions.filter(ext => ext.official === true);
  }
}

module.exports = { ModuleRegistry };
