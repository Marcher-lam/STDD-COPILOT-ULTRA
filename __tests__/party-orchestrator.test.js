const { PartyOrchestrator } = require('../src/runtime/party-orchestrator');

describe('PartyOrchestrator', () => {
  it('creates with noop executor by default', () => {
    const po = new PartyOrchestrator();
    expect(po.executorType).toBe('noop');
    expect(po.maxRounds).toBe(2);
  });

  it('creates with custom options', () => {
    const po = new PartyOrchestrator({ maxRounds: 3, timeout: 30000 });
    expect(po.maxRounds).toBe(3);
    expect(po.timeout).toBe(30000);
  });

  it('executes a noop party with valid roles', async () => {
    const po = new PartyOrchestrator({ executorType: 'noop' });
    const result = await po.execute('test topic', ['po', 'developer'], {
      context: { techStack: 'Node.js' },
    });

    expect(result).toHaveProperty('topic', 'test topic');
    expect(result.participants).toHaveLength(2);
    expect(result.rounds).toHaveLength(2);
    expect(result).toHaveProperty('convergence');
    expect(result).toHaveProperty('createdAt');
  });

  it('throws for empty role list', async () => {
    const po = new PartyOrchestrator();
    await expect(po.execute('topic', [])).rejects.toThrow('No valid participants');
  });

  it('filters invalid role IDs', async () => {
    const po = new PartyOrchestrator({ executorType: 'noop' });
    const result = await po.execute('topic', ['po', 'nonexistent']);
    expect(result.participants).toHaveLength(1);
  });

  it('calls onAgentComplete callback for each agent', async () => {
    const completions = [];
    const po = new PartyOrchestrator({ executorType: 'noop' });
    await po.execute('topic', ['po', 'tester'], {
      rounds: 1,
      onAgentComplete: (output) => completions.push(output),
    });
    expect(completions).toHaveLength(2);
    expect(completions[0]).toHaveProperty('role');
    expect(completions[0]).toHaveProperty('response');
  });

  it('builds agent prompt with persona name and topic', () => {
    const po = new PartyOrchestrator();
    const persona = require('../src/config/persona-profiles').PERSONA_PROFILES.po;
    const role = require('../src/config/role-definitions').ROLE_DEFINITIONS.po;
    const prompt = po._buildAgentPrompt(
      { id: 'po', persona, role },
      'auth design', '', 1, 2, {}
    );
    expect(prompt).toContain('Maya Chen');
    expect(prompt).toContain('auth design');
    expect(prompt).toContain('opening round');
  });

  it('includes shared context in round 2+', () => {
    const po = new PartyOrchestrator();
    const persona = require('../src/config/persona-profiles').PERSONA_PROFILES.developer;
    const role = require('../src/config/role-definitions').ROLE_DEFINITIONS.developer;
    const prompt = po._buildAgentPrompt(
      { id: 'developer', persona, role },
      'test', 'Previous discussion here', 2, 2, {}
    );
    expect(prompt).toContain('round 2 of 2');
    expect(prompt).toContain('Previous discussion');
  });

  it('synthesizes rounds with theme detection', () => {
    const po = new PartyOrchestrator();
    const result = po._synthesizeRound([
      { response: 'We should consider security. I recommend OAuth. This is important.', status: 'success' },
      { response: 'I agree. We must prioritize this. I suggest we should proceed.', status: 'success' },
    ]);
    expect(result.agreements.length + result.themes.length).toBeGreaterThan(0);
  });

  it('detects convergence trend across rounds', () => {
    const po = new PartyOrchestrator();
    const convergence = po._detectConvergence([
      { summary: { agreements: ['agree'], disagreements: ['however'] } },
      { summary: { agreements: ['agree', 'consensus'], disagreements: [] } },
    ]);
    expect(convergence.trend).toBe('converging');
    expect(convergence.score).toBeGreaterThan(0);
  });

  it('returns insufficient-data for single round', () => {
    const po = new PartyOrchestrator();
    const convergence = po._detectConvergence([
      { summary: { agreements: [], disagreements: [] } },
    ]);
    expect(convergence.trend).toBe('insufficient-data');
  });
});
