const { CrossTalkAnalyzer } = require('../src/runtime/cross-talk-analyzer');

describe('CrossTalkAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CrossTalkAnalyzer();
  });

  it('returns empty analysis for null input', () => {
    const result = analyzer.analyze(null);
    expect(result.agreements).toEqual([]);
    expect(result.convergenceScore).toBe(0);
  });

  it('detects agreements between agents', () => {
    const partyResult = {
      rounds: [{
        agents: [
          { name: 'Maya', role: 'po', response: 'I agree with this approach. We should proceed.', status: 'success' },
          { name: 'Alex', role: 'developer', response: 'I agree as well. Absolutely the right call.', status: 'success' },
        ],
      }],
    };

    const result = analyzer.analyze(partyResult);
    expect(result.agreements.length).toBeGreaterThan(0);
  });

  it('detects disagreements', () => {
    const partyResult = {
      rounds: [{
        agents: [
          { name: 'Wei', role: 'architect', response: 'However, I have concerns about this design.', status: 'success' },
          { name: 'Shield', role: 'security', response: 'There is a risk here. I disagree with the approach.', status: 'success' },
        ],
      }],
    };

    const result = analyzer.analyze(partyResult);
    expect(result.disagreements.length).toBeGreaterThan(0);
  });

  it('extracts unique insights from agents with substantial responses', () => {
    const partyResult = {
      rounds: [{
        agents: [
          { name: 'Sam', role: 'tester', response: 'x'.repeat(200), status: 'success' },
          { name: 'Rex', role: 'reviewer', response: 'short', status: 'success' },
        ],
      }],
    };

    const result = analyzer.analyze(partyResult);
    expect(result.uniqueInsights).toHaveLength(1);
    expect(result.uniqueInsights[0].agent).toBe('Sam');
  });

  it('builds influence matrix across rounds', () => {
    const partyResult = {
      rounds: [
        { agents: [{ name: 'Maya', role: 'po', response: 'Scope should be limited.', status: 'success' }] },
        { agents: [{ name: 'Alex', role: 'developer', response: 'Building on Maya\'s point about scope.', status: 'success' }] },
      ],
    };

    const result = analyzer.analyze(partyResult);
    expect(result.influenceMatrix.Alex).toBeTruthy();
    expect(result.influenceMatrix.Alex.influenced).toContain('Maya');
  });

  it('computes convergence score between 0 and 100', () => {
    const partyResult = {
      rounds: [{
        agents: [
          { name: 'A', role: 'po', response: 'I agree with the consensus.', status: 'success' },
          { name: 'B', role: 'developer', response: 'Aligned on this.', status: 'success' },
        ],
      }],
    };

    const result = analyzer.analyze(partyResult);
    expect(result.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.convergenceScore).toBeLessThanOrEqual(100);
  });

  it('higher agreements yield higher convergence score', () => {
    const lowResult = analyzer.analyze({
      rounds: [{ agents: [
        { name: 'A', role: 'po', response: 'Maybe.', status: 'success' },
        { name: 'B', role: 'dev', response: 'Unsure.', status: 'success' },
      ]}],
    });

    const highResult = analyzer.analyze({
      rounds: [{ agents: [
        { name: 'A', role: 'po', response: 'I absolutely agree. We have consensus. Correct approach.', status: 'success' },
        { name: 'B', role: 'dev', response: 'I agree. Spot on. Common ground here. Exactly right.', status: 'success' },
      ]}],
    });

    expect(highResult.convergenceScore).toBeGreaterThan(lowResult.convergenceScore);
  });
});
