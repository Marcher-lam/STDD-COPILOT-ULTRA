const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const log = createLogger('visual-regression');

const VISUAL_DIR = 'stdd/evidence/visual';
const BASELINES_DIR = path.join(VISUAL_DIR, 'baselines');
const DIFFS_DIR = path.join(VISUAL_DIR, 'diffs');

const DEFAULT_THRESHOLD = 0.01; // 1%

class VisualRegression {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.baselinesDir = path.join(cwd, BASELINES_DIR);
    this.diffsDir = path.join(cwd, DIFFS_DIR);
    this._pixelmatch = null;
    this._PNG = null;
    this._loadOptionalDeps();
  }

  _loadOptionalDeps() {
    try {
      this._pixelmatch = require('pixelmatch');
      this._PNG = require('pngjs').PNG;
    } catch {
      log.debug('pixelmatch/pngjs not installed — using fallback comparison');
    }
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Save a screenshot buffer as a baseline image
   * @param {Buffer} imageBuffer - PNG screenshot buffer
   * @param {string} name - Baseline name (e.g. 'homepage')
   * @returns {string} Path to saved baseline
   */
  saveBaseline(imageBuffer, name) {
    this._ensureDir(this.baselinesDir);
    const filename = `${name}-baseline.png`;
    const filePath = path.join(this.baselinesDir, filename);
    fs.writeFileSync(filePath, imageBuffer);
    log.debug(`Baseline saved: ${filePath}`);
    return filePath;
  }

  /**
   * Get the path to an existing baseline
   * @param {string} name - Baseline name
   * @returns {string|null} Path to baseline or null if not found
   */
  getBaselinePath(name) {
    const filePath = path.join(this.baselinesDir, `${name}-baseline.png`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  /**
   * Save a current screenshot for comparison
   * @param {Buffer} imageBuffer - PNG screenshot buffer
   * @param {string} name - Snapshot name
   * @returns {string} Path to saved current image
   */
  saveCurrent(imageBuffer, name) {
    this._ensureDir(this.diffsDir);
    const filePath = path.join(this.diffsDir, `${name}-current.png`);
    fs.writeFileSync(filePath, imageBuffer);
    return filePath;
  }

  /**
   * Compare two screenshots and return the diff ratio
   * @param {string} baselinePath - Path to baseline PNG
   * @param {string} currentPath - Path to current PNG
   * @returns {{ diffRatio: number, diffPixels: number, totalPixels: number, diffImagePath: string|null, passed: boolean }}
   */
  async compareScreenshots(baselinePath, currentPath, threshold = DEFAULT_THRESHOLD) {
    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline not found: ${baselinePath}`);
    }
    if (!fs.existsSync(currentPath)) {
      throw new Error(`Current screenshot not found: ${currentPath}`);
    }

    if (this._pixelmatch && this._PNG) {
      return this._compareWithPixelmatch(baselinePath, currentPath, threshold);
    }
    return this._compareFallback(baselinePath, currentPath, threshold);
  }

  async _compareWithPixelmatch(baselinePath, currentPath, threshold) {
    const baselineData = fs.readFileSync(baselinePath);
    const currentData = fs.readFileSync(currentPath);

    const imgA = this._PNG.sync.read(baselineData);
    const imgB = this._PNG.sync.read(currentData);

    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
      const totalPixels = Math.max(imgA.width * imgA.height, imgB.width * imgB.height);
      return {
        diffRatio: 1,
        diffPixels: totalPixels,
        totalPixels,
        diffImagePath: null,
        passed: false,
        sizeMismatch: true,
        baselineSize: { width: imgA.width, height: imgA.height },
        currentSize: { width: imgB.width, height: imgB.height },
      };
    }

    const { width, height } = imgA;
    const totalPixels = width * height;
    const diffImg = new this._PNG({ width, height });

    const diffPixels = this._pixelmatch(
      imgA.data, imgB.data, diffImg.data,
      width, height,
      { threshold: 0.1 }
    );

    const diffRatio = diffPixels / totalPixels;
    let diffImagePath = null;

    if (diffPixels > 0) {
      this._ensureDir(this.diffsDir);
      const name = path.basename(baselinePath, '-baseline.png');
      diffImagePath = path.join(this.diffsDir, `${name}-diff.png`);
      fs.writeFileSync(diffImagePath, this._PNG.sync.write(diffImg));
    }

    return {
      diffRatio,
      diffPixels,
      totalPixels,
      diffImagePath,
      passed: diffRatio <= threshold,
    };
  }

  _compareFallback(baselinePath, currentPath, threshold) {
    const baselineBuf = fs.readFileSync(baselinePath);
    const currentBuf = fs.readFileSync(currentPath);

    // Quick exact match check
    if (baselineBuf.equals(currentBuf)) {
      return {
        diffRatio: 0,
        diffPixels: 0,
        totalPixels: baselineBuf.length,
        diffImagePath: null,
        passed: true,
        fallback: true,
      };
    }

    // Byte-level diff: count differing bytes as a rough ratio
    const len = Math.min(baselineBuf.length, currentBuf.length);
    const maxLen = Math.max(baselineBuf.length, currentBuf.length);
    let diffBytes = maxLen - len; // size difference counts as diffs

    for (let i = 0; i < len; i++) {
      if (baselineBuf[i] !== currentBuf[i]) diffBytes++;
    }

    const diffRatio = diffBytes / maxLen;
    return {
      diffRatio,
      diffPixels: diffBytes,
      totalPixels: maxLen,
      diffImagePath: null,
      passed: diffRatio <= threshold,
      fallback: true,
      note: 'Install pixelmatch + pngjs for pixel-accurate comparison: npm install pixelmatch pngjs',
    };
  }

  /**
   * List all stored baselines
   * @returns {string[]} Baseline names
   */
  listBaselines() {
    if (!fs.existsSync(this.baselinesDir)) return [];
    return fs.readdirSync(this.baselinesDir)
      .filter(f => f.endsWith('-baseline.png'))
      .map(f => f.replace('-baseline.png', ''));
  }

  /**
   * Run visual check: take screenshot via BrowserController, compare with baseline
   * @param {string} url - URL to screenshot
   * @param {string} name - Snapshot name
   * @param {object} options - { threshold, width, height }
   * @returns {object} Comparison result
   */
  async runVisualCheck(url, name, options = {}) {
    const { BrowserController } = require('../runtime/browser-controller');
    const controller = new BrowserController(path.join(this.cwd, VISUAL_DIR));
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;

    // Take screenshot
    const snapshot = await controller.snapshot({
      url,
      width: options.width || 1280,
      height: options.height || 800,
    });

    const currentImage = fs.readFileSync(snapshot.filePath);
    const baselinePath = this.getBaselinePath(name);

    if (!baselinePath) {
      // No baseline yet — save this as the first baseline
      this.saveBaseline(currentImage, name);
      return {
        status: 'baseline_created',
        message: `No baseline found for "${name}". Current screenshot saved as new baseline.`,
        baselinePath: this.getBaselinePath(name),
        passed: true,
      };
    }

    // Save current for comparison
    const currentPath = this.saveCurrent(currentImage, name);
    const result = await this.compareScreenshots(baselinePath, currentPath, threshold);
    return { status: 'compared', name, url, threshold, ...result };
  }
}

module.exports = { VisualRegression, VISUAL_DIR, BASELINES_DIR, DIFFS_DIR, DEFAULT_THRESHOLD };
