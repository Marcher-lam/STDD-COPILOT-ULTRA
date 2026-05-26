const fs = require('fs');
const path = require('path');
const os = require('os');
const { VisualRegression, VISUAL_DIR, BASELINES_DIR, DIFFS_DIR, DEFAULT_THRESHOLD } = require('../src/utils/visual-regression');

describe('VisualRegression', () => {
  let tempDir;
  let vr;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-vr-test-'));
    vr = new VisualRegression(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('sets directories relative to cwd', () => {
      expect(vr.baselinesDir).toBe(path.join(tempDir, BASELINES_DIR));
      expect(vr.diffsDir).toBe(path.join(tempDir, DIFFS_DIR));
    });

    test('default threshold is 1%', () => {
      expect(DEFAULT_THRESHOLD).toBe(0.01);
    });
  });

  describe('saveBaseline', () => {
    test('saves image buffer as baseline', () => {
      const buf = Buffer.from('fake-png-data');
      const savedPath = vr.saveBaseline(buf, 'homepage');
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(savedPath).toMatch(/homepage-baseline\.png$/);
      expect(fs.readFileSync(savedPath)).toEqual(buf);
    });

    test('creates baselines directory if not exists', () => {
      expect(fs.existsSync(vr.baselinesDir)).toBe(false);
      vr.saveBaseline(Buffer.from('data'), 'test');
      expect(fs.existsSync(vr.baselinesDir)).toBe(true);
    });

    test('overwrites existing baseline', () => {
      vr.saveBaseline(Buffer.from('v1'), 'page');
      vr.saveBaseline(Buffer.from('v2'), 'page');
      const data = fs.readFileSync(path.join(vr.baselinesDir, 'page-baseline.png'));
      expect(data.toString()).toBe('v2');
    });
  });

  describe('getBaselinePath', () => {
    test('returns path if baseline exists', () => {
      vr.saveBaseline(Buffer.from('data'), 'homepage');
      const p = vr.getBaselinePath('homepage');
      expect(p).toBeTruthy();
      expect(fs.existsSync(p)).toBe(true);
    });

    test('returns null if baseline does not exist', () => {
      expect(vr.getBaselinePath('nonexistent')).toBeNull();
    });
  });

  describe('saveCurrent', () => {
    test('saves current screenshot to diffs dir', () => {
      const buf = Buffer.from('current-data');
      const savedPath = vr.saveCurrent(buf, 'test');
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(savedPath).toMatch(/test-current\.png$/);
    });

    test('creates diffs directory if not exists', () => {
      expect(fs.existsSync(vr.diffsDir)).toBe(false);
      vr.saveCurrent(Buffer.from('data'), 'test');
      expect(fs.existsSync(vr.diffsDir)).toBe(true);
    });
  });

  describe('listBaselines', () => {
    test('returns empty array when no baselines', () => {
      expect(vr.listBaselines()).toEqual([]);
    });

    test('lists all baseline names', () => {
      vr.saveBaseline(Buffer.from('a'), 'page1');
      vr.saveBaseline(Buffer.from('b'), 'page2');
      const names = vr.listBaselines();
      expect(names.sort()).toEqual(['page1', 'page2']);
    });

    test('ignores non-baseline files', () => {
      fs.mkdirSync(vr.baselinesDir, { recursive: true });
      fs.writeFileSync(path.join(vr.baselinesDir, 'other.png'), 'data');
      vr.saveBaseline(Buffer.from('a'), 'page1');
      expect(vr.listBaselines()).toEqual(['page1']);
    });
  });

  describe('compareScreenshots (fallback mode)', () => {
    test('returns diffRatio 0 for identical files', async () => {
      const buf = Buffer.from('identical-png-data');
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, buf);
      fs.writeFileSync(currentPath, buf);

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.diffRatio).toBe(0);
      expect(result.passed).toBe(true);
      expect(result.fallback).toBe(true);
    });

    test('returns diffRatio > 0 for different files', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('aaaa'));
      fs.writeFileSync(currentPath, Buffer.from('bbbb'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.diffRatio).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
    });

    test('throws if baseline does not exist', async () => {
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(currentPath, 'data');
      await expect(vr.compareScreenshots('/nonexistent', currentPath)).rejects.toThrow('Baseline not found');
    });

    test('throws if current does not exist', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      fs.writeFileSync(baselinePath, 'data');
      await expect(vr.compareScreenshots(baselinePath, '/nonexistent')).rejects.toThrow('Current screenshot not found');
    });

    test('respects custom threshold', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      // 1 byte different out of 4 = 25% diff
      fs.writeFileSync(baselinePath, Buffer.from('aaaa'));
      fs.writeFileSync(currentPath, Buffer.from('abaa'));

      const result = await vr.compareScreenshots(baselinePath, currentPath, 0.5);
      expect(result.diffRatio).toBe(0.25);
      expect(result.passed).toBe(true); // 25% < 50% threshold
    });

    test('size difference counts as diff', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('aaaa'));
      fs.writeFileSync(currentPath, Buffer.from('aaaaaa'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.diffRatio).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
    });
  });

  describe('compareScreenshots (pixelmatch mode)', () => {
    let mockPixelmatch;
    let MockPNG;

    beforeEach(() => {
      mockPixelmatch = jest.fn((imgA, imgB, out, w, h) => {
        // Simulate some pixel differences
        return Math.floor(w * h * 0.005); // 0.5% diff
      });
      MockPNG = jest.fn().mockImplementation(({ width, height }) => ({
        width, height,
        data: Buffer.alloc(width * height * 4, 0),
      }));
      MockPNG.sync = {
        read: jest.fn((buf) => ({
          width: 100, height: 100,
          data: Buffer.alloc(100 * 100 * 4, 0),
        })),
        write: jest.fn((img) => Buffer.alloc(100)),
      };
      // Inject mocks
      vr._pixelmatch = mockPixelmatch;
      vr._PNG = MockPNG;
    });

    test('uses pixelmatch when available', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('fake'));
      fs.writeFileSync(currentPath, Buffer.from('fake'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(mockPixelmatch).toHaveBeenCalled();
      expect(result.diffPixels).toBe(50); // 0.5% of 10000
      expect(result.diffRatio).toBeCloseTo(0.005, 3);
    });

    test('detects size mismatch', async () => {
      // Make second call return different size
      MockPNG.sync.read
        .mockReturnValueOnce({ width: 100, height: 100, data: Buffer.alloc(100 * 100 * 4, 0) })
        .mockReturnValueOnce({ width: 200, height: 100, data: Buffer.alloc(200 * 100 * 4, 0) });

      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('fake'));
      fs.writeFileSync(currentPath, Buffer.from('fake'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.sizeMismatch).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.baselineSize).toEqual({ width: 100, height: 100 });
      expect(result.currentSize).toEqual({ width: 200, height: 100 });
    });

    test('saves diff image when pixels differ', async () => {
      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('fake'));
      fs.writeFileSync(currentPath, Buffer.from('fake'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.diffImagePath).toBeTruthy();
      expect(fs.existsSync(result.diffImagePath)).toBe(true);
    });

    test('no diff image when pixels match exactly', async () => {
      mockPixelmatch.mockReturnValue(0);

      const baselinePath = path.join(tempDir, 'baseline.png');
      const currentPath = path.join(tempDir, 'current.png');
      fs.writeFileSync(baselinePath, Buffer.from('fake'));
      fs.writeFileSync(currentPath, Buffer.from('fake'));

      const result = await vr.compareScreenshots(baselinePath, currentPath);
      expect(result.diffImagePath).toBeNull();
      expect(result.passed).toBe(true);
    });
  });

  describe('runVisualCheck', () => {
    test('creates baseline when none exists', async () => {
      // Mock BrowserController
      jest.doMock('../src/runtime/browser-controller', () => ({
        BrowserController: jest.fn().mockImplementation(() => ({
          snapshot: jest.fn().mockResolvedValue({
            filePath: path.join(tempDir, 'mock-snap.png'),
            relativePath: 'mock-snap.png',
          }),
        })),
      }));

      const snapDir = path.join(tempDir, VISUAL_DIR);
      fs.mkdirSync(snapDir, { recursive: true });
      const snapPath = path.join(tempDir, 'mock-snap.png');
      fs.writeFileSync(snapPath, Buffer.from('snap-data'));

      // Directly test via VR instance
      const result = await vr.runVisualCheck('http://example.com', 'test-page');
      expect(result.status).toBe('baseline_created');
      expect(result.passed).toBe(true);
      expect(vr.getBaselinePath('test-page')).toBeTruthy();
    });
  });
});

describe('EvidenceCapture with visual results', () => {
  const EvidenceCapture = require('../src/utils/evidence-capture');

  test('determineStatus passes with visual null', () => {
    const ec = new EvidenceCapture();
    const results = {
      tasks: { allDone: true },
      tests: { passed: true },
      constitution: { status: 'pass' },
      lint: null,
      visual: null,
    };
    expect(ec._determineStatus(results, 'verify')).toBe('pass');
  });

  test('determineStatus fails when visual fails', () => {
    const ec = new EvidenceCapture();
    const results = {
      tasks: { allDone: true },
      tests: { passed: true },
      constitution: { status: 'pass' },
      lint: null,
      visual: { passed: false },
    };
    expect(ec._determineStatus(results, 'verify')).toBe('fail');
  });

  test('determineStatus passes when visual passes', () => {
    const ec = new EvidenceCapture();
    const results = {
      tasks: { allDone: true },
      tests: { passed: true },
      constitution: { status: 'pass' },
      lint: null,
      visual: { passed: true },
    };
    expect(ec._determineStatus(results, 'verify')).toBe('pass');
  });
});
