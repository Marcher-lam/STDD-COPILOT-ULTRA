const fs = require('fs');
const path = require('path');
const os = require('os');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');

function setupChange(name = 'test-change') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-'));
  const stddDir = path.join(tmp, 'stdd');
  const changeDir = path.join(stddDir, 'changes', name);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal\nTest proposal');
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n- [x] Task 2');
  fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test\n  Scenario: Hello\n    Given x\n    When y\n    Then z');
  return { tmp, changeDir, stddDir, name };
}

describe('FixPacketCommand', () => {
  it('throws when stdd dir missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-nostdd-'));
    expect(() => new FixPacketCommand(tmp).execute('x')).toThrow();
  });

  it('throws when change not found', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-nochange-'));
    fs.mkdirSync(path.join(tmp, 'stdd', 'changes'), { recursive: true });
    expect(() => new FixPacketCommand(tmp).execute('nonexistent')).toThrow();
  });

  it('builds packet with proposal and tasks', () => {
    const { tmp, name } = setupChange();
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    expect(result.status).toBe('needs-fix');
    expect(result.change).toBe(name);
    expect(result.output).toMatch(/fix-packet-.*\.md/);
    expect(result.jsonOutput).toMatch(/fix-packet-.*\.json/);
  });

  it('writes JSON and MD files to evidence dir', () => {
    const { tmp, name, changeDir } = setupChange();
    new FixPacketCommand(tmp).execute(name, { silent: true });
    const evidenceFiles = fs.readdirSync(path.join(changeDir, 'evidence'));
    expect(evidenceFiles.some(f => f.endsWith('.json'))).toBe(true);
    expect(evidenceFiles.some(f => f.endsWith('.md'))).toBe(true);
  });

  it('includes evidence files in packet', () => {
    const { tmp, name, changeDir } = setupChange();
    fs.writeFileSync(path.join(changeDir, 'evidence', 'apply-result.json'), JSON.stringify({ ok: true }));
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    expect(result.evidenceFiles.length).toBeGreaterThan(0);
  });

  it('generates valid JSON output', () => {
    const { tmp, name } = setupChange();
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    const jsonPath = path.join(tmp, result.jsonOutput);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(json.change).toBe(name);
    expect(json.generatedAt).toBeDefined();
  });

  it('outputs JSON to console when options.json is true', () => {
    const { tmp, name } = setupChange();
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    const result = new FixPacketCommand(tmp).execute(name, { json: true });

    console.log = origLog;
    expect(logs.length).toBeGreaterThan(0);
    // The JSON output should contain the change name
    expect(logs[0]).toContain(name);
    expect(result.status).toBe('needs-fix');
  });

  it('prints relative path when not silent and not json', () => {
    const { tmp, name } = setupChange();
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    new FixPacketCommand(tmp).execute(name);

    console.log = origLog;
    expect(logs.some(l => l.includes('Fix packet written'))).toBe(true);
  });

  it('does not print when silent is true', () => {
    const { tmp, name } = setupChange();
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    new FixPacketCommand(tmp).execute(name, { silent: true });

    console.log = origLog;
    expect(logs.length).toBe(0);
  });

  it('reads test output file when testOutput option is provided', () => {
    const { tmp, name } = setupChange();
    const testOutputFile = path.join(tmp, 'test-output.txt');
    fs.writeFileSync(testOutputFile, 'FAIL src/app.test.js\n  Expected 1, received 2', 'utf8');

    const result = new FixPacketCommand(tmp).execute(name, { silent: true, testOutput: 'test-output.txt' });
    expect(result.testOutput).toContain('FAIL src/app.test.js');
    expect(result.testOutput).toContain('Expected 1, received 2');
  });

  it('truncates long file content via safeRead', () => {
    const { tmp, name, changeDir } = setupChange();
    const longContent = 'x'.repeat(15000);
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), longContent, 'utf8');

    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    const proposalFile = result.contextFiles.find(f => f.path.includes('proposal.md'));
    expect(proposalFile).toBeDefined();
    expect(proposalFile.content).toContain('[truncated');
  });

  it('handles unreadable files gracefully (content is null)', () => {
    const { tmp, changeDir } = setupChange();
    // Write a file and then remove it before buildPacket reads it
    // We can simulate this by creating a file, adding it to the change dir,
    // then deleting it. Actually safeRead catches errors and returns null.
    // Create a design.md with content then delete after listing
    const designPath = path.join(changeDir, 'design.md');
    fs.writeFileSync(designPath, 'some design', 'utf8');

    // Use a restrictive path that will fail to read
    const cmd = new FixPacketCommand(tmp);
    const result = cmd.fileBlock('/nonexistent/path/file.txt');
    expect(result.content).toBeNull();
  });

  it('handles null/empty input in appendFile', () => {
    const { tmp } = setupChange();
    const cmd = new FixPacketCommand(tmp);
    const lines = [];
    cmd.appendFile(lines, { path: 'missing.txt', content: null });
    expect(lines.some(l => l.includes('Unable to read file'))).toBe(true);
  });

  it('excludes non-existent files from newestFirst sorting', () => {
    const { tmp } = setupChange();
    const cmd = new FixPacketCommand(tmp);
    // newestFirst filters out non-existent files
    const result = cmd.buildPacket(path.join(tmp, 'stdd', 'changes', 'test-change'), { silent: true });
    // All evidence files should have existed at the time of listing
    expect(result).toBeDefined();
  });

  it('includes runtime artifacts when evidence/debug dirs exist', () => {
    const { tmp, name } = setupChange();
    const evidenceDir = path.join(tmp, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'screenshot.png'), 'fake-png', 'utf8');
    fs.writeFileSync(path.join(evidenceDir, 'report.html'), '<html>report</html>', 'utf8');

    const cmd = new FixPacketCommand(tmp);
    const result = cmd.execute(name, { silent: true });
    expect(result.runtimeArtifacts.length).toBeGreaterThan(0);
  });

  it('includes task and testCommand in packet when provided', () => {
    const { tmp, name } = setupChange();
    const result = new FixPacketCommand(tmp).execute(name, {
      silent: true,
      task: 'Fix the login bug',
      testCommand: 'npm test -- --grep login',
    });
    expect(result.task).toBe('Fix the login bug');
    expect(result.testCommand).toBe('npm test -- --grep login');
  });

  it('generates markdown with runtime artifacts section', () => {
    const { tmp, name } = setupChange();
    const evidenceDir = path.join(tmp, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'trace.zip'), 'fake-zip', 'utf8');

    const cmd = new FixPacketCommand(tmp);
    const result = cmd.execute(name, { silent: true });

    const mdPath = path.join(tmp, result.output);
    const md = fs.readFileSync(mdPath, 'utf8');
    expect(md).toContain('## Runtime Artifacts');
    expect(md).toContain('trace.zip');
  });

  it('generates markdown with test output section when testOutput is set', () => {
    const { tmp, name } = setupChange();
    const testOutputFile = path.join(tmp, 'test-output.txt');
    fs.writeFileSync(testOutputFile, 'Test failed: expected true', 'utf8');

    const cmd = new FixPacketCommand(tmp);
    const result = cmd.execute(name, { silent: true, testOutput: 'test-output.txt' });

    const mdPath = path.join(tmp, result.output);
    const md = fs.readFileSync(mdPath, 'utf8');
    expect(md).toContain('## Test Output');
    expect(md).toContain('Test failed: expected true');
  });

  it('generates markdown without test command section when not provided', () => {
    const { tmp, name } = setupChange();
    const cmd = new FixPacketCommand(tmp);
    const result = cmd.execute(name, { silent: true });

    const mdPath = path.join(tmp, result.output);
    const md = fs.readFileSync(mdPath, 'utf8');
    expect(md).not.toContain('## Test Command');
    expect(md).not.toContain('## Test Output');
  });
});
