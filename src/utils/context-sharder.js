/**
 * Context Sharder
 * Splits large documents into LLM-context-sized shards with
 * heading-boundary awareness and breadcrumb navigation.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_SHARD_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;

class ContextSharder {
  constructor(options = {}) {
    this.maxShardTokens = options.maxShardTokens || DEFAULT_MAX_SHARD_TOKENS;
  }

  _estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Shard a single document by heading boundaries.
   * Returns an array of shard objects.
   */
  shardDocument(content, options = {}) {
    const sourceFile = options.sourceFile || 'document';
    const maxTokens = options.maxShardTokens || this.maxShardTokens;
    const maxChars = maxTokens * CHARS_PER_TOKEN;

    const lines = content.split('\n');
    const shards = [];
    let currentShard = [];
    let currentSize = 0;
    let headingPath = [];
    let shardIndex = 0;

    const flush = () => {
      if (currentShard.length === 0) return;
      shardIndex++;
      const shardContent = currentShard.join('\n');
      const breadcrumb = headingPath.length > 0 ? headingPath.join(' > ') : sourceFile;

      shards.push({
        index: shardIndex,
        source: sourceFile,
        breadcrumb,
        content: shardContent,
        estimatedTokens: this._estimateTokens(shardContent),
        previousShardSummary: '',
      });

      currentShard = [];
      currentSize = 0;
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        // Update heading path
        headingPath = headingPath.slice(0, level - 1);
        headingPath.push(title);

        // Check if adding this line would exceed the limit
        const lineSize = line.length + 1;
        if (currentSize + lineSize > maxChars && currentShard.length > 0) {
          flush();
        }
      }

      currentShard.push(line);
      currentSize += line.length + 1;
    }

    flush();

    // Add previous-shard summaries for continuity
    for (let i = 1; i < shards.length; i++) {
      const prevLines = shards[i - 1].content.split('\n');
      const summaryLines = prevLines.slice(-3).filter((l) => l.trim());
      shards[i].previousShardSummary = summaryLines.join(' ').slice(0, 200);
    }

    return shards;
  }

  /**
   * Shard all files in a directory.
   */
  shardDirectory(dirPath, options = {}) {
    if (!fs.existsSync(dirPath)) return [];

    const files = fs.readdirSync(dirPath)
      .filter((f) => fs.statSync(path.join(dirPath, f)).isFile())
      .sort();

    const allShards = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const ext = path.extname(file).toLowerCase();
      if (!['.md', '.txt', '.feature', '.yaml', '.yml', '.json'].includes(ext)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const shards = this.shardDocument(content, {
        sourceFile: file,
        maxShardTokens: options.maxShardTokens || this.maxShardTokens,
      });

      allShards.push(...shards);
    }

    // Re-index sequentially
    allShards.forEach((s, i) => { s.index = i + 1; });

    return allShards;
  }

  /**
   * Shard the entire stdd/ project directory.
   * Writes shards to stdd/shards/ and produces shard-map.json.
   */
  shardProject(cwd, options = {}) {
    const stddDir = path.join(cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('No stdd/ directory found. Run stdd init first.');
    }

    const subdirs = ['changes', 'reports', 'memory'];
    const allShards = [];

    for (const sub of subdirs) {
      const subPath = path.join(stddDir, sub);
      if (!fs.existsSync(subPath)) continue;
      const shards = this.shardDirectory(subPath, {
        maxShardTokens: options.maxShardTokens || this.maxShardTokens,
      });
      for (const s of shards) {
        s.source = `${sub}/${s.source}`;
      }
      allShards.push(...shards);
    }

    // Also shard top-level markdown files in stdd/
    const topFiles = fs.readdirSync(stddDir)
      .filter((f) => f.endsWith('.md') && fs.statSync(path.join(stddDir, f)).isFile());

    for (const file of topFiles) {
      const content = fs.readFileSync(path.join(stddDir, file), 'utf8');
      const shards = this.shardDocument(content, { sourceFile: file });
      allShards.push(...shards);
    }

    // Re-index
    allShards.forEach((s, i) => { s.index = i + 1; });

    // Write shards
    const shardsDir = path.join(stddDir, 'shards');
    fs.mkdirSync(shardsDir, { recursive: true });

    // Clean existing shards
    const existing = fs.readdirSync(shardsDir);
    for (const f of existing) {
      fs.unlinkSync(path.join(shardsDir, f));
    }

    // Write individual shard files
    const shardMap = {
      generatedAt: new Date().toISOString(),
      totalShards: allShards.length,
      estimatedTotalTokens: allShards.reduce((sum, s) => sum + s.estimatedTokens, 0),
      shards: [],
    };

    for (const shard of allShards) {
      const fileName = `shard-${String(shard.index).padStart(3, '0')}.md`;
      const filePath = path.join(shardsDir, fileName);

      const header = [
        `<!-- Shard ${shard.index}/${allShards.length} -->`,
        `<!-- Source: ${shard.source} -->`,
        `<!-- Breadcrumb: ${shard.breadcrumb} -->`,
        shard.previousShardSummary ? `<!-- Previous: ${shard.previousShardSummary} -->` : '',
        '',
      ].filter(Boolean).join('\n');

      fs.writeFileSync(filePath, header + shard.content, 'utf8');

      shardMap.shards.push({
        index: shard.index,
        file: fileName,
        source: shard.source,
        breadcrumb: shard.breadcrumb,
        estimatedTokens: shard.estimatedTokens,
      });
    }

    // Write shard map
    fs.writeFileSync(
      path.join(shardsDir, 'shard-map.json'),
      JSON.stringify(shardMap, null, 2),
      'utf8'
    );

    return {
      outputDir: path.relative(cwd, shardsDir).replace(/\\/g, '/'),
      totalShards: allShards.length,
      estimatedTotalTokens: shardMap.estimatedTotalTokens,
      shardMapPath: path.relative(cwd, path.join(shardsDir, 'shard-map.json')).replace(/\\/g, '/'),
    };
  }
}

module.exports = { ContextSharder };
