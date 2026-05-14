const { generateDesignMd, saveDesignMd, PRESETS } = require('../src/utils/design-md-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('DESIGN.md Generator', () => {
  it('should have 3 built-in presets', () => {
    expect(Object.keys(PRESETS)).toEqual(['modern', 'dark', 'minimal']);
  });

  it('should generate modern preset by default', () => {
    const content = generateDesignMd();
    expect(content).toContain('Modern SaaS');
    expect(content).toContain('#3b82f6');
    expect(content).toContain('button-primary');
    expect(content).toContain('Do\'s and Don\'ts');
  });

  it('should generate dark preset', () => {
    const content = generateDesignMd('dark');
    expect(content).toContain('Dark Professional');
    expect(content).toContain('#10b981');
    expect(content).toContain('#171717');
  });

  it('should generate minimal preset', () => {
    const content = generateDesignMd('minimal');
    expect(content).toContain('Minimal Clean');
    expect(content).toContain('#000000');
  });

  it('should use custom project name', () => {
    const content = generateDesignMd('modern', { name: 'EvoRL Framework' });
    expect(content).toContain('EvoRL Framework');
  });

  it('should accept custom mood and philosophy', () => {
    const content = generateDesignMd('modern', {
      mood: 'Futuristic and bold',
      philosophy: 'AI-first design',
    });
    expect(content).toContain('Futuristic and bold');
    expect(content).toContain('AI-first design');
  });

  it('should include all required sections', () => {
    const content = generateDesignMd();
    const required = [
      'Visual Theme & Atmosphere',
      'Colors',
      'Typography',
      'Spacing',
      'Border Radius',
      'Components',
      'Layout Principles',
      'Responsive Behavior',
      "Do's and Don'ts",
      'Agent Prompt Guide',
    ];
    for (const section of required) {
      expect(content).toContain(section);
    }
  });

  it('should save DESIGN.md to target directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-design-test-'));
    const filePath = saveDesignMd(tmpDir, 'dark', { name: 'Test Project' });
    
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('Test Project');
    expect(content).toContain('Dark Professional');
    
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should fallback to modern for unknown preset', () => {
    const content = generateDesignMd('nonexistent');
    expect(content).toContain('Modern SaaS');
  });
});
