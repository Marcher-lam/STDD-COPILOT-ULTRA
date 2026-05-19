const fs = require('fs');
const path = require('path');
const os = require('os');
const { StoryCommand } = require('../src/cli/commands/story');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-story-'));
  fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
  return tmp;
}

describe('StoryCommand', () => {
  it('create generates YAML journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'login-flow');
    expect(result.status).toBe('created');
    expect(fs.existsSync(result.path)).toBe(true);
    const content = fs.readFileSync(result.path, 'utf8');
    expect(content).toContain('persona:');
    expect(content).toContain('steps:');
  });

  it('create throws on duplicate without --force', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'dup');
    expect(() => cmd.execute('create', 'dup')).toThrow();
  });

  it('create with --force overwrites', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'dup');
    const result = cmd.execute('create', 'dup', { force: true });
    expect(result.status).toBe('created');
  });

  it('create sanitizes name', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'Hello World!');
    expect(result.path).toContain('hello-world');
  });

  it('bdd generates feature file from journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'checkout');
    const journeyFile = path.join(tmp, 'stdd', 'journeys', 'checkout.yaml');
    const result = cmd.execute('bdd', journeyFile);
    expect(result.status).toBe('generated');
    expect(fs.existsSync(result.path)).toBe(true);
    const content = fs.readFileSync(result.path, 'utf8');
    expect(content).toContain('Feature:');
  });

  it('bdd throws on missing journey file', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    expect(() => cmd.execute('bdd', '/nonexistent.yaml')).toThrow();
  });

  it('create with --json outputs JSON to console', () => {
    const tmp = setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'json-test', { json: true });
    expect(result.status).toBe('created');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "created"'));
    logSpy.mockRestore();
  });

  it('bdd with --json outputs JSON to console', () => {
    const tmp = setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'bdd-json');
    const journeyFile = path.join(tmp, 'stdd', 'journeys', 'bdd-json.yaml');
    const result = cmd.execute('bdd', journeyFile, { json: true });
    expect(result.status).toBe('generated');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "generated"'));
    logSpy.mockRestore();
  });

  it('execute with default params creates a journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    // action defaults to 'create', name defaults to 'journey'
    const result = cmd.execute();
    expect(result.status).toBe('created');
    expect(result.path).toContain('journey.yaml');
  });

  it('create sanitizes falsy name to journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', null);
    expect(result.journey.name).toBe('journey');
  });

  it('create uses custom persona and goal', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'test', { persona: 'admin', goal: 'deploy app' });
    expect(result.journey.persona).toBe('admin');
    expect(result.journey.goal).toBe('deploy app');
  });

  it('bdd handles journey without name/goal/persona/steps', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    // Write a minimal journey YAML without name, goal, persona, steps
    const dir = path.join(tmp, 'stdd', 'journeys');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'minimal.yaml');
    fs.writeFileSync(filePath, 'foo: bar\n', 'utf8');
    const result = cmd.execute('bdd', filePath);
    expect(result.status).toBe('generated');
    const content = fs.readFileSync(result.path, 'utf8');
    // journey.goal is undefined, journey.name is undefined => Feature: undefined
    // This tests the fallback branches where goal and name are both falsy
    expect(content).toContain('Feature: undefined');
    // persona falls back to 'user' in scenario line
    expect(content).toContain('Scenario: user completes undefined');
    // The output filename falls back to path basename
    expect(result.path).toContain('minimal.feature');
  });
});
