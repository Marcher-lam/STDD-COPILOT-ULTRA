const fs = require('fs');
const os = require('os');
const path = require('path');
const { BrowserRuntime } = require('../src/runtime/browser-runtime');

describe('round21: BrowserRuntime targeted branch coverage', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r21-browser-'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
    delete global.document;
    delete global.window;
  });

  function makeRuntime({ page, launchError, newPageError } = {}) {
    const mockPage = page || {
      setViewportSize: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue('ok'),
    };

    const mockBrowser = {
      newPage: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    if (newPageError) {
      mockBrowser.newPage.mockRejectedValue(new Error(newPageError));
    } else {
      mockBrowser.newPage.mockResolvedValue(mockPage);
    }

    const launch = launchError
      ? jest.fn().mockRejectedValue(new Error(launchError))
      : jest.fn().mockResolvedValue(mockBrowser);

    const runtime = new BrowserRuntime(tmpDir);
    runtime.playwright = { chromium: { launch } };

    return { runtime, mockPage, mockBrowser, launch };
  }

  test('snapshot uses default options and deterministic screenshot path when evidence dir exists', async () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-05-19T00:00:00.000Z');

    const { runtime, mockPage, mockBrowser, launch } = makeRuntime();

    const result = await runtime.snapshot('https://example.com/page');

    const expectedPath = path.join(evidenceDir, 'snapshot-page-2026-05-19T00-00-00-000Z.png');
    expect(result).toEqual({
      success: true,
      path: expectedPath,
      relativePath: path.join('stdd', 'evidence', 'snapshot-page-2026-05-19T00-00-00-000Z.png'),
    });
    expect(launch).toHaveBeenCalledWith({ headless: true });
    expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1280, height: 720 });
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/page', {
      waitUntil: 'networkidle',
      timeout: 10000,
    });
    expect(mockPage.screenshot).toHaveBeenCalledWith({ path: expectedPath, fullPage: false });
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('snapshot uses provided width and height and creates missing evidence dir', async () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    expect(fs.existsSync(evidenceDir)).toBe(false);

    const { runtime, mockPage } = makeRuntime();

    const result = await runtime.snapshot('https://example.com/mobile', { width: 390, height: 844 });

    expect(result.success).toBe(true);
    expect(fs.existsSync(evidenceDir)).toBe(true);
    expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 390, height: 844 });
    expect(mockPage.screenshot.mock.calls[0][0].path).toContain(evidenceDir);
  });

  test('inspect defaults selector to body and extracts text when selector exists', async () => {
    const querySelector = jest.fn().mockReturnValue({ innerText: 'x'.repeat(1205) });
    global.document = { title: 'Default Selector Page', querySelector };
    global.window = { location: { href: 'https://example.com/current' } };

    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation((fn, selector) => Promise.resolve(fn(selector))),
    };
    const { runtime, mockBrowser } = makeRuntime({ page: mockPage });

    const result = await runtime.inspect('https://example.com/default-selector');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: 'Default Selector Page',
      url: 'https://example.com/current',
      text: 'x'.repeat(1000),
      selectorFound: true,
    });
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/default-selector', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), 'body');
    expect(querySelector).toHaveBeenCalledWith('body');
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('inspect passes provided selector and reports missing selector branch', async () => {
    const querySelector = jest.fn().mockReturnValue(null);
    global.document = { title: 'Missing Selector Page', querySelector };
    global.window = { location: { href: 'https://example.com/missing' } };

    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation((fn, selector) => Promise.resolve(fn(selector))),
    };
    const { runtime } = makeRuntime({ page: mockPage });

    const result = await runtime.inspect('https://example.com/missing-selector', '#does-not-exist');

    expect(result.success).toBe(true);
    expect(result.data.text).toBe('Selector not found');
    expect(result.data.selectorFound).toBe(false);
    expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), '#does-not-exist');
    expect(querySelector).toHaveBeenCalledWith('#does-not-exist');
  });

  test('executeScript navigates with default runtime options and returns evaluated result', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({ count: 3 }),
    };
    const { runtime, mockBrowser } = makeRuntime({ page: mockPage });

    const result = await runtime.executeScript('https://example.com/app', 'document.querySelectorAll("a").length');

    expect(result).toEqual({ success: true, result: { count: 3 } });
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/app', {
      waitUntil: 'networkidle',
      timeout: 10000,
    });
    expect(mockPage.evaluate).toHaveBeenCalledWith('document.querySelectorAll("a").length');
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('_withBrowser returns callback success result and closes browser', async () => {
    const { runtime, mockPage, mockBrowser } = makeRuntime();

    const result = await runtime._withBrowser(async (page) => {
      expect(page).toBe(mockPage);
      return { success: true, value: 42 };
    });

    expect(result).toEqual({ success: true, value: 42 });
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('_withBrowser returns error and closes browser when newPage fails after launch', async () => {
    const { runtime, mockBrowser } = makeRuntime({ newPageError: 'new page failed' });

    const result = await runtime._withBrowser(async () => ({ success: true }));

    expect(result).toEqual({ success: false, error: 'new page failed' });
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test('_withBrowser returns launch error when browser never opens', async () => {
    const { runtime, launch } = makeRuntime({ launchError: 'launch failed before browser' });

    const result = await runtime._withBrowser(async () => ({ success: true }));

    expect(result).toEqual({ success: false, error: 'launch failed before browser' });
    expect(launch).toHaveBeenCalledWith({ headless: true });
  });
});
