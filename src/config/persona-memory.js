/**
 * Persona Memory
 * Filesystem-backed persistent fact storage for agent personas.
 * Each persona's facts are stored in stdd/personas/{roleId}-facts.json.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STDD_DIR = path.join(process.cwd(), 'stdd');
const PERSONAS_DIR = 'personas';

class PersonaMemory {
  constructor(stddDir = DEFAULT_STDD_DIR) {
    this._stddDir = stddDir;
    this._personasDir = path.join(stddDir, PERSONAS_DIR);
    this._cache = new Map();
  }

  _ensureDir() {
    if (!fs.existsSync(this._personasDir)) {
      fs.mkdirSync(this._personasDir, { recursive: true });
    }
  }

  _factsPath(roleId) {
    return path.join(this._personasDir, `${roleId}-facts.json`);
  }

  /**
   * Load all facts for a persona from disk.
   * Returns an object of key-value pairs, or empty object if no file exists.
   */
  loadFacts(roleId) {
    if (this._cache.has(roleId)) {
      return this._cache.get(roleId);
    }

    const filePath = this._factsPath(roleId);
    if (!fs.existsSync(filePath)) {
      this._cache.set(roleId, {});
      return {};
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const facts = JSON.parse(raw);
      this._cache.set(roleId, facts);
      return facts;
    } catch {
      this._cache.set(roleId, {});
      return {};
    }
  }

  /**
   * Save or update a single fact for a persona.
   */
  saveFact(roleId, key, value) {
    const facts = this.loadFacts(roleId);
    facts[key] = {
      value,
      updatedAt: new Date().toISOString(),
    };

    this._ensureDir();
    const filePath = this._factsPath(roleId);
    fs.writeFileSync(filePath, JSON.stringify(facts, null, 2), 'utf8');
    this._cache.set(roleId, facts);
    return facts;
  }

  /**
   * Save multiple facts at once.
   */
  saveFacts(roleId, entries) {
    const facts = this.loadFacts(roleId);
    const timestamp = new Date().toISOString();

    for (const [key, value] of Object.entries(entries)) {
      facts[key] = { value, updatedAt: timestamp };
    }

    this._ensureDir();
    const filePath = this._factsPath(roleId);
    fs.writeFileSync(filePath, JSON.stringify(facts, null, 2), 'utf8');
    this._cache.set(roleId, facts);
    return facts;
  }

  /**
   * Recall context — returns facts formatted as a context string.
   */
  recallContext(roleId) {
    const facts = this.loadFacts(roleId);
    const entries = Object.entries(facts);
    if (entries.length === 0) return '';

    return entries
      .map(([key, { value, updatedAt }]) => `- ${key}: ${JSON.stringify(value)} (remembered ${updatedAt})`)
      .join('\n');
  }

  /**
   * Delete a single fact.
   */
  deleteFact(roleId, key) {
    const facts = this.loadFacts(roleId);
    if (!(key in facts)) return false;

    delete facts[key];
    this._ensureDir();
    const filePath = this._factsPath(roleId);

    if (Object.keys(facts).length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      this._cache.set(roleId, {});
    } else {
      fs.writeFileSync(filePath, JSON.stringify(facts, null, 2), 'utf8');
      this._cache.set(roleId, facts);
    }
    return true;
  }

  /**
   * Clear all facts for a persona.
   */
  clearFacts(roleId) {
    const filePath = this._factsPath(roleId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    this._cache.delete(roleId);
  }

  /**
   * List all personas that have stored facts.
   */
  listPersonasWithFacts() {
    if (!fs.existsSync(this._personasDir)) return [];

    return fs.readdirSync(this._personasDir)
      .filter((f) => f.endsWith('-facts.json'))
      .map((f) => f.replace('-facts.json', ''));
  }
}

module.exports = { PersonaMemory };
