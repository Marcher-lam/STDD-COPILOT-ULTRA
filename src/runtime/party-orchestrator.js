/**
 * Party Orchestrator
 * Orchestrates real multi-agent discussions by spawning independent subagents
 * for each persona, with cross-talk between rounds.
 */

const fs = require('fs');
const path = require('path');
const { PERSONA_PROFILES } = require('../config/persona-profiles');
const { ROLE_DEFINITIONS } = require('../config/role-definitions');
const { ShellAgentExecutor } = require('./agents/shell-executor');
const { NoopAgentExecutor } = require('./agents/noop-executor');

const CONVERGENCE_KEYWORDS = [
  'agree', 'consensus', 'aligned', 'concur', 'same view',
  'agree on', 'shared understanding', 'common ground',
];

class PartyOrchestrator {
  constructor(options = {}) {
    this.executorType = options.executorType || 'noop';
    this.command = options.command || process.env.STDD_AGENT_COMMAND;
    this.cwd = options.cwd || process.cwd();
    this.allowedBins = options.allowedBins;
    this.maxRounds = options.maxRounds || 2;
    this.timeout = options.timeout || 60000;
  }

  _createExecutor() {
    if (this.executorType === 'shell' && this.command) {
      return new ShellAgentExecutor({
        command: this.command,
        cwd: this.cwd,
        allowedBins: this.allowedBins,
      });
    }
    return new NoopAgentExecutor();
  }

  /**
   * Execute a multi-agent party discussion.
   * @param {string} topic - The discussion topic
   * @param {string[]} roleIds - Which roles to include
   * @param {object} options - { rounds, context, onAgentComplete }
   * @returns {object} Party result with rounds, synthesis, convergence
   */
  async execute(topic, roleIds, options = {}) {
    const rounds = options.rounds || this.maxRounds;
    const context = options.context || {};
    const onAgentComplete = options.onAgentComplete || (() => {});

    const participants = roleIds
      .map((id) => {
        const persona = PERSONA_PROFILES[id];
        const role = ROLE_DEFINITIONS[id];
        if (!persona || !role) return null;
        return { id, persona, role };
      })
      .filter(Boolean);

    if (participants.length === 0) {
      throw new Error('No valid participants. Provide valid role IDs.');
    }

    const executor = this._createExecutor();
    const roundResults = [];
    let sharedContext = '';

    for (let round = 1; round <= rounds; round++) {
      const agentOutputs = [];

      for (const participant of participants) {
        const prompt = this._buildAgentPrompt(
          participant, topic, sharedContext, round, rounds, context
        );

        const request = {
          role: participant.id,
          goal: `Analyze "${topic}" from ${participant.persona.fullName}'s perspective`,
          prompt,
          timeout: this.timeout,
        };

        let output;
        try {
          const result = await executor.run(request);
          output = {
            role: participant.id,
            name: participant.persona.firstName,
            fullName: participant.persona.fullName,
            round,
            response: result.output || '',
            status: result.status,
          };
        } catch (err) {
          output = {
            role: participant.id,
            name: participant.persona.firstName,
            fullName: participant.persona.fullName,
            round,
            response: `[Error: ${err.message}]`,
            status: 'error',
          };
        }

        agentOutputs.push(output);
        onAgentComplete(output);
      }

      const roundSummary = this._synthesizeRound(agentOutputs);
      roundResults.push({
        round,
        agents: agentOutputs,
        summary: roundSummary,
      });

      sharedContext = this._buildSharedContext(roundResults);
    }

    const convergence = this._detectConvergence(roundResults);
    const finalReport = this._buildFinalReport(topic, participants, roundResults, convergence);

    return finalReport;
  }

  /**
   * Build the prompt for a single agent turn.
   */
  _buildAgentPrompt(participant, topic, sharedContext, round, totalRounds, context) {
    const { persona, role } = participant;
    const parts = [];

    parts.push(`You are ${persona.fullName}.`);
    parts.push(`Personality: ${persona.personality}.`);
    parts.push(`Your expertise: ${role.expertise.join(', ')}.`);
    parts.push(`Your lens: ${role.lens}.`);
    parts.push(`Your catchphrase: "${persona.catchphrase}"`);
    parts.push('');

    parts.push(`**Topic:** ${topic}`);
    if (context.techStack) parts.push(`**Tech Stack:** ${context.techStack}`);
    parts.push('');

    if (round === 1) {
      parts.push('This is the opening round. Share your initial analysis from your perspective.');
      parts.push('Focus on the areas most relevant to your expertise.');
    } else {
      parts.push(`This is round ${round} of ${totalRounds}. Previous discussion:`);
      parts.push('```');
      parts.push(sharedContext.slice(-2000));
      parts.push('```');
      parts.push('');
      parts.push('Respond to the points raised by other agents. Agree, disagree, or add new perspectives.');
    }

    parts.push('');
    parts.push('Respond in character. Be specific and actionable.');

    return parts.join('\n');
  }

  /**
   * Synthesize a single round's outputs into a summary.
   */
  _synthesizeRound(agentOutputs) {
    const themes = [];
    const agreements = [];
    const disagreements = [];

    const allResponses = agentOutputs.map((a) => a.response).join(' ');

    for (const keyword of ['should', 'must', 'recommend', 'suggest', 'important', 'critical']) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allResponses.match(regex);
      if (matches && matches.length >= 2) {
        themes.push(`${keyword} (${matches.length} mentions)`);
      }
    }

    for (const keyword of CONVERGENCE_KEYWORDS) {
      if (allResponses.toLowerCase().includes(keyword)) {
        agreements.push(keyword);
      }
    }

    const disagreePatterns = ['however', 'disagree', 'concern', 'risk', 'but ', 'alternatively'];
    for (const pattern of disagreePatterns) {
      if (allResponses.toLowerCase().includes(pattern)) {
        disagreements.push(pattern.trim());
      }
    }

    return {
      themes: themes.slice(0, 5),
      agreements: [...new Set(agreements)],
      disagreements: [...new Set(disagreements)],
      agentCount: agentOutputs.length,
    };
  }

  /**
   * Build shared context from all previous rounds.
   */
  _buildSharedContext(roundResults) {
    const parts = [];
    for (const round of roundResults) {
      parts.push(`=== Round ${round.round} ===`);
      for (const agent of round.agents) {
        const preview = agent.response.slice(0, 400);
        parts.push(`[${agent.name}]: ${preview}${agent.response.length > 400 ? '...' : ''}`);
      }
    }
    return parts.join('\n\n');
  }

  /**
   * Detect convergence across rounds.
   */
  _detectConvergence(roundResults) {
    if (roundResults.length < 2) return { score: 0, trend: 'insufficient-data' };

    const lastRound = roundResults[roundResults.length - 1];
    const prevRound = roundResults[roundResults.length - 2];

    const convergenceGrowth = lastRound.summary.agreements.length - prevRound.summary.agreements.length;
    const disagreementDecline = prevRound.summary.disagreements.length - lastRound.summary.disagreements.length;

    let score = Math.min(100, Math.max(0,
      (lastRound.summary.agreements.length * 15) +
      (convergenceGrowth * 10) +
      (disagreementDecline * 5)
    ));

    const trend = convergenceGrowth > 0 ? 'converging' :
      convergenceGrowth < 0 ? 'diverging' : 'stable';

    return { score, trend, rounds: roundResults.length };
  }

  /**
   * Build the final structured report.
   */
  _buildFinalReport(topic, participants, roundResults, convergence) {
    return {
      topic,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.persona.firstName,
        fullName: p.persona.fullName,
      })),
      rounds: roundResults,
      convergence,
      createdAt: new Date().toISOString(),
    };
  }
}

module.exports = { PartyOrchestrator };
