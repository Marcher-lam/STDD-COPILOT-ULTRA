const fs = require('fs');
const os = require('os');
const path = require('path');
const { ExtensionsCommand } = require('../src/cli/commands/extensions');

describe('ExtensionsCommand security boundaries', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ext-sec-'));
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
  });

  function makeExtension(name) {
    const source = path.join(root, 'source-ext');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'extension.json'), JSON.stringify({ name, version: '1.0.0' }), 'utf8');
    return source;
  }

  test.each(['../evil', 'nested/evil', '/tmp/evil', 'bad name'])('rejects unsafe manifest name %s', (name) => {
    const source = makeExtension(name);
    expect(() => new ExtensionsCommand(root).install(source)).toThrow(/Invalid extension name/);
    expect(fs.existsSync(path.join(root, 'stdd', 'extensions', 'evil'))).toBe(false);
  });

  test('installs valid extension inside installed directory', () => {
    const source = makeExtension('safe-extension');
    new ExtensionsCommand(root).install(source, { json: true });
    expect(fs.existsSync(path.join(root, 'stdd', 'extensions', 'installed', 'safe-extension', 'extension.json'))).toBe(true);
  });
});
