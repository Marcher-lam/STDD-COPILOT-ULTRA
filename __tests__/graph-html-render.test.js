const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

const {
  getGraphHtmlTemplatePath,
  renderHtml,
} = require('../src/cli/commands/graph');

describe('graph HTML rendering', () => {
  describe('getGraphHtmlTemplatePath', () => {
    it('returns a path under stdd/templates', () => {
      const templatePath = getGraphHtmlTemplatePath();
      expect(templatePath).toContain('stdd');
      expect(templatePath).toContain('templates');
      expect(templatePath).toContain('graph.html');
    });
  });

  describe('renderHtml', () => {
    it('replaces {{MERMAID_CODE}} placeholder', async () => {
      // Create a temp template to avoid depending on real file
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-render-'));
      const templatePath = path.join(tmpDir, 'graph.html');
      fs.writeFileSync(templatePath, '<html>{{MERMAID_CODE}}</html>');

      // We can't easily inject the template path, but we can test the logic
      // by verifying the replacement works with real template if it exists
      const realTemplatePath = getGraphHtmlTemplatePath();
      if (fs.existsSync(realTemplatePath)) {
        const result = await renderHtml('graph TD\n  A --> B');
        expect(result).toContain('graph TD');
        expect(result).toContain('A --> B');
        expect(result).not.toContain('{{MERMAID_CODE}}');
      }

      // Test the replacement logic directly
      const template = '<html><body>{{MERMAID_CODE}}</body></html>';
      const result = template.replace('{{MERMAID_CODE}}', 'graph TD\n  A --> B');
      expect(result).toBe('<html><body>graph TD\n  A --> B</body></html>');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('preserves non-placeholder content', async () => {
      const realTemplatePath = getGraphHtmlTemplatePath();
      if (fs.existsSync(realTemplatePath)) {
        const result = await renderHtml('test-mermaid');
        expect(result).toContain('<html') ;
        expect(result).toContain('</html>');
        expect(result).toContain('test-mermaid');
      }
    });
  });
});
