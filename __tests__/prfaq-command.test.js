const fs = require('fs');
const path = require('path');
const os = require('os');
const { PrfaqCommand } = require('../src/cli/commands/prfaq');

describe('PrfaqCommand', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-prfaq-'));
    fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
    cmd = new PrfaqCommand(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws for unknown stage', () => {
    expect(() => cmd.execute('unknown')).toThrow('Unknown stage');
  });

  it('runs ignition stage', () => {
    const result = cmd.execute('ignition', [], { idea: 'Build an AI assistant' });
    expect(result.stage).toBe('ignition');
    expect(result.content).toContain('Build an AI assistant');
    expect(result.content).toContain('Ignition');
    expect(fs.existsSync(path.join(tmpDir, result.outputPath))).toBe(true);
  });

  it('runs press-release stage', () => {
    const result = cmd.execute('press-release');
    expect(result.stage).toBe('press-release');
    expect(result.content).toContain('Press Release');
    expect(result.content).toContain('FOR IMMEDIATE RELEASE');
  });

  it('runs customer-faq stage', () => {
    const result = cmd.execute('customer-faq');
    expect(result.stage).toBe('customer-faq');
    expect(result.content).toContain('Customer FAQ');
    expect(result.content).toContain('Luna');
  });

  it('runs internal-faq stage', () => {
    const result = cmd.execute('internal-faq');
    expect(result.stage).toBe('internal-faq');
    expect(result.content).toContain('Internal FAQ');
    expect(result.content).toContain('Wei');
    expect(result.content).toContain('Shield');
  });

  it('runs verdict stage with scoring', () => {
    const result = cmd.execute('verdict');
    expect(result.stage).toBe('verdict');
    expect(result.content).toContain('Scoring Matrix');
    expect(result.percentage).toBeGreaterThanOrEqual(0);
    expect(result.percentage).toBeLessThanOrEqual(100);
    expect(result.recommendation).toBeTruthy();
  });

  it('runs full workflow generating all 5 stages', () => {
    const results = cmd.execute('full');
    expect(Object.keys(results)).toHaveLength(5);
    expect(results.ignition).toBeTruthy();
    expect(results.verdict).toBeTruthy();

    for (const stage of ['ignition', 'press-release', 'customer-faq', 'internal-faq', 'verdict']) {
      expect(fs.existsSync(path.join(tmpDir, results[stage].outputPath))).toBe(true);
    }
  });

  it('reads project context from package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test-product',
      description: 'A test product for PRFAQ',
      version: '1.0.0',
    }));

    const newCmd = new PrfaqCommand(tmpDir);
    const result = newCmd.execute('ignition');
    expect(result.content).toContain('test-product');
  });
});
