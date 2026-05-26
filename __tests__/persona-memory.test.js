const fs = require('fs');
const path = require('path');
const os = require('os');
const { PersonaMemory } = require('../src/config/persona-memory');

describe('PersonaMemory', () => {
  let tmpDir;
  let memory;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-persona-test-'));
    memory = new PersonaMemory(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadFacts', () => {
    it('returns empty object when no facts file exists', () => {
      const facts = memory.loadFacts('po');
      expect(facts).toEqual({});
    });

    it('returns cached facts on second call', () => {
      memory.saveFact('po', 'key1', 'val1');
      const facts1 = memory.loadFacts('po');
      const facts2 = memory.loadFacts('po');
      expect(facts1).toBe(facts2); // same reference from cache
    });

    it('returns persisted facts after re-instantiation', () => {
      memory.saveFact('developer', 'lang', 'TypeScript');
      const memory2 = new PersonaMemory(tmpDir);
      const facts = memory2.loadFacts('developer');
      expect(facts.lang.value).toBe('TypeScript');
    });
  });

  describe('saveFact', () => {
    it('saves a single fact with timestamp', () => {
      const result = memory.saveFact('architect', 'style', 'modular');
      expect(result.style.value).toBe('modular');
      expect(result.style.updatedAt).toBeTruthy();
    });

    it('creates the personas directory if it does not exist', () => {
      expect(fs.existsSync(path.join(tmpDir, 'personas'))).toBe(false);
      memory.saveFact('tester', 'focus', 'edge-cases');
      expect(fs.existsSync(path.join(tmpDir, 'personas'))).toBe(true);
    });

    it('overwrites existing fact', () => {
      memory.saveFact('po', 'priority', 'high');
      memory.saveFact('po', 'priority', 'low');
      const facts = memory.loadFacts('po');
      expect(facts.priority.value).toBe('low');
    });

    it('persists to JSON file', () => {
      memory.saveFact('security', 'threat', 'xss');
      const filePath = path.join(tmpDir, 'personas', 'security-facts.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(raw.threat.value).toBe('xss');
    });
  });

  describe('saveFacts', () => {
    it('saves multiple facts at once', () => {
      const result = memory.saveFacts('devops', { platform: 'aws', region: 'us-east-1' });
      expect(result.platform.value).toBe('aws');
      expect(result.region.value).toBe('us-east-1');
    });
  });

  describe('recallContext', () => {
    it('returns empty string when no facts', () => {
      expect(memory.recallContext('ux')).toBe('');
    });

    it('returns formatted context string', () => {
      memory.saveFact('ba', 'domain', 'fintech');
      const ctx = memory.recallContext('ba');
      expect(ctx).toContain('domain');
      expect(ctx).toContain('fintech');
      expect(ctx).toContain('remembered');
    });
  });

  describe('deleteFact', () => {
    it('deletes an existing fact', () => {
      memory.saveFact('reviewer', 'style', 'strict');
      expect(memory.deleteFact('reviewer', 'style')).toBe(true);
      expect(memory.loadFacts('reviewer')).toEqual({});
    });

    it('returns false for non-existent fact', () => {
      expect(memory.deleteFact('reviewer', 'nope')).toBe(false);
    });

    it('removes file when last fact is deleted', () => {
      memory.saveFact('qalead', 'only', 'fact');
      memory.deleteFact('qalead', 'only');
      const filePath = path.join(tmpDir, 'personas', 'qalead-facts.json');
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('clearFacts', () => {
    it('removes all facts for a persona', () => {
      memory.saveFact('dataanalyst', 'a', '1');
      memory.saveFact('dataanalyst', 'b', '2');
      memory.clearFacts('dataanalyst');
      expect(memory.loadFacts('dataanalyst')).toEqual({});
    });
  });

  describe('listPersonasWithFacts', () => {
    it('returns empty array when no facts stored', () => {
      expect(memory.listPersonasWithFacts()).toEqual([]);
    });

    it('lists personas that have stored facts', () => {
      memory.saveFact('po', 'x', '1');
      memory.saveFact('developer', 'y', '2');
      const list = memory.listPersonasWithFacts();
      expect(list.sort()).toEqual(['developer', 'po']);
    });
  });
});
