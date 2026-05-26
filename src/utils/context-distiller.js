/**
 * Context Distiller
 * LLM-optimized document compression that preserves structure while
 * removing implementation details. Strategies per file type:
 * - Code: signatures, classes, exports, types
 * - Markdown: headings, lists, tables
 * - Spec (.feature): Feature/Scenario names + key steps
 * - JSON: top-level keys and types
 */

const fs = require('fs');
const path = require('path');
const { walkFiles } = require('./file-walker');

const DEFAULT_MAX_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;

class ContextDistiller {
  constructor(options = {}) {
    this.maxTokenEstimate = options.maxTokenEstimate || DEFAULT_MAX_TOKENS;
  }

  _estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Distill a code file to its skeleton (signatures, classes, exports, types).
   */
  distillCode(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const skeleton = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep: imports, exports, class/function/type declarations, comments with //!
      if (
        /^(import |export |const |let |var |class |function |interface |type |enum |\/\/!|\/\*\*| \* )/.test(trimmed) ||
        trimmed.startsWith('async function') ||
        trimmed.startsWith('async ') ||
        /^(public|private|protected|static)\s/.test(trimmed) ||
        trimmed === '' && skeleton.length > 0 && skeleton[skeleton.length - 1] !== ''
      ) {
        skeleton.push(line);
      }
    }

    // Remove trailing empty lines
    while (skeleton.length > 0 && skeleton[skeleton.length - 1].trim() === '') {
      skeleton.pop();
    }

    return { source: filePath, distilled: skeleton.join('\n'), type: 'code' };
  }

  /**
   * Distill a markdown file to headings, list items, and tables.
   */
  distillMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const distilled = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep: headings, list items, table rows, code fences
      if (
        /^#{1,6}\s/.test(trimmed) ||
        /^[-*+]\s/.test(trimmed) ||
        /^\d+\.\s/.test(trimmed) ||
        /^\|/.test(trimmed) ||
        /^```/.test(trimmed) ||
        (trimmed !== '' && distilled.length === 0) // first non-empty line
      ) {
        distilled.push(line);
      }
    }

    return { source: filePath, distilled: distilled.join('\n'), type: 'markdown' };
  }

  /**
   * Distill a .feature spec file to Feature/Scenario names and key steps.
   */
  distillSpec(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const distilled = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep: Feature, Scenario, Scenario Outline, tags, and first Given/When/Then per block
      if (
        /^(Feature:|Scenario:|Scenario Outline:|Background:|@)/.test(trimmed) ||
        /^(Given|When|Then|And|But)\s/.test(trimmed)
      ) {
        distilled.push(line);
      }
    }

    return { source: filePath, distilled: distilled.join('\n'), type: 'spec' };
  }

  /**
   * Distill a JSON file to top-level keys and their types.
   */
  distillJSON(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { source: filePath, distilled: content.slice(0, 500), type: 'json' };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { source: filePath, distilled: `value: ${typeof parsed}`, type: 'json' };
    }

    const entries = Object.entries(parsed).map(([key, value]) => {
      const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
      return `  ${key}: ${type}`;
    });

    const distilled = `{\n${entries.join('\n')}\n}`;
    return { source: filePath, distilled, type: 'json' };
  }

  /**
   * Distill a single file, auto-detecting its type.
   */
  distillFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const distillMap = {
      '.js': 'code', '.jsx': 'code', '.ts': 'code', '.tsx': 'code',
      '.py': 'code', '.go': 'code', '.rs': 'code', '.java': 'code',
      '.md': 'markdown', '.mdx': 'markdown',
      '.feature': 'spec',
      '.json': 'json', '.yaml': 'markdown', '.yml': 'markdown',
    };

    const type = distillMap[ext] || 'code';

    switch (type) {
      case 'markdown': return this.distillMarkdown(filePath);
      case 'spec': return this.distillSpec(filePath);
      case 'json': return this.distillJSON(filePath);
      default: return this.distillCode(filePath);
    }
  }

  /**
   * Distill an entire project directory.
   */
  distillProject(cwd, options = {}) {
    const stddDir = path.join(cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('No stdd/ directory found. Run stdd init first.');
    }

    const extensions = options.extensions || [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs',
      '.md', '.feature', '.json', '.yaml', '.yml',
    ];

    const files = walkFiles(stddDir, { extensions });
    const sections = [];
    let totalTokens = 0;

    for (const file of files) {
      const relPath = path.relative(cwd, file).replace(/\\/g, '/');
      try {
        const result = this.distillFile(file);
        const tokens = this._estimateTokens(result.distilled);

        if (totalTokens + tokens <= this.maxTokenEstimate) {
          sections.push(`### ${relPath}\n\`\`\`\n${result.distilled}\n\`\`\``);
          totalTokens += tokens;
        } else {
          sections.push(`### ${relPath}\n*[${tokens} tokens — exceeds budget]*`);
        }
      } catch (_) {
        // Skip unreadable files
      }
    }

    const summary = [
      `# Project Distilled Summary`,
      ``,
      `Generated: ${new Date().toISOString()}`,
      `Files processed: ${files.length}`,
      `Sections included: ${sections.filter((s) => !s.includes('exceeds budget')).length}`,
      `Estimated tokens: ~${totalTokens}`,
      ``,
      ...sections,
    ].join('\n');

    const outputPath = path.join(stddDir, 'distilled', 'project-summary.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, summary, 'utf8');

    return {
      outputPath: path.relative(cwd, outputPath).replace(/\\/g, '/'),
      filesProcessed: files.length,
      estimatedTokens: totalTokens,
    };
  }
}

module.exports = { ContextDistiller };
