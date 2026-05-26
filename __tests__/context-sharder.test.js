const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContextSharder } = require('../src/utils/context-sharder');

describe('ContextSharder', () => {
  let tmpDir;
  let sharder;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-shard-'));
    sharder = new ContextSharder();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('shardDocument', () => {
    it('splits a long document into shards', () => {
      const content = [
        '# Section 1',
        ...Array(50).fill('Line of content for testing purposes.'),
        '# Section 2',
        ...Array(50).fill('Another line of content for testing.'),
        '# Section 3',
        ...Array(50).fill('Third section content line.'),
      ].join('\n');

      const shards = sharder.shardDocument(content, {
        sourceFile: 'test.md',
        maxShardTokens: 500,
      });

      expect(shards.length).toBeGreaterThan(1);
      expect(shards[0]).toHaveProperty('index');
      expect(shards[0]).toHaveProperty('breadcrumb');
      expect(shards[0]).toHaveProperty('estimatedTokens');
    });

    it('produces a single shard for short documents', () => {
      const content = '# Short\n\nHello world.';
      const shards = sharder.shardDocument(content, { sourceFile: 'short.md' });
      expect(shards).toHaveLength(1);
    });

    it('adds previous-shard summaries for continuity', () => {
      const content = [
        '# Section 1',
        ...Array(100).fill('Content line '),
        '# Section 2',
        'Short section.',
      ].join('\n');

      const shards = sharder.shardDocument(content, {
        sourceFile: 'cont.md',
        maxShardTokens: 300,
      });

      if (shards.length > 1) {
        expect(shards[1].previousShardSummary.length).toBeGreaterThan(0);
      }
    });

    it('tracks heading breadcrumbs', () => {
      const content = '# Top\n## Sub\n### Deep\nContent here.';
      const shards = sharder.shardDocument(content, { sourceFile: 'bread.md' });
      expect(shards[0].breadcrumb).toBeTruthy();
    });
  });

  describe('shardDirectory', () => {
    it('returns empty for non-existent directory', () => {
      expect(sharder.shardDirectory('/nonexistent')).toEqual([]);
    });

    it('shards all supported files in a directory', () => {
      fs.writeFileSync(path.join(tmpDir, 'doc1.md'), '# Doc1\n\nContent.');
      fs.writeFileSync(path.join(tmpDir, 'doc2.feature'), 'Feature: Test\n  Scenario: Run\n    Given stuff');

      const shards = sharder.shardDirectory(tmpDir);
      expect(shards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shardProject', () => {
    it('throws if stdd/ directory does not exist', () => {
      expect(() => sharder.shardProject(tmpDir)).toThrow('No stdd/ directory');
    });

    it('writes shards and shard-map.json', () => {
      const stddDir = path.join(tmpDir, 'stdd');
      const changesDir = path.join(stddDir, 'changes');
      fs.mkdirSync(changesDir, { recursive: true });
      fs.writeFileSync(path.join(stddDir, 'overview.md'), '# Overview\n\nProject info.');
      fs.writeFileSync(path.join(changesDir, 'proposal.md'), '# Proposal\n\nChange details.');

      const result = sharder.shardProject(tmpDir);
      expect(result.totalShards).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(tmpDir, result.shardMapPath))).toBe(true);

      const shardMap = JSON.parse(fs.readFileSync(path.join(tmpDir, result.shardMapPath), 'utf8'));
      expect(shardMap.totalShards).toBe(result.totalShards);
      expect(shardMap.shards.length).toBe(result.totalShards);
    });
  });
});
