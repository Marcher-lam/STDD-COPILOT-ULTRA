const { CANONICAL_CLI_ENTRIES, readFile } = require('../test-support/docs-contracts');

const CHINESE_CLI_DOCS = [
  'README.md',
  'USAGE.md',
  'docs/cli-guide.md',
  'docs/getting-started.md'
];

const ENGLISH_CLI_DOCS = [
  'README_EN.md',
  'docs/en/cli-guide.md',
  'docs/en/getting-started.md'
];

describe('Documentation CLI example consistency', () => {
  it('keeps Chinese CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of CHINESE_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps English CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of ENGLISH_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps English entry-doc cross-links and entry descriptions aligned', () => {
    const readme = readFile('README_EN.md');
    const docsIndex = readFile('docs/en/README.md');
    const cliGuide = readFile('docs/en/cli-guide.md');
    const gettingStarted = readFile('docs/en/getting-started.md');

    expect(readme).toContain('[English Docs Index](./docs/en/README.md) | English documentation hub and entry-point map');
    expect(readme).toContain('[Getting Started](./docs/en/getting-started.md) | First-run workflow and quick CLI reference');
    expect(readme).toContain('[CLI Guide](./docs/en/cli-guide.md) | Full CLI command reference');

    expect(docsIndex).toContain('[Getting Started](getting-started.md) | First-run workflow and quick CLI reference');
    expect(docsIndex).toContain('[CLI Guide](cli-guide.md) | Full CLI command reference');
    expect(docsIndex).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');
    expect(docsIndex).toContain('[Getting Started](getting-started.md) — First-run workflow and quick CLI reference');
    expect(docsIndex).toContain('[CLI Guide](cli-guide.md) — Full CLI command reference');

    expect(cliGuide).toContain('## Documentation');
    expect(cliGuide).toContain('[English Docs Index](README.md) — English documentation hub');
    expect(cliGuide).toContain('[Getting Started](getting-started.md) — First-run workflow and quick CLI reference');
    expect(cliGuide).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');

    expect(gettingStarted).toContain('[English Docs Index](README.md) — English documentation hub');
    expect(gettingStarted).toContain('[CLI Guide](cli-guide.md) — Full CLI command reference');
    expect(gettingStarted).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');
  });

  it('keeps Chinese entry-doc cross-links and entry descriptions aligned', () => {
    const readme = readFile('README.md');
    const cliGuide = readFile('docs/cli-guide.md');
    const gettingStarted = readFile('docs/getting-started.md');

    expect(readme).toContain('[CLI 使用指南](./docs/cli-guide.md) | CLI 完整文档');
    expect(readme).toContain('[快速开始](./docs/getting-started.md) | 首次使用流程和 CLI 速查');
    expect(readme).toContain('[使用手册](./USAGE.md) | 完整使用指南');

    expect(cliGuide).toContain('## 文档导航');
    expect(cliGuide).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(cliGuide).toContain('[快速开始](getting-started.md) - 首次使用流程和 CLI 速查');
    expect(cliGuide).toContain('[使用手册](../USAGE.md) - 完整使用指南');

    expect(gettingStarted).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(gettingStarted).toContain('[使用手册](../USAGE.md) - 完整使用指南');
    expect(gettingStarted).toContain('[CLI 使用指南](cli-guide.md) - CLI 完整文档');
  });
});
