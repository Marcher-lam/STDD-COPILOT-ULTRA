const { Orchestrator } = require('../src/utils/orchestrator');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Orchestrator', () => {
  let projectDir;
  let orchestrator;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-orch-test-'));
    fs.mkdirSync(path.join(projectDir, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'stdd', 'graph'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'stdd', 'config.yaml'), 'version: "1.0"\n');
    fs.writeFileSync(path.join(projectDir, 'stdd', 'graph', 'skills.yaml'), 'version: "1.0"\nskills: {}\n');
    orchestrator = new Orchestrator(projectDir);
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should return new action when no changes exist', () => {
    const rec = orchestrator.recommend();
    expect(rec.action).toBe('new');
    expect(rec.phase).toBe('init');
    expect(rec.progress).toBe('0/8');
  });

  it('should detect propose phase for new change with proposal.md but no specs', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'test-feature');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test Proposal\n');

    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const rec = orchestrator.recommend();
    expect(rec.action).toBe('propose');
    expect(rec.phase).toBe('propose');
  });

  it('should detect plan phase when specs dir exists with feature file but no tasks', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'test-feature');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test');

    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const rec = orchestrator.recommend();
    // Spec phase detected (feature files exist), next action should be plan
    expect(rec.action).toBe('plan');
    expect(rec.phase).toBe('spec');
  });

  it('should detect apply phase when tasks exist but incomplete', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'test-feature');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001\n- [x] TASK-002\n');

    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const rec = orchestrator.recommend();
    // Plan phase detected (tasks.md exists), next action should be apply
    expect(rec.action).toBe('apply');
    expect(rec.phase).toBe('plan');
  });

  it('should detect verify phase when all tasks completed', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'test-feature');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001\n- [x] TASK-002\n');

    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const rec = orchestrator.recommend();
    // All tasks done, next action should be verify
    expect(rec.action).toBe('verify');
    expect(rec.phase).toBe('apply');
  });

  it('should detect archive phase when verify evidence exists', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'test-feature');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] TASK-001\n- [x] TASK-002\n');
    fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'evidence', 'verify-12345.json'), '{}');

    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const rec = orchestrator.recommend();
    // Verify phase detected (evidence exists), next action should be archive
    expect(rec.action).toBe('archive');
    expect(rec.gate).toBe(true);
  });

  it('should get active change name from directory', () => {
    const changeDir = path.join(projectDir, 'stdd', 'changes', 'my-change');
    fs.mkdirSync(changeDir, { recursive: true });
    
    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const name = orchestrator.getActiveChange();
    expect(name).toBe('my-change');
  });

  it('should return null when no active changes', () => {
    orchestrator.stddDir = path.join(projectDir, 'stdd');
    const name = orchestrator.getActiveChange();
    expect(name).toBeNull();
  });

  it('should return correct plan for given intent', () => {
    const feature = orchestrator.getPlan('feature');
    expect(feature).toContain('init');
    expect(feature).toContain('apply');
    expect(feature).toContain('archive');

    const hotfix = orchestrator.getPlan('hotfix');
    expect(hotfix).toContain('issue');
    expect(hotfix).toContain('apply');
    expect(hotfix).not.toContain('propose');

    const turbo = orchestrator.getPlan('turbo');
    expect(turbo).toContain('propose');
    expect(turbo).not.toContain('clarify');

    const explore = orchestrator.getPlan('explore');
    expect(explore).toContain('explore');
    expect(explore).toContain('brainstorm');
  });

  it('should fallback to feature for unknown intent', () => {
    const plan = orchestrator.getPlan('unknown');
    expect(plan).toEqual(orchestrator.getPlan('feature'));
  });

  it('should include instructions and reason in recommendation', () => {
    const rec = orchestrator.recommend();
    expect(rec.instructions).toBeDefined();
    expect(rec.reason).toBeDefined();
    expect(rec.command).toBe('/stdd:new');
  });

  it('should return brownfield intent for getPlan', () => {
    const plan = orchestrator.getPlan('brownfield');
    expect(plan[0]).toBe('explore');
    expect(plan).toContain('init');
    expect(plan).toContain('new');
  });
});

describe('Orchestrator Brownfield Detection', () => {
  let projectDir;

  afterEach(() => {
    if (projectDir) fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should detect greenfield when directory is empty', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-green-'));
    const orch = new Orchestrator(projectDir);
    expect(orch.detectProjectType()).toBe('greenfield');
  });

  it('should detect brownfield when src/ directory exists but no stdd config', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-brown-'));
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    const orch = new Orchestrator(projectDir);
    expect(orch.detectProjectType()).toBe('brownfield');
  });

  it('should detect brownfield when package.json exists but no stdd config', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-brown2-'));
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{"name":"test"}');
    const orch = new Orchestrator(projectDir);
    expect(orch.detectProjectType()).toBe('brownfield');
  });

  it('should detect initialized when stdd/config.yaml exists', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-init-'));
    fs.mkdirSync(path.join(projectDir, 'stdd'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'stdd', 'config.yaml'), 'version: "1.0"');
    const orch = new Orchestrator(projectDir);
    expect(orch.detectProjectType()).toBe('initialized');
  });

  it('should recommend analyze action for brownfield project', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-brown-rec-'));
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    const orch = new Orchestrator(projectDir);
    const rec = orch.recommend();
    expect(rec.action).toBe('analyze');
    expect(rec.command).toBe('/stdd:explore');
    expect(rec.projectType).toBe('brownfield');
    expect(rec.readingList).toBeDefined();
    expect(Array.isArray(rec.readingList)).toBe(true);
  });

  it('should generate reading list for package.json project', () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-brown-read-'));
    fs.mkdirSync(path.join(projectDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{"name":"test"}');
    fs.writeFileSync(path.join(projectDir, 'README.md'), '# Test');
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}');
    const orch = new Orchestrator(projectDir);
    const list = orch.getBrownfieldReadingList();
    expect(list).toContain('package.json');
    expect(list).toContain('README.md');
    expect(list).toContain('tsconfig.json');
    expect(list).toContain('src/components/');
  });
});
