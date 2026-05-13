const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveChangeDir, validateChangeName } = require('../src/utils/change-utils');

describe('change-utils security boundaries', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-change-utils-'));
    fs.mkdirSync(path.join(root, 'stdd', 'changes', 'safe-change'), { recursive: true });
  });

  test('resolves valid change names inside stdd/changes', () => {
    const stddDir = path.join(root, 'stdd');
    expect(resolveChangeDir(stddDir, 'safe-change')).toBe(path.join(stddDir, 'changes', 'safe-change'));
  });

  test.each(['../evil', '..evil', 'nested/change', '/tmp/evil', 'bad name'])('rejects unsafe change name %s', (name) => {
    expect(() => validateChangeName(name)).toThrow(/Invalid change name/);
  });

  test('returns null for missing safe change names', () => {
    expect(resolveChangeDir(path.join(root, 'stdd'), 'missing-change')).toBeNull();
  });
});
