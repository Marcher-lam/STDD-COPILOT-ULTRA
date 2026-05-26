/**
 * Skill Config Resolver
 * 3-layer override system for skill configuration:
 *   Base (SKILL.md frontmatter) → Team (stdd/config/skill-overrides.yaml) → User (~/.stdd/skill-overrides.yaml)
 *
 * Merge semantics:
 *   Scalars: user > team > base
 *   Objects: deep-merge
 *   Arrays: user appends to team, team appends to base
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const TEAM_OVERRIDES_FILE = 'skill-overrides.yaml';
const USER_OVERRIDES_DIR = path.join(os.homedir(), '.stdd');

class SkillConfigResolver {
  constructor(stddDir = null) {
    this._stddDir = stddDir;
    this._cache = new Map();
  }

  get stddDir() {
    if (!this._stddDir) {
      this._stddDir = path.join(process.cwd(), 'stdd');
    }
    return this._stddDir;
  }

  _teamOverridesPath() {
    return path.join(this.stddDir, 'config', TEAM_OVERRIDES_FILE);
  }

  _userOverridesPath() {
    return path.join(USER_OVERRIDES_DIR, TEAM_OVERRIDES_FILE);
  }

  /**
   * Resolve the final configuration for a skill by merging all 3 layers.
   * @param {string} skillId - The skill identifier
   * @param {object} baseConfig - The base config from SKILL.md frontmatter
   * @returns {object} The merged configuration
   */
  resolve(skillId, baseConfig = {}) {
    if (this._cache.has(skillId)) {
      return this._cache.get(skillId);
    }

    const teamConfig = this._loadLayer(this._teamOverridesPath(), skillId);
    const userConfig = this._loadLayer(this._userOverridesPath(), skillId);

    const result = this._deepMerge(baseConfig, teamConfig, userConfig);
    this._cache.set(skillId, result);
    return result;
  }

  /**
   * Override a configuration value at a specific layer.
   */
  override(skillId, key, value, layer = 'team') {
    const filePath = layer === 'user' ? this._userOverridesPath() : this._teamOverridesPath();
    const overrides = this._loadFile(filePath);

    if (!overrides[skillId]) overrides[skillId] = {};
    overrides[skillId][key] = value;

    this._writeFile(filePath, overrides);
    this._cache.delete(skillId); // Invalidate cache
    return overrides[skillId];
  }

  /**
   * List all overrides for a skill across all layers.
   */
  listOverrides(skillId) {
    const result = { base: {}, team: {}, user: {} };

    const teamConfig = this._loadLayer(this._teamOverridesPath(), skillId);
    const userConfig = this._loadLayer(this._userOverridesPath(), skillId);

    if (Object.keys(teamConfig).length > 0) result.team = teamConfig;
    if (Object.keys(userConfig).length > 0) result.user = userConfig;

    return result;
  }

  /**
   * Reset an override by removing it from the specified layer.
   */
  resetOverride(skillId, key, layer = 'team') {
    const filePath = layer === 'user' ? this._userOverridesPath() : this._teamOverridesPath();
    const overrides = this._loadFile(filePath);

    if (overrides[skillId] && overrides[skillId][key] !== undefined) {
      delete overrides[skillId][key];
      if (Object.keys(overrides[skillId]).length === 0) {
        delete overrides[skillId];
      }
      this._writeFile(filePath, overrides);
      this._cache.delete(skillId);
      return true;
    }
    return false;
  }

  _loadLayer(filePath, skillId) {
    const data = this._loadFile(filePath);
    return data[skillId] || {};
  }

  _loadFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return this._parseYAML(content);
    } catch {
      return {};
    }
  }

  _writeFile(filePath, data) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, this._stringifyYAML(data), 'utf8');
  }

  _parseYAML(content) {
    // Simple YAML parser supporting colon-in-skill-IDs and one level of nesting
    const result = {};
    let currentKey = null;
    let nestedKey = null;

    for (const line of content.split('\n')) {
      if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      // Top-level key (no indent)
      if (indent === 0 && /^[^\s]+:$/.test(trimmed)) {
        currentKey = trimmed.slice(0, -1);
        result[currentKey] = {};
        nestedKey = null;
        continue;
      }

      // 2-space indent: first-level property
      if (currentKey && indent === 2 && /^([a-zA-Z0-9_-]+):\s*(.*)?$/.test(trimmed)) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
        const [, key, value] = match;
        if (value && value.trim() !== '') {
          result[currentKey][key] = this._parseValue(value);
          nestedKey = null;
        } else {
          // Nested object start
          result[currentKey][key] = {};
          nestedKey = key;
        }
        continue;
      }

      // 4-space indent: second-level property (nested object)
      if (currentKey && nestedKey && indent === 4 && /^([a-zA-Z0-9_-]+):\s*(.*)?$/.test(trimmed)) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
        const [, key, value] = match;
        result[currentKey][nestedKey][key] = this._parseValue(value);
        continue;
      }
    }

    return result;
  }

  _parseValue(value) {
    if (!value || value.trim() === '') return true;
    const trimmed = value.trim();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    if (/^["']/.test(trimmed)) return trimmed.slice(1, -1);
    return trimmed;
  }

  _stringifyYAML(data) {
    const lines = [];
    for (const [key, value] of Object.entries(data)) {
      lines.push(`${key}:`);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [k, v] of Object.entries(value)) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            lines.push(`  ${k}:`);
            for (const [nk, nv] of Object.entries(v)) {
              lines.push(`    ${nk}: ${this._stringifyValue(nv)}`);
            }
          } else {
            lines.push(`  ${k}: ${this._stringifyValue(v)}`);
          }
        }
      } else {
        lines.push(`  _value: ${this._stringifyValue(value)}`);
      }
    }
    return lines.join('\n') + '\n';
  }

  _stringifyValue(value) {
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      if (/[:#\n]/.test(value)) return `"${value}"`;
      return value;
    }
    return String(value);
  }

  _deepMerge(base, ...layers) {
    let result = { ...base };
    for (const layer of layers) {
      result = this._mergeTwo(result, layer);
    }
    return result;
  }

  _mergeTwo(target, source) {
    if (!source || typeof source !== 'object') return target;

    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === 'object' && value !== null && !Array.isArray(value) &&
        typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
      ) {
        result[key] = this._mergeTwo(result[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

module.exports = { SkillConfigResolver };
