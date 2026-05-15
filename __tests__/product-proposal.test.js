const fs = require('fs');
const path = require('path');
const os = require('os');
const { ProductProposalCommand } = require('../src/cli/commands/product-proposal');

describe('ProductProposalCommand', () => {
  let tempDir;
  let logSpy;

  function createTempProject(setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-product-proposal-test-'));
    tempDir = root;
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(root, 'stdd', 'changes'), { recursive: true });
    if (setupFn) setupFn(root);
    return root;
  }

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = null;
  });

  describe('Initialization check', () => {
    it('should throw if stdd is not initialized', () => {
      const noStddDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-nostdd-'));
      try {
        const cmd = new ProductProposalCommand(noStddDir);
        expect(() => cmd.execute({})).toThrow('STDD not initialized');
      } finally {
        fs.rmSync(noStddDir, { recursive: true, force: true });
      }
    });
  });

  describe('Minimal project (no artifacts)', () => {
    it('should generate report with TODO placeholders', () => {
      createTempProject(() => {});

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const outputPath = path.join(tempDir, 'PRODUCT-PROPOSAL.md');
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('产品概述');
      expect(content).toContain('市场分析');
      expect(content).toContain('TODO');
      expect(content).toContain('15. 附录');
    });

    it('should output JSON with --json', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({ json: true });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const json = JSON.parse(output);
      expect(json.metadata.project).toBe('test-app');
      expect(json.artifactCoverage).toBeDefined();
      expect(json.sections).toBeDefined();
    });
  });

  describe('With vision.md', () => {
    it('should include vision excerpt in overview', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'stdd', 'vision.md'), '# Vision\n\nBuild the best product.\n\n## Goals\n\n- Goal 1\n- Goal 2');
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'vision-app', version: '2.0.0' }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('Build the best product');
      expect(content).toContain('vision-app');
    });
  });

  describe('With changes', () => {
    it('should list proposals and task status', () => {
      createTempProject((p) => {
        const changeDir = path.join(p, 'stdd', 'changes', 'add-auth');
        fs.mkdirSync(changeDir, { recursive: true });
        fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Add Authentication\n\nImplement JWT auth');
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), '## Tasks\n\n- [x] TASK-001 Setup JWT\n- [ ] TASK-002 Login endpoint\n- [ ] TASK-003 Token refresh');

        const changeDir2 = path.join(p, 'stdd', 'changes', 'add-logging');
        fs.mkdirSync(changeDir2, { recursive: true });
        fs.writeFileSync(path.join(changeDir2, 'proposal.md'), '# Add Logging\n\nStructured logging');
        fs.writeFileSync(path.join(changeDir2, 'tasks.md'), '## Tasks\n\n- [x] TASK-001 Logger setup\n- [x] TASK-002 Integration');

        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'multi-change-app', version: '1.0.0' }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('add-auth');
      expect(content).toContain('add-logging');
      expect(content).toContain('进行中 (1/3)');
      expect(content).toContain('已完成 (2/2)');
    });

    it('should list specs and designs', () => {
      createTempProject((p) => {
        const changeDir = path.join(p, 'stdd', 'changes', 'user-mgmt');
        fs.mkdirSync(path.join(changeDir, 'specs', 'auth'), { recursive: true });
        fs.writeFileSync(path.join(changeDir, 'proposal.md'), 'User management');
        fs.writeFileSync(path.join(changeDir, 'specs', 'auth', 'login.feature'), 'Feature: Login');
        fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design\n\nREST API design');
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001');
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('user-mgmt (1 specs)');
      expect(content).toContain('design.md');
    });
  });

  describe('With evidence', () => {
    it('should include quality metrics from evidence', () => {
      createTempProject((p) => {
        const evDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evDir, { recursive: true });
        fs.writeFileSync(path.join(evDir, 'verify-001.json'), JSON.stringify({
          type: 'verify',
          status: 'pass',
          results: { tasks: { allDone: true }, constitution: { status: 'pass' } },
        }));
        fs.writeFileSync(path.join(evDir, 'verify-002.json'), JSON.stringify({
          type: 'verify',
          status: 'fail',
          results: {
            tasks: { allDone: false },
            constitution: {
              issues: {
                blocking: [{ article: 7, name: 'Security', message: 'Hardcoded secret' }],
              },
            },
          },
        }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('50%');
      expect(content).toContain('Article 7');
      expect(content).toContain('Security');
    });
  });

  describe('With archived changes', () => {
    it('should list archived changes in roadmap', () => {
      createTempProject((p) => {
        const archiveDir = path.join(p, 'stdd', 'changes', 'archive');
        fs.mkdirSync(path.join(archiveDir, '2026-01-01-old-feature'), { recursive: true });
        fs.mkdirSync(path.join(archiveDir, '2026-02-15-another'), { recursive: true });
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('2026-01-01-old-feature');
      expect(content).toContain('2026-02-15-another');
    });
  });

  describe('Custom output path', () => {
    it('should write to custom output path', () => {
      createTempProject(() => {});
      const customPath = path.join(tempDir, 'custom-output.md');

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({ output: customPath });

      expect(fs.existsSync(customPath)).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'))).toBe(false);
    });
  });

  describe('With config.yaml', () => {
    it('should include tech stack from config', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'stdd', 'config.yaml'), [
          'project:',
          '  type: web',
          '  language: typescript',
          '  framework: react',
          '  test_framework: vitest',
        ].join('\n'));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('typescript');
      expect(content).toContain('react');
      expect(content).toContain('vitest');
    });
  });

  describe('With progress log', () => {
    it('should count progress entries', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'stdd', 'progress.jsonl'), [
          JSON.stringify({ id: '1', ev: 'start', cmd: 'apply' }),
          JSON.stringify({ id: '1', ev: 'complete', cmd: 'apply' }),
          JSON.stringify({ id: '2', ev: 'start', cmd: 'verify' }),
          JSON.stringify({ id: '2', ev: 'fail', cmd: 'verify' }),
        ].join('\n'));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      expect(content).toContain('4 条');
    });
  });

  describe('15-section structure', () => {
    it('should contain all 15 required sections', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'full-test', version: '3.0.0' }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({});

      const content = fs.readFileSync(path.join(tempDir, 'PRODUCT-PROPOSAL.md'), 'utf-8');
      const requiredSections = [
        '产品概述',
        '市场分析',
        '用户画像与场景',
        '产品定位与价值主张',
        '核心功能清单',
        '产品架构',
        '工作流设计',
        'PM 能力矩阵',
        '质量保障体系',
        '技术栈与依赖',
        '竞品对比',
        '产品路线图',
        '成功指标与 KPI',
        '风险分析',
        '附录',
      ];

      for (const section of requiredSections) {
        expect(content).toContain(section);
      }
    });
  });

  describe('JSON structured output', () => {
    it('should include artifact coverage booleans', () => {
      createTempProject((p) => {
        fs.writeFileSync(path.join(p, 'stdd', 'vision.md'), '# Vision');
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'json-test', version: '1.0.0' }));
      });

      const cmd = new ProductProposalCommand(tempDir);
      cmd.execute({ json: true });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const json = JSON.parse(output);
      expect(json.artifactCoverage.vision).toBe(true);
      expect(json.artifactCoverage.proposals).toBe(false);
      expect(json.artifactCoverage.config).toBe(false);
    });
  });
});
