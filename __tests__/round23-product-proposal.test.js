const fs = require('fs');
const os = require('os');
const path = require('path');
const { ProductProposalCommand } = require('../src/cli/commands/product-proposal');

function makeCommand(artifacts = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r23-product-'));
  const cmd = new ProductProposalCommand(cwd);
  cmd.artifacts = artifacts;
  return { cmd, cwd };
}

function cleanup(cwd) {
  if (cwd && fs.existsSync(cwd)) fs.rmSync(cwd, { recursive: true, force: true });
}

describe('round23 product-proposal branch coverage boosters', () => {
  test('full artifact set produces low-risk reports and positive competitive signals', () => {
    const artifacts = {
      vision: '# Vision\nA clear product direction for teams.',
      config: { project: { type: 'web-api', language: 'typescript', framework: 'react' } },
      packageJson: {
        name: 'complete-product',
        version: '1.2.3',
        description: 'A complete STDD product',
        engines: { node: '>=20' },
        dependencies: { react: '^18.0.0', express: '^4.0.0', openai: '^4.0.0' },
      },
      proposals: [{ change: 'checkout', content: '# Checkout\nEnable buyers to pay quickly.' }],
      specs: [{ change: 'checkout', file: 'checkout.feature', content: 'Feature: Checkout\nScenario: Buyer pays' }],
      designs: [{ change: 'checkout', content: '# Design\nArchitecture.' }],
      tasks: [{ change: 'checkout', content: '- [x] Build API\n- [x] Build UI' }],
      evidence: [
        { status: 'pass', change: 'checkout', results: { constitution: { issues: { blocking: [], warning: [] } } } },
        { status: 'pass', scenario: 'checkout happy path' },
      ],
      archived: ['2026-01-01-old'],
      progress: [{ ev: 'start' }],
    };
    const { cmd, cwd } = makeCommand(artifacts);
    try {
      expect(cmd.inferRisks()).toEqual([]);
      expect(cmd.buildRisk()).toContain('未检测到显著风险');
      expect(cmd.inferCompetitiveDimensions().map(d => d.dimension)).toEqual(expect.arrayContaining([
        'BDD 规格覆盖率', '验证通过率', '技术设计覆盖率', '任务拆解覆盖率', '产品愿景明确度', '技术栈明确度'
      ]));
      expect(cmd.inferCompetitiveAdvantages().map(a => a.title)).toEqual(expect.arrayContaining([
        '完整 STDD 工作流', 'BDD 行为规格', '高验证通过率'
      ]));
      expect(cmd.inferUSPs().map(u => u.title)).toEqual(expect.arrayContaining([
        '全链路 STDD 工作流', '行为规格驱动', '自动化质量验证', 'react 技术栈', 'AI/LLM 集成', '愿景驱动开发'
      ]));
      expect(cmd.inferNextSteps().map(s => s.action)).toContain('归档已完成的变更 checkout');
      expect(cmd.buildKpiTable().map(r => r.status)).toEqual(expect.arrayContaining(['达标']));
      expect(cmd.buildArchitecture()).toContain('archive/');
      expect(cmd.buildWorkflow()).toContain('| checkout | ok | ok | ok | ok | 已完成 (2/2) |');
    } finally {
      cleanup(cwd);
    }
  });

  test('partial artifacts produce PM gaps, next steps, risks, and weak KPIs', () => {
    const proposals = [
      { change: 'alpha', content: '# Alpha\nfirst' },
      { change: 'beta', content: '# Beta\nsecond' },
      { change: 'gamma', content: '# Gamma\nthird' },
      { change: 'delta', content: '# Delta\nfourth' },
      { change: 'epsilon', content: '# Epsilon\nfifth' },
      { change: 'zeta', content: '# Zeta\nsixth' },
    ];
    const deps = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`dep-${i}`, '1.0.0']));
    const { cmd, cwd } = makeCommand({
      proposals,
      specs: [{ change: 'alpha', file: 'alpha.feature', content: 'Feature: Alpha' }],
      packageJson: { name: 'risky', version: '0.0.1', dependencies: deps },
    });
    try {
      const gaps = cmd.detectPmGaps().map(g => g.name);
      expect(gaps).toEqual(expect.arrayContaining(['产品愿景缺失', '项目配置缺失', '规格覆盖不完整', '技术设计缺失', '任务拆解缺失', '质量证据缺失', '进度追踪缺失', '产品描述缺失']));
      const steps = cmd.inferNextSteps().map(s => s.action);
      expect(steps).toEqual(expect.arrayContaining(['创建产品愿景文档', '初始化项目配置']));
      expect(steps.some(s => s.includes('生成 BDD 规格'))).toBe(true);
      expect(steps.some(s => s.includes('编写技术设计'))).toBe(true);
      expect(steps.some(s => s.includes('拆解任务'))).toBe(true);
      const risks = cmd.inferRisks().map(r => r.description).join('\n');
      expect(risks).toContain('缺少产品愿景文档');
      expect(risks).toContain('缺少项目配置');
      expect(risks).toContain('缺少 BDD 规格');
      expect(risks).toContain('均缺少技术设计文档');
      expect(risks).toContain('无任何验证证据');
      expect(risks).toContain('均未拆解任务');
      expect(risks).toContain('活跃变更过多');
      expect(risks).toContain('运行时依赖数量较多');
      const statuses = cmd.buildKpiTable().map(r => r.status);
      expect(statuses).toEqual(expect.arrayContaining(['未达标', '无数据', '需提升']));
      expect(cmd.buildFeatures()).toContain('| 需求 | alpha | proposal.md | 未拆解 |');
      expect(cmd.buildRoadmap()).toContain('暂无已归档变更');
    } finally {
      cleanup(cwd);
    }
  });

  test('evidence and task edge cases cover quality and KPI status branches', () => {
    const { cmd, cwd } = makeCommand({
      vision: 'Vision text',
      config: { project: { type: 'cli', language: '', framework: '' } },
      proposals: [{ change: 'one', content: 'One' }],
      specs: [{ change: 'one', file: 'one.feature', content: 'Feature: One\nScenario: A\nScenario: B' }],
      designs: [],
      tasks: [{ change: 'one', content: '- [x] Done\n- [ ] Todo\n- [ ] Todo2' }],
      evidence: [
        { status: 'pass', results: { constitution: { issues: { blocking: [{ article: 7, name: 'Security', severity: 'blocking', message: 'secret' }], warning: [{ article: 4, name: 'Style', message: 'long file' }] } } } },
        { status: 'fail', results: { constitution: { issues: { blocking: [{ article: 7, name: 'Security', message: 'secret' }] } } } },
        { status: 'fail' },
      ],
    });
    try {
      expect(cmd.extractScenarioSummaries()).toHaveLength(2);
      expect(cmd.buildQuality()).toContain('Article 7');
      const kpis = cmd.buildKpiTable();
      expect(kpis.map(k => k.status)).toEqual(expect.arrayContaining(['达标', '未达标', '需关注', '需整改']));
      expect(cmd.inferCompetitiveDimensions().map(d => d.dimension)).toEqual(expect.arrayContaining(['BDD 规格覆盖率', '验证通过率', '技术设计覆盖率', '任务拆解覆盖率']));
      expect(cmd.inferCompetitiveAdvantages().map(a => a.title)).toContain('BDD 行为规格');
      expect(cmd.inferRisks().map(r => r.description).join('\n')).toContain('验证失败率');
      expect(cmd.buildMetrics()).toContain('证据通过率');
    } finally {
      cleanup(cwd);
    }
  });

  test('empty artifacts cover fallback branches in report builders', () => {
    const { cmd, cwd } = makeCommand({});
    try {
      expect(cmd.buildMarketAnalysis()).toContain('TODO');
      expect(cmd.buildUserPersonas()).toContain('未检测到足够的产物数据');
      expect(cmd.buildPositioning()).toContain('TODO');
      expect(cmd.buildFeatures()).toContain('暂无已规划功能');
      expect(cmd.buildArchitecture()).toContain('未检测到 `stdd/config.yaml`');
      expect(cmd.buildQuality()).toContain('暂无 Constitution 合规证据');
      expect(cmd.buildTechStack()).toContain('未检测到技术栈配置');
      expect(cmd.buildCompetitive()).toContain('请手动补充竞品对比维度');
      expect(cmd.inferNextSteps().map(s => s.action)).toEqual(expect.arrayContaining(['创建产品愿景文档', '初始化项目配置', '创建第一个需求提案']));
      expect(cmd.buildAppendix('empty-project')).toContain('empty-project');
    } finally {
      cleanup(cwd);
    }
  });
});
