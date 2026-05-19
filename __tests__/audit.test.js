const fs = require('fs');
const path = require('path');
const os = require('os');
const { AuditCommand } = require('../src/cli/commands/audit');

describe('AuditCommand', () => {
  let tempDir;
  let logSpy;

  function createTempProject(name, setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-audit-test-'));
    tempDir = path.join(root, name);
    fs.mkdirSync(tempDir, { recursive: true });
    if (setupFn) setupFn(tempDir);
    return tempDir;
  }

  function makeEvidence(type, status, constitutionIssues = {}, extra = {}) {
    return {
      type,
      id: 'test-hash',
      timestamp: new Date().toISOString(),
      unixTimestamp: Date.now(),
      status,
      results: {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: {
          status,
          issues: {
            blocking: constitutionIssues.blocking || [],
            warning: constitutionIssues.warning || [],
          },
        },
      },
      metadata: { changeName: 'test-change', os: process.platform, nodeVersion: process.version },
      ...extra,
    };
  }

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(path.dirname(tempDir), { recursive: true, force: true });
    }
    tempDir = null;
  });

  describe('Case 1: No evidence files', () => {
    it('should show "No history found" when stdd is not initialized', async () => {
      const projectPath = createTempProject('no-stdd', () => {});

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(0);
      expect(result.avgCompliance).toBe(0);
    });

    it('should show "No history found" when stdd exists but no evidence', async () => {
      const projectPath = createTempProject('empty-stdd', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
        fs.mkdirSync(path.join(p, 'stdd', 'changes'), { recursive: true });
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(0);
    });

    it('should print "No history found" in text mode', async () => {
      const projectPath = createTempProject('no-history', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('No history found');
    });
  });

  describe('Case 2: One pass, one fail', () => {
    it('should count 2 runs and correctly identify the failing Article', async () => {
      const projectPath = createTempProject('mixed', (p) => {
        // Pass evidence in stdd/evidence/
        const rootEvidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(rootEvidenceDir, { recursive: true });
        const passEvidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(rootEvidenceDir, 'guard-1000000001.json'),
          JSON.stringify(passEvidence, null, 2)
        );

        // Fail evidence in a change's evidence/
        const changeEvidenceDir = path.join(p, 'stdd', 'changes', 'feature-x', 'evidence');
        fs.mkdirSync(changeEvidenceDir, { recursive: true });
        const failEvidence = makeEvidence('verify', 'fail', {
          blocking: [
            {
              article: 7,
              name: 'Security',
              message: 'Hardcoded secret in src/config.js: password = "secret"',
            },
          ],
          warning: [
            {
              article: 4,
              name: 'Style',
              message: 'File too long (600 lines): src/utils.js',
            },
          ],
        });
        fs.writeFileSync(
          path.join(changeEvidenceDir, 'verify-1000000002.json'),
          JSON.stringify(failEvidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(2);

      // Only 1 pass out of 2
      expect(result.avgCompliance).toBe(50);

      // Article 7 (Security) should be top violation with 1 failure
      expect(result.topViolations.length).toBeGreaterThanOrEqual(1);
      const art7 = result.topViolations.find(v => v.article === 7);
      expect(art7).toBeDefined();
      expect(art7.count).toBe(1);

      // Article 4 (Style) should also be counted
      const art4 = result.topViolations.find(v => v.article === 4);
      expect(art4).toBeDefined();
      expect(art4.count).toBe(1);

      // src/config.js should appear in risky files
      expect(result.riskiestFiles.length).toBeGreaterThanOrEqual(1);
      const riskyConfig = result.riskiestFiles.find(f => f.file.includes('src/config.js'));
      expect(riskyConfig).toBeDefined();
      expect(riskyConfig.count).toBe(1);
    });

    it('should output valid text report without --json', async () => {
      const projectPath = createTempProject('text-report', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000003.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Total Checks');
      expect(printed).toContain('Avg Compliance');
    });

    it('should group issue paths by workspace and print workspace breakdown', async () => {
      const projectPath = createTempProject('workspace-report', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'api'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));

        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'fail', {
          blocking: [
            {
              article: 7,
              name: 'Security',
              file: 'packages/api/src/index.ts',
              message: 'Hardcoded secret in packages/api/src/index.ts',
            },
          ],
        });
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000007.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.workspaceBreakdown).toEqual([
        expect.objectContaining({
          workspaceName: 'packages/api',
          totalIssues: 1,
          blockingIssues: 1,
          warningIssues: 0,
        }),
      ]);
      expect(result.workspaceBreakdown[0].topArticles).toEqual([
        expect.objectContaining({ article: 7, count: 1 }),
      ]);

      logSpy.mockClear();
      await cmd.execute({ json: false });
      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Workspace Breakdown');
      expect(printed).toContain('packages/api');
    });

    it('should filter aggregation by workspace evidence scope', async () => {
      const projectPath = createTempProject('workspace-filter', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'api'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'web'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'web', 'package.json'), JSON.stringify({ name: '@demo/web' }, null, 2));

        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(path.join(evidenceDir, 'guard-1000000020.json'), JSON.stringify(makeEvidence('guard', 'fail', {
          blocking: [{ article: 7, file: 'packages/api/src/index.ts', message: 'Hardcoded secret' }],
        }, {
          metadata: { workspace: { name: '@demo/api', path: 'packages/api', root: path.join(p, 'packages', 'api') } },
        }), null, 2));
        fs.writeFileSync(path.join(evidenceDir, 'guard-1000000021.json'), JSON.stringify(makeEvidence('guard', 'fail', {
          warning: [{ article: 4, file: 'packages/web/src/index.ts', message: 'Style issue' }],
        }, {
          metadata: { workspace: { name: '@demo/web', path: 'packages/web', root: path.join(p, 'packages', 'web') } },
        }), null, 2));
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true, workspace: 'packages/api' });

      expect(result.totalChecks).toBe(1);
      expect(result.topViolations).toEqual([
        expect.objectContaining({ article: 7, count: 1 }),
      ]);
      expect(result.topViolations.find(v => v.article === 4)).toBeUndefined();
    });
  });

  describe('Aggregation edge cases', () => {
    it('should ignore non-matching files in evidence directories', async () => {
      const projectPath = createTempProject('ignore-files', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        // Valid evidence
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000004.json'),
          JSON.stringify(evidence, null, 2)
        );
        // Non-matching file
        fs.writeFileSync(
          path.join(evidenceDir, 'notes.txt'),
          'Not an evidence file'
        );
        fs.writeFileSync(
          path.join(evidenceDir, 'report.pdf'),
          'pdf content'
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(1);
    });

    it('should ignore malformed JSON evidence files', async () => {
      const projectPath = createTempProject('malformed-json', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000005.json'),
          JSON.stringify(evidence, null, 2)
        );
        // Malformed JSON
        fs.writeFileSync(
          path.join(evidenceDir, 'verify-1000000006.json'),
          '{broken json'
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      // Only the valid one should count
      expect(result.totalChecks).toBe(1);
    });

    it('should aggregate multiple failures of the same article', async () => {
      const projectPath = createTempProject('repeat-violations', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });

        // 3 fails all with Article 4 style violations
        for (let i = 0; i < 3; i++) {
          const evidence = makeEvidence('verify', 'fail', {
            warning: [
              {
                article: 4,
                name: 'Style',
                message: `File too long: src/app.js`,
              },
            ],
          });
          fs.writeFileSync(
            path.join(evidenceDir, `verify-${1000000010 + i}.json`),
            JSON.stringify(evidence, null, 2)
          );
        }
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(3);
      expect(result.avgCompliance).toBe(0);

      const art4 = result.topViolations.find(v => v.article === 4);
      expect(art4).toBeDefined();
      expect(art4.count).toBe(3);
    });
  });

  describe('Lint results and metadata extraction', () => {
    it('should extract file paths from lint results output', async () => {
      const projectPath = createTempProject('lint-results', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = {
          type: 'guard',
          status: 'fail',
          results: {
            lint: {
              status: 'fail',
              details: {
                output: 'src/app.js: line 10, col 5\nsrc/utils.ts: line 3\nnot-a-file: ignored\nother.txt: ignored',
              },
            },
          },
        };
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-2000000001.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(1);
      expect(result.riskiestFiles.find(f => f.file === 'src/app.js')).toBeDefined();
    });

    it('should extract file from evidence metadata.file', async () => {
      const projectPath = createTempProject('metadata-file', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = {
          type: 'guard',
          status: 'fail',
          results: {},
          metadata: { file: 'src/config.js' },
        };
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-2000000002.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      const riskyConfig = result.riskiestFiles.find(f => f.file === 'src/config.js');
      expect(riskyConfig).toBeDefined();
    });
  });

  describe('Evidence file workspace matching', () => {
    it('should handle malformed JSON in workspace matching gracefully', async () => {
      const projectPath = createTempProject('workspace-malformed', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        // Malformed JSON that should be caught by try/catch in _evidenceFileMatchesWorkspace
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-2000000003.json'),
          '{not valid json'
        );
      });

      const cmd = new AuditCommand(projectPath);
      // With workspace filter, the malformed file should be silently skipped
      const result = await cmd.execute({ json: true, workspace: 'some-workspace' });
      expect(result.totalChecks).toBe(0);
    });
  });

  describe('_extractIssueFiles', () => {
    it('should extract files from issue.files array', () => {
      const cmd = new AuditCommand('/tmp');
      const files = cmd._extractIssueFiles({
        files: ['src/a.js', 'src/b.ts', 123, 'src/c.js'],
      });
      expect(files).toContain('src/a.js');
      expect(files).toContain('src/b.ts');
      expect(files).toContain('src/c.js');
      // Non-string entries should be filtered
      expect(files).not.toContain(123);
    });

    it('should extract file paths from issue.message', () => {
      const cmd = new AuditCommand('/tmp');
      const files = cmd._extractIssueFiles({
        message: 'Error in src/deep/path/file.js and also src/other/thing.ts',
      });
      expect(files).toContain('src/deep/path/file.js');
      expect(files).toContain('src/other/thing.ts');
    });

    it('should extract from file/path/filepath/filePath keys', () => {
      const cmd = new AuditCommand('/tmp');
      const files = cmd._extractIssueFiles({
        file: 'src/from-file.js',
        path: 'src/from-path.js',
        filepath: 'src/from-filepath.js',
        filePath: 'src/from-filePath.js',
      });
      expect(files).toContain('src/from-file.js');
      expect(files).toContain('src/from-path.js');
      expect(files).toContain('src/from-filepath.js');
      expect(files).toContain('src/from-filePath.js');
    });
  });

  describe('Workspace stats aggregation', () => {
    it('should accumulate stats for same workspace across multiple issues', async () => {
      const projectPath = createTempProject('workspace-accum', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'api'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));

        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });

        // First evidence: blocking issue
        const ev1 = makeEvidence('guard', 'fail', {
          blocking: [
            { article: 7, file: 'packages/api/src/auth.js', message: 'secret in packages/api/src/auth.js' },
          ],
        });
        fs.writeFileSync(path.join(evidenceDir, 'guard-2000000010.json'), JSON.stringify(ev1, null, 2));

        // Second evidence: warning issue in same workspace
        const ev2 = makeEvidence('guard', 'fail', {
          warning: [
            { article: 4, file: 'packages/api/src/utils.js', message: 'long file packages/api/src/utils.js' },
          ],
        });
        fs.writeFileSync(path.join(evidenceDir, 'guard-2000000011.json'), JSON.stringify(ev2, null, 2));
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.workspaceBreakdown.length).toBe(1);
      const ws = result.workspaceBreakdown[0];
      expect(ws.workspaceName).toBe('packages/api');
      expect(ws.totalIssues).toBe(2);
      expect(ws.blockingIssues).toBe(1);
      expect(ws.warningIssues).toBe(1);
    });
  });

  describe('_printReport variations', () => {
    it('should print "No violations found" when there are none', async () => {
      const projectPath = createTempProject('no-violations', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-3000000001.json'),
          JSON.stringify(makeEvidence('guard', 'pass'), null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('No violations found');
      expect(printed).toContain('No risky files identified');
    });

    it('should print text report with violations and risky files', async () => {
      const projectPath = createTempProject('text-violations', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('verify', 'fail', {
          blocking: [{ article: 7, message: 'secret in src/config.js' }],
        });
        fs.writeFileSync(
          path.join(evidenceDir, 'verify-3000000002.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Top Violations');
      expect(printed).toContain('Riskiest Files');
    });
  });
});
