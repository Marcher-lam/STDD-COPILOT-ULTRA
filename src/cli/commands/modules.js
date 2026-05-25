// ─── Modules Command ───
// Convenience wrapper with marketplace-focused interface.
// Delegates to ExtensionsCommand and ModuleRegistry.

const { ExtensionsCommand } = require('./extensions');
const { ModuleRegistry } = require('../../config/module-registry');

class ModulesCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.extensions = new ExtensionsCommand(cwd);
    this.registry = new ModuleRegistry();
  }

  /**
   * Execute a modules marketplace action.
   *
   * @param {string} action  - featured | search | install | list | info | publish | categories
   * @param {Array}  args    - Positional arguments
   * @param {object} options - CLI flags (--json, --category, etc.)
   * @returns {object} Result data
   */
  async execute(action = 'featured', args = [], options = {}) {
    switch (action) {
      case 'featured': return this.featured(options);
      case 'search':   return this.extensions.search(args[0], options);
      case 'install':  return this.extensions.install(args[0], options);
      case 'list':     return this.list(options);
      case 'info':     return this.extensions.info(args[0], options);
      case 'publish':  return this.extensions.publish(args[0], options);
      case 'categories': return this.categories(options);
      default:
        throw new Error(`Unknown modules action: ${action}. Supported: featured, search, install, list, info, publish, categories.`);
    }
  }

  /** Show curated/official modules from catalog. */
  featured(options = {}) {
    const mods = this.registry.getOfficialModules({ catalogPath: this.extensions.catalogPath() });
    if (options.json) {
      console.log(JSON.stringify({ featured: mods }, null, 2));
    } else {
      console.log('\nSTDD Official Modules\n');
      if (!mods.length) {
        console.log('  No official modules available.');
      } else {
        for (const m of mods) {
          console.log(`  ${m.name} v${m.version || '?'} — ${m.description || ''}`);
          console.log(`    category: ${m.category || 'uncategorized'}  keywords: ${(m.keywords || []).join(', ')}`);
        }
      }
      console.log('');
    }
    return { featured: mods };
  }

  /** List all installed modules from catalog. */
  list(options = {}) {
    const catalog = this.extensions.ensureCatalog();
    const installed = catalog.extensions.filter(ext => ext.installedAt);
    if (options.json) {
      console.log(JSON.stringify({ installed }, null, 2));
    } else {
      console.log('\nInstalled Modules\n');
      if (!installed.length) {
        console.log('  No modules installed.');
      } else {
        for (const m of installed) {
          console.log(`  ${m.name} v${m.version || '?'} — ${m.description || ''}`);
        }
      }
      console.log('');
    }
    return { installed };
  }

  /** List all available categories from catalog. */
  categories(options = {}) {
    const cats = this.registry.listCategories({ catalogPath: this.extensions.catalogPath() });
    if (options.json) {
      console.log(JSON.stringify({ categories: cats }, null, 2));
    } else {
      console.log('\nModule Categories\n');
      if (!cats.length) {
        console.log('  No categories found.');
      } else {
        for (const c of cats) {
          console.log(`  - ${c}`);
        }
      }
      console.log('');
    }
    return { categories: cats };
  }
}

module.exports = { ModulesCommand };
