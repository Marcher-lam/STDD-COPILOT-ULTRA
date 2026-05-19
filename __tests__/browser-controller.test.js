const { BrowserController } = require('../src/runtime/browser-controller');

describe('BrowserController', () => {
  describe('constructor', () => {
    test('sets output directory', () => {
      const bc = new BrowserController('/tmp/evidence');
      expect(bc.outputDir).toContain('evidence');
    });

    test('playwright is null when not installed', () => {
      const bc = new BrowserController();
      expect(bc.playwright).toBeNull();
    });
  });

  describe('snapshot', () => {
    test('throws when playwright is not installed', async () => {
      const bc = new BrowserController();
      await expect(bc.snapshot({ url: 'https://example.com' })).rejects.toThrow('Playwright is required');
    });

    test('throws when url is missing', async () => {
      const bc = new BrowserController();
      bc.playwright = { chromium: { launch: jest.fn() } };
      await expect(bc.snapshot({})).rejects.toThrow('URL is required');
    });
  });

  describe('inspect', () => {
    test('throws when playwright is not installed', async () => {
      const bc = new BrowserController();
      await expect(bc.inspect({ url: 'https://example.com' })).rejects.toThrow('Playwright is required');
    });

    test('throws when url is missing', async () => {
      const bc = new BrowserController();
      bc.playwright = { chromium: { launch: jest.fn() } };
      await expect(bc.inspect({})).rejects.toThrow('URL is required');
    });

    test('returns real http status from response', async () => {
      const bc = new BrowserController();
      const mockPage = {
        goto: jest.fn().mockResolvedValue({ status: () => 404 }),
        url: jest.fn().mockReturnValue('https://example.com/notfound'),
        title: jest.fn().mockResolvedValue('Not Found'),
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      bc.playwright = { chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) } };

      const result = await bc.inspect({ url: 'https://example.com/notfound' });
      expect(result.status).toBe('success');
      expect(result.httpStatus).toBe(404);
      expect(result.title).toBe('Not Found');
    });
  });

  describe('ensurePlaywright', () => {
    test('throws descriptive error when playwright is missing', async () => {
      const bc = new BrowserController();
      bc.playwright = null;
      await expect(bc.ensurePlaywright()).rejects.toThrow('npm install playwright');
    });

    test('creates output directory if it does not exist', async () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bc-'));
      const evDir = path.join(tmpDir, 'evidence-new');
      const bc = new BrowserController(evDir);
      bc.playwright = {};

      await bc.ensurePlaywright();

      expect(fs.existsSync(evDir)).toBe(true);
    });
  });

  describe('snapshot', () => {
    test('returns success result with file path and metadata', async () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bc-snap-'));
      const evDir = path.join(tmpDir, 'evidence');
      fs.mkdirSync(evDir, { recursive: true });

      const bc = new BrowserController(evDir);
      const mockScreenshot = jest.fn().mockResolvedValue(undefined);
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        url: jest.fn().mockReturnValue('https://example.com/page'),
        title: jest.fn().mockResolvedValue('Example Page'),
        screenshot: mockScreenshot,
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
      };
      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        newPage: undefined,
        close: jest.fn().mockResolvedValue(undefined),
      };
      bc.playwright = {
        chromium: {
          launch: jest.fn().mockResolvedValue(mockBrowser),
        },
      };

      const result = await bc.snapshot({ url: 'https://example.com/page', width: 1024, height: 768 });

      expect(result.status).toBe('success');
      expect(result.url).toBe('https://example.com/page');
      expect(result.title).toBe('Example Page');
      expect(result.filePath).toContain('browser-snapshot-');
      expect(mockScreenshot).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.any(String), fullPage: false })
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('closes browser even on navigation error', async () => {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bc-err-'));
      const evDir = path.join(tmpDir, 'evidence');
      fs.mkdirSync(evDir, { recursive: true });

      const bc = new BrowserController(evDir);
      const mockPage = {
        goto: jest.fn().mockRejectedValue(new Error('Navigation timeout')),
        screenshot: jest.fn(),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
      };
      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };
      bc.playwright = {
        chromium: {
          launch: jest.fn().mockResolvedValue(mockBrowser),
        },
      };

      await expect(bc.snapshot({ url: 'https://example.com' })).rejects.toThrow('Navigation timeout');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});
