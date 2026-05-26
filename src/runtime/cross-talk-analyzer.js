/**
 * Cross-Talk Analyzer
 * Analyzes multi-agent discussion outputs to extract agreements,
 * disagreements, unique insights, and an influence matrix.
 */

class CrossTalkAnalyzer {
  constructor() {
    this.agreementPhrases = [
      'agree', 'aligned', 'consensus', 'concur', 'same view',
      'shared understanding', 'common ground', 'exactly', 'absolutely',
      'that\'s right', 'correct', 'spot on',
    ];
    this.disagreementPhrases = [
      'disagree', 'however', 'concern', 'risk', 'alternatively',
      'but ', 'on the contrary', 'not necessarily', 'i think differently',
      'problem with', 'issue is',
    ];
  }

  /**
   * Analyze a party orchestrator result for cross-talk patterns.
   * @param {object} partyResult - Output from PartyOrchestrator.execute()
   * @returns {object} Analysis with agreements, disagreements, influence, convergence
   */
  analyze(partyResult) {
    if (!partyResult || !partyResult.rounds) {
      return { agreements: [], disagreements: [], uniqueInsights: [], influenceMatrix: {}, convergenceScore: 0 };
    }

    const lastRound = partyResult.rounds[partyResult.rounds.length - 1];
    const allResponses = lastRound.agents.map((a) => ({
      role: a.role,
      name: a.name,
      response: a.response.toLowerCase(),
    }));

    const agreements = this._findAgreements(allResponses);
    const disagreements = this._findDisagreements(allResponses);
    const uniqueInsights = this._findUniqueInsights(lastRound.agents);
    const influenceMatrix = this._buildInfluenceMatrix(partyResult.rounds);
    const convergenceScore = this._computeConvergenceScore(agreements, disagreements, partyResult.rounds.length);

    return { agreements, disagreements, uniqueInsights, influenceMatrix, convergenceScore };
  }

  _findAgreements(responses) {
    const agreements = [];
    for (const phrase of this.agreementPhrases) {
      const matching = responses.filter((r) => r.response.includes(phrase));
      if (matching.length >= 2) {
        agreements.push({
          phrase,
          agents: matching.map((m) => m.name),
        });
      }
    }
    return agreements;
  }

  _findDisagreements(responses) {
    const disagreements = [];
    for (const phrase of this.disagreementPhrases) {
      const matching = responses.filter((r) => r.response.includes(phrase));
      if (matching.length >= 1) {
        disagreements.push({
          phrase,
          agents: matching.map((m) => m.name),
        });
      }
    }
    return disagreements;
  }

  _findUniqueInsights(agents) {
    return agents
      .filter((a) => a.status === 'success' && a.response.length > 100)
      .map((a) => ({
        agent: a.name,
        role: a.role,
        insightPreview: a.response.slice(0, 200).trim(),
      }));
  }

  _buildInfluenceMatrix(rounds) {
    if (rounds.length < 2) return {};

    const prevRound = rounds[rounds.length - 2];
    const lastRound = rounds[rounds.length - 1];

    const prevNames = prevRound.agents.map((a) => a.name);
    const matrix = {};

    for (const agent of lastRound.agents) {
      const response = agent.response.toLowerCase();
      const influenced = [];

      for (const name of prevNames) {
        if (name !== agent.name && response.includes(name.toLowerCase())) {
          influenced.push(name);
        }
      }

      if (influenced.length > 0) {
        matrix[agent.name] = { influenced, influencedBy: influenced };
      }
    }

    return matrix;
  }

  _computeConvergenceScore(agreements, disagreements, totalRounds) {
    const agreementWeight = 15;
    const disagreementPenalty = 5;
    const roundBonus = totalRounds > 1 ? 10 : 0;

    return Math.min(100, Math.max(0,
      (agreements.length * agreementWeight) -
      (disagreements.length * disagreementPenalty) +
      roundBonus
    ));
  }
}

module.exports = { CrossTalkAnalyzer };
