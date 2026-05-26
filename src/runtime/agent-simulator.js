/**
 * Agent Simulation Engine
 * Manages state machine for multi-agent turn-based interactions.
 * Moves STDD from "Prompt Template" to "Interaction Runtime".
 *
 * Phase 3 extension: AI-powered debate mode via PartyOrchestrator integration.
 */

const fs = require('fs');
const path = require('path');

const CONVERGENCE_KEYWORDS = ['agree', 'consensus', 'approved', 'done', 'resolved', 'confirmed', '达成共识', '同意', '通过'];

function detectKeywordConvergence(history) {
  if (history.length < 2) return false;
  const lastTwo = history.slice(-2);
  const allAgree = lastTwo.every(turn =>
    CONVERGENCE_KEYWORDS.some(kw => (turn.content || '').toLowerCase().includes(kw))
  );
  return allAgree;
}

const DEFAULT_AGENTS = [
  { id: 'po', name: 'Product Owner', role: 'Focus on scope, value, and user journey.' },
  { id: 'arch', name: 'Architect', role: 'Focus on system boundaries, patterns, and risks.' },
  { id: 'dev', name: 'Developer', role: 'Focus on implementation complexity and feasibility.' },
  { id: 'qa', name: 'Tester', role: 'Focus on edge cases, failure scenarios, and validation.' },
];

class AgentEngine {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.statePath = path.join(cwd, 'stdd', 'runtime', 'agent-state.json');
    this.turnsPath = path.join(cwd, 'stdd', 'runtime', 'agent-turns.jsonl');
  }

  ensureRuntimeDir() {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    if (!fs.existsSync(this.statePath)) {
      this.saveState(this.getDefaultState());
    }
  }

  getDefaultState() {
    return { status: 'idle', topic: '', agents: [], currentSpeakerIndex: 0, round: 0, maxRounds: 10, convergenceDetected: false };
  }

  loadState() {
    if (!fs.existsSync(this.statePath)) return this.getDefaultState();
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EACCES') console.error(`  Warning: ${err.message}`);
      return this.getDefaultState();
    }
  }

  saveState(state) {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  start(topic, options = {}) {
    this.ensureRuntimeDir();
    const agents = options.agents && options.agents.length > 0 ? options.agents : DEFAULT_AGENTS;
    const state = {
      ...this.getDefaultState(),
      status: 'active',
      topic,
      agents,
      maxRounds: options.rounds || 6,
      currentSpeakerIndex: 0,
    };
    this.saveState(state);
    // Clear turns history
    fs.writeFileSync(this.turnsPath, '', 'utf8');
    return state;
  }

  nextTurn() {
    const state = this.loadState();
    if (state.status !== 'active') return { error: 'Simulation not active.' };

    const speaker = state.agents[state.currentSpeakerIndex];
    state.currentSpeakerIndex = (state.currentSpeakerIndex + 1) % state.agents.length;
    if (state.currentSpeakerIndex === 0) state.round++;

    // Check convergence (rounds limit or keyword)
    const history = this.getHistory();
    if (state.round >= state.maxRounds) {
      state.status = 'completed';
      state.convergenceDetected = true;
    } else if (detectKeywordConvergence(history)) {
      state.status = 'completed';
      state.convergenceDetected = true;
    }

    this.saveState(state);
    return { turn: state.round, speaker, history: this.getHistory() };
  }

  recordTurn(speakerId, content) {
    const record = { speakerId, timestamp: new Date().toISOString(), content };
    fs.appendFileSync(this.turnsPath, JSON.stringify(record) + '\n', 'utf8');
  }

  getHistory() {
    if (!fs.existsSync(this.turnsPath)) return [];
    return fs.readFileSync(this.turnsPath, 'utf8').trim().split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  }

  getStatus() {
    return this.loadState();
  }

  forceStop() {
    const state = this.loadState();
    state.status = 'stopped';
    this.saveState(state);
    return state;
  }

  /**
   * Start an AI-powered multi-role debate on a topic.
   * Integrates with PartyOrchestrator for real agent-driven discussion.
   * @param {string} topic - The topic to debate
   * @param {object} options - { roleIds, rounds, executorType, command, context }
   * @returns {Promise<object>} Debate result with rounds, convergence, and proposal
   */
  async startDebate(topic, options = {}) {
    this.ensureRuntimeDir();

    const { PartyOrchestrator } = require('./party-orchestrator');
    const orchestrator = new PartyOrchestrator({
      executorType: options.executorType || 'noop',
      command: options.command,
      cwd: this.cwd,
      maxRounds: options.rounds || 2,
      timeout: options.timeout || 60000,
    });

    const roleIds = options.roleIds || ['po', 'arch', 'dev', 'qa'];
    const debateState = {
      status: 'debating',
      topic,
      roleIds,
      startedAt: new Date().toISOString(),
    };
    this.saveState({ ...this.getDefaultState(), ...debateState });

    try {
      const result = await orchestrator.execute(topic, roleIds, {
        rounds: options.rounds || 2,
        context: options.context || {},
        onAgentComplete: (output) => {
          this.recordTurn(output.role, output.response);
        },
      });

      // Converge debate to a structured proposal
      const proposal = this.convergeToProposal(result);

      const finalState = this.loadState();
      finalState.status = 'debate-completed';
      finalState.convergenceDetected = result.convergence.score > 50;
      finalState.completedAt = new Date().toISOString();
      this.saveState(finalState);

      return {
        ...result,
        proposal,
        status: 'completed',
      };
    } catch (err) {
      const finalState = this.loadState();
      finalState.status = 'debate-error';
      finalState.error = err.message;
      this.saveState(finalState);
      throw err;
    }
  }

  /**
   * Converge a multi-round debate result into a structured product proposal.
   * Extracts key themes, agreements, and action items.
   * @param {object} debateResult - Output from PartyOrchestrator.execute()
   * @returns {object} Structured proposal
   */
  convergeToProposal(debateResult) {
    const allResponses = [];
    const themes = new Map();

    for (const round of debateResult.rounds || []) {
      for (const agent of round.agents || []) {
        allResponses.push({
          role: agent.role,
          name: agent.fullName || agent.name,
          round: agent.round,
          content: agent.response || '',
        });
      }
      // Collect themes from round summaries
      for (const theme of round.summary?.themes || []) {
        themes.set(theme, (themes.get(theme) || 0) + 1);
      }
    }

    // Extract agreements
    const agreements = [];
    const disagreementPoints = [];
    for (const round of debateResult.rounds || []) {
      for (const a of round.summary?.agreements || []) {
        if (!agreements.includes(a)) agreements.push(a);
      }
      for (const d of round.summary?.disagreements || []) {
        if (!disagreementPoints.includes(d)) disagreementPoints.push(d);
      }
    }

    // Synthesize action items from agent responses
    const actionItems = [];
    const actionPatterns = /(?:should|must|need to|recommend|action item)[:\s]+([^.!\n]{10,80})/gi;
    for (const resp of allResponses) {
      let match;
      actionPatterns.lastIndex = 0;
      while ((match = actionPatterns.exec(resp.content)) !== null) {
        actionItems.push({ from: resp.name, item: match[1].trim() });
      }
    }

    return {
      topic: debateResult.topic,
      summary: this._generateProposalSummary(allResponses, agreements),
      keyThemes: [...themes.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
      agreements,
      openQuestions: disagreementPoints,
      actionItems: actionItems.slice(0, 10),
      convergence: debateResult.convergence,
      participants: debateResult.participants || [],
      generatedAt: new Date().toISOString(),
    };
  }

  _generateProposalSummary(responses, agreements) {
    const totalResponseLength = responses.reduce((sum, r) => sum + r.content.length, 0);
    const avgLength = Math.round(totalResponseLength / Math.max(responses.length, 1));

    if (agreements.length >= 3) {
      return `Strong consensus reached across ${responses.length} agent responses. ${agreements.length} agreement points identified with ${responses.length} participants contributing an average of ${avgLength} characters each.`;
    } else if (agreements.length > 0) {
      return `Partial consensus with ${agreements.length} agreement points. ${responses.length} agent responses received across ${new Set(responses.map(r => r.round)).size} rounds.`;
    }
    return `Discussion completed with ${responses.length} agent responses. No clear consensus detected — further deliberation recommended.`;
  }
}

module.exports = { AgentEngine, DEFAULT_AGENTS };
