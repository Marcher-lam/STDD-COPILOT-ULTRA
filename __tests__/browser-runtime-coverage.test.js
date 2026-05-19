const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserRuntime } = require('../src/runtime/browser-runtime');

describe('BrowserRuntime', () => {
  let tmpDir;

  const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(undefined),
    setViewportSize: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue({
      title: 'Test Page',
      url: 'http://example.com',
      text: 'Hello World',
      selectorFound: true,
    }),
  };

  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockPlaywright = {
    chromium: {
      launch: jest.fn().mockResolvedValue(mockBrowser),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-browser-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createRuntime(cwd) {
    const rt = new BrowserRuntime(cwd || tmpDir);
    rt.playwright = mockPlaywright;
    return rt;
  }

  describe('constructor', () => {
    test('stores custom cwd', () => {
      const rt = new BrowserRuntime(tmpDir);
      expect(rt.cwd).toBe(tmpDir);
    });

    test('defaults to process.cwd()', () => {
      const rt = new BrowserRuntime();
      expect(rt.cwd).toBe(process.cwd());
    });
  });

  describe('getBrowser', () => {
    test('returns cached playwright reference', () => {
      const rt = createRuntime();
      const first = rt.getBrowser();
      const second = rt.getBrowser();
      expect(first).toBe(mockPlaywright);
      expect(first).toBe(second);
    });

    test('throws when playwright not installed', () => {
      const rt = new BrowserRuntime(tmpDir);
      rt.playwright = null;
      expect(() => rt.getBrowser()).toThrow('Playwright is not installed');
    });
  });

  describe('snapshot', () => {
    test('captures screenshot and returns success', async () => {
      const rt = createRuntime();
      const result = await rt.snapshot('http://example.com');

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(result.relativePath).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        'http://example.com',
        expect.objectContaining({ waitUntil: 'networkidle' })
      );
      expect(mockPage.screenshot).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('creates evidence directory if missing', async () => {
      const nestedDir = path.join(tmpDir, 'deep', 'nested');
      const rt = createRuntime(nestedDir);
      await rt.snapshot('http://example.com');
      expect(fs.existsSync(path.join(nestedDir, 'stdd', 'evidence'))).toBe(true);
    });
  });

  describe('inspect', () => {
    test('returns page data with selector found', async () => {
      const rt = createRuntime();
      const result = await rt.inspect('http://example.com', 'h1');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Page');
      expect(result.data.selectorFound).toBe(true);
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('navigates with domcontentloaded wait strategy', async () => {
      const rt = createRuntime();
      await rt.inspect('http://example.com');
      expect(mockPage.goto).toHaveBeenCalledWith(
        'http://example.com',
        expect.objectContaining({ waitUntil: 'domcontentloaded' })
      );
    });
  });

  describe('executeScript', () => {
    test('executes script on page and returns result', async () => {
      mockPage.evaluate.mockResolvedValueOnce({ links: 5 });
      const rt = createRuntime();
      const result = await rt.executeScript('http://example.com', 'document.querySelectorAll("a").length');

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ links: 5 });
      expect(mockPage.evaluate).toHaveBeenCalledWith('document.querySelectorAll("a").length');
    });
  });

  describe('_withBrowser error handling', () => {
    test('returns error result when callback throws', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation timeout'));
      const rt = createRuntime();
      const result = await rt.snapshot('http://unreachable.example');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Navigation timeout');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('closes browser even on error', async () => {
      mockPage.screenshot.mockRejectedValueOnce(new Error('screenshot failed'));
      const rt = createRuntime();
      const result = await rt.snapshot('http://example.com');

      expect(result.success).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });
});
