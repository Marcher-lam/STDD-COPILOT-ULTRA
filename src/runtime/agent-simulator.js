/**
 * Agent Simulation Engine
 * Manages state machine for multi-agent turn-based interactions.
 * Moves STDD from "Prompt Template" to "Interaction Runtime".
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
}

module.exports = { AgentEngine, DEFAULT_AGENTS };
