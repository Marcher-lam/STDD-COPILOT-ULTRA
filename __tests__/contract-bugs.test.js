const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-contract-'));
}

function makeProject(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
  fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
  return stdd;
}

describe('contract.js bug fixes', () => {
  describe('generate: missing api spec', () => {
    it('throws descriptive error when api spec not found', async () => {
      const root = makeTmp();
      makeProject(root);
      const { ContractCommand } = require('../src/cli/commands/contract');
      const cmd = new ContractCommand(root);

      await expect(cmd.generate('ghost-change', {}))
        .rejects.toThrow('API spec not found');
    });
  });

  describe('verify: missing contracts directory', () => {
    it('throws descriptive error when contracts not found', async () => {
      const root = makeTmp();
      makeProject(root);
      const { ContractCommand } = require('../src/cli/commands/contract');
      const cmd = new ContractCommand(root);

      await expect(cmd.verify('ghost-change', {}))
        .rejects.toThrow('Contracts directory not found');
    });
  });

  describe('verify: invalid JSON in contract file', () => {
    it('throws descriptive error with filename', async () => {
      const root = makeTmp();
      const stdd = makeProject(root);
      const changeDir = path.join(stdd, 'changes', 'my-change');
      fs.mkdirSync(path.join(changeDir, 'specs', 'contracts'), { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, 'specs', 'contracts', 'bad.json'),
        '{invalid json content}'
      );

      const { ContractCommand } = require('../src/cli/commands/contract');
      const cmd = new ContractCommand(root);

      await expect(cmd.verify('my-change', {}))
        .rejects.toThrow('Invalid JSON in contract file bad.json');
    });
  });
});

describe('mock-gen.js bug fixes', () => {
  describe('generateMockData: missing responses', () => {
    it('returns placeholder when operation.responses is undefined', () => {
      const { MockGenCommand } = require('../src/cli/commands/mock-gen');
      const cmd = new MockGenCommand();

      const result = cmd.generateMockData({}, 'GET', '/api/test');

      expect(result).toBeDefined();
      expect(result.method).toBe('GET');
      expect(result.path).toBe('/api/test');
    });

    it('returns placeholder when operation.responses is null', () => {
      const { MockGenCommand } = require('../src/cli/commands/mock-gen');
      const cmd = new MockGenCommand();

      const result = cmd.generateMockData({ responses: null }, 'POST', '/api/items');

      expect(result).toBeDefined();
      expect(result.method).toBe('POST');
    });
  });
});

describe('depcheck template literal stripping', () => {
  it('does not report msw as missing after template stripping', async () => {
    const root = makeTmp();
    const srcDir = path.join(root, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { express: '^4.0.0' },
    }));
    // Write a file with msw inside template literal
    fs.writeFileSync(path.join(srcDir, 'template.js'), `
const x = \`const { http } = require('msw');\`;
const app = require('express');
`);

    const { DepcheckCommand } = require('../src/cli/commands/depcheck');
    const cmd = new DepcheckCommand();
    const result = await cmd.execute({ path: root, json: true });

    expect(result.missing).not.toContain('msw');
    expect(result.unused).not.toContain('express');
  });
});
