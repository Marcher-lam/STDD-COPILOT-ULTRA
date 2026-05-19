const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseBddScenarios } = require('../src/utils/bdd-scenario-parser');

describe('parseBddScenarios', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bdd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses Feature/Scenario/Given/When/Then', () => {
    const file = path.join(tmpDir, 'login.feature');
    fs.writeFileSync(file, [
      'Feature: User Login',
      '  Scenario: Successful login',
      '    Given user is on login page',
      '    When user enters credentials',
      '    Then user sees dashboard',
    ].join('\n'));
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios.length).toBe(1);
    expect(scenarios[0].name).toBe('Successful login');
    expect(scenarios[0].steps.length).toBe(3);
    expect(scenarios[0].steps[0]).toContain('Given');
    expect(scenarios[0].steps[2]).toContain('Then');
    expect(scenarios[0].source).toContain('login.feature');
  });

  it('handles multiple scenarios', () => {
    const file = path.join(tmpDir, 'multi.feature');
    fs.writeFileSync(file, [
      'Feature: Multi',
      '  Scenario: First',
      '    Given step 1',
      '  Scenario: Second',
      '    Given step 2',
    ].join('\n'));
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios.length).toBe(2);
    expect(scenarios[0].name).toBe('First');
    expect(scenarios[1].name).toBe('Second');
  });

  it('handles And/But steps', () => {
    const file = path.join(tmpDir, 'and.feature');
    fs.writeFileSync(file, [
      'Scenario: Complex',
      '  Given precondition',
      '  And another precondition',
      '  When action',
      '  But not this',
      '  Then result',
    ].join('\n'));
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios[0].steps.length).toBe(5);
  });

  it('handles markdown-style headings', () => {
    const file = path.join(tmpDir, 'doc.md');
    fs.writeFileSync(file, [
      '## Scenario: From markdown',
      '  Given markdown step',
    ].join('\n'));
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios.length).toBe(1);
    expect(scenarios[0].name).toBe('From markdown');
  });

  it('returns empty for files with no scenarios', () => {
    const file = path.join(tmpDir, 'empty.md');
    fs.writeFileSync(file, '# Just a heading\nSome text\n');
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios).toEqual([]);
  });

  it('handles empty file list', () => {
    expect(parseBddScenarios([], tmpDir)).toEqual([]);
  });

  it('strips list markers from steps', () => {
    const file = path.join(tmpDir, 'list.feature');
    fs.writeFileSync(file, [
      'Scenario: List steps',
      '- Given precondition',
      '- When action',
    ].join('\n'));
    const scenarios = parseBddScenarios([file], tmpDir);
    expect(scenarios[0].steps[0]).toBe('Given precondition');
    expect(scenarios[0].steps[1]).toBe('When action');
  });
});
