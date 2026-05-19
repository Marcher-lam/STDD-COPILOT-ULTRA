const path = require('path');
const fs = require('fs');
const { BrowserController } = require('./browser-controller');
const { createLogger } = require('../utils/logger');
const log = createLogger('BrowserRuntime');

class BrowserRuntime extends BrowserController {
  constructor(cwd = process.cwd()) {
    super(path.join(cwd, 'stdd', 'evidence'));
    this.cwd = cwd;
    this.playwright = null;
  }

  // Lazy load playwright to avoid errors if not installed
  getBrowser() {
    if (this.playwright) return this.playwright;
    try {
      this.playwright = require('playwright');
      return this.playwright;
    } catch (error) {
      throw new Error(
        'Playwright is not installed. Please run:\n' +
        '  npm install playwright\n' +
        '  npx playwright install'
      );
    }
  }

  async snapshot(url, options = {}) {
    const viewport = {
      width: options.width || 1280,
      height: options.height || 720,
    };
    const outputDir = path.join(this.cwd, 'stdd', 'evidence');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${path.basename(url)}-${timestamp}.png`;
    const filePath = path.join(outputDir, filename);

    log.info(`Capturing snapshot: ${url}`);

    return this._withBrowser(async (page) => {
      await page.setViewportSize(viewport);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.screenshot({ path: filePath, fullPage: false });
      log.info(`Snapshot saved to: ${filePath}`);
      return { success: true, path: filePath, relativePath: path.relative(this.cwd, filePath) };
    });
  }

  async inspect(url, selector = 'body') {
    log.info(`Inspecting: ${url} (selector: ${selector})`);

    return this._withBrowser(async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Extract text content, title, and URL
      const data = await page.evaluate((sel) => {
        /* global document, window */
        const element = document.querySelector(sel);
        return {
          title: document.title,
          url: window.location.href,
          text: element ? element.innerText.substring(0, 1000) : 'Selector not found',
          selectorFound: !!element
        };
      }, selector);

      log.info(`Page Title: ${data.title}`);
      return { success: true, data };
    });
  }

  async executeScript(url, script) {
    log.info(`Executing script on: ${url}`);

    return this._withBrowser(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const result = await page.evaluate(script);
      return { success: true, result };
    });
  }

  /**
   * Shared browser lifecycle helper — launches a headless browser,
   * runs the given callback with a fresh page, and always closes the browser.
   * Returns { success: false, error } on failure.
   */
  async _withBrowser(callback) {
    let browser;
    try {
      browser = await this.getBrowser().chromium.launch({ headless: true });
      const page = await browser.newPage();
      return await callback(page);
    } catch (error) {
      console.error(`[BrowserRuntime] Error: ${error.message}`); // keep error output
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = { BrowserRuntime };
