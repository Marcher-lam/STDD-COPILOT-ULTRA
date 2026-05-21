/**
 * Supervisor Command
 * Multi-agent coordination and supervision.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const inquirer = require('inquirer');
const { AgentEngine } = require('../../runtime/agent-simulator');
const logger = createLogger('supervisor');

const ROLES = {
  'Product Owner': { color: 'blue', expertise: 'requirements, priorities, business value' },
  'Developer': { color: 'green', expertise: 'implementation, code quality, testing' },
  'Tester': { color: 'yellow', expertise: 'quality assurance, test coverage, edge cases' },
  'Reviewer': { color: 'red', expertise: 'code review, best practices, security' },
  'Architect': { color: 'cyan', expertise: 'architecture, design patterns, scalability' },
  'Security': { color: 'magenta', expertise: 'security, vulnerabilities, compliance' },
  'DevOps': { color: 'white', expertise: 'deployment, CI/CD, infrastructure' },
  'UX': { color: 'brightBlue', expertise: 'user experience, accessibility, design' },
  'BA': { color: 'brightGreen', expertise: 'business analysis, requirements, workflows' },
  'Tech Writer': { color: 'brightYellow', expertise: 'documentation, API docs, guides' },
  'QA Lead': { color: 'brightRed', expertise: 'test strategy, quality planning, metrics' },
  'Data Analyst': { color: 'brightMagenta', expertise: 'data, metrics, analytics' },
};

class SupervisorCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.supervisorDir = path.join(cwd, 'stdd', 'supervisor');
    this.sessionsPath = path.join(this.supervisorDir, 'sessions.jsonl');
  }

  execute(action = 'start', args = [], options = {}) {
    switch (action) {
      case 'start':
      case 'begin':
        return this.start(args.join(' '), options);
      case 'consult':
        return this.consult(args.join(' '), options);
      case 'review':
        return this.review(args[0], options);
      case 'debate':
        return this.debate(args.join(' '), options);
      case 'roles':
        return this.listRoles(options);
      case 'status':
        return this.status(options);
      case 'history':
        return this.history(options);
      default:
        return this.start(action, options);
    }
  }

  async start(topic, options = {}) {
    fs.mkdirSync(this.supervisorDir, { recursive: true });

    if (!topic && process.stdout.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'topic',
          message: 'What topic should the agents discuss?',
        },
        {
          type: 'checkbox',
          name: 'roles',
          message: 'Select participating roles:',
          choices: Object.keys(ROLES),
          default: ['Product Owner', 'Developer', 'Tester', 'Architect'],
        },
        {
          type: 'number',
          name: 'rounds',
          message: 'How many discussion rounds?',
          default: 3,
        },
      ]);
      topic = answers.topic;
      options.roles = answers.roles;
      options.rounds = answers.rounds;
    }

    if (!topic) {
      throw new Error('Topic is required. Usage: stdd supervisor start "<topic>"');
    }

    const roles = options.roles || ['Product Owner', 'Developer', 'Tester', 'Architect'];
    const rounds = options.rounds || 3;

    const engine = new AgentEngine();
    const state = engine.start(topic, { roles, rounds });

    this.recordSession({
      id: state.id,
      topic,
      roles,
      rounds,
      started: new Date().toISOString(),
      status: 'in-progress',
    });

    if (options.json) {
      console.log(JSON.stringify({ session: state }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Session Started\n'));
      console.log(`  Topic: ${chalk.cyan(topic)}`);
      console.log(`  Roles: ${roles.map(r => chalk.cyan(r)).join(', ')}`);
      console.log(`  Rounds: ${chalk.cyan(rounds.toString())}`);
      console.log(`  Session ID: ${chalk.dim(state.id)}\n`);
      console.log(chalk.dim('  Use "stdd supervisor status" to see the current state'));
      console.log(chalk.dim('  Use "stdd supervisor consult" to get recommendations\n'));
    }

    return { session: state };
  }

  async consult(query, options = {}) {
    if (!query) {
      throw new Error('Query is required. Usage: stdd supervisor consult "<query>"');
    }

    const roles = options.roles || ['Product Owner', 'Developer', 'Tester'];

    if (options.json) {
      console.log(JSON.stringify({ query, roles, consultation: 'Run with runtime agent' }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Consultation\n'));
      console.log(`  Query: ${chalk.cyan(query)}`);
      console.log(`  Consulting: ${roles.join(', ')}\n`);

      console.log(chalk.bold('Recommendations:\n'));

      for (const role of roles) {
        const advice = this.getRoleAdvice(role, query);
        const color = ROLES[role]?.color || 'white';
        console.log(`  ${chalk[color]('●')} ${chalk.bold(role)}: ${advice}`);
      }
      console.log('');
    }

    return { query, roles, consulted: true };
  }

  getRoleAdvice(role, query) {
    const adviceMap = {
      'Product Owner': 'Focus on business value and user needs. Ensure this aligns with project goals.',
      'Developer': 'Consider implementation complexity and technical feasibility.',
      'Tester': 'Identify potential edge cases and testing requirements.',
      'Reviewer': 'Evaluate code quality and adherence to best practices.',
      'Architect': 'Assess impact on system architecture and design patterns.',
      'Security': 'Review for security implications and vulnerabilities.',
      'DevOps': 'Consider deployment and operational requirements.',
      'UX': 'Evaluate user experience and accessibility impact.',
      'BA': 'Analyze business process implications and requirements.',
      'Tech Writer': 'Identify documentation needs.',
      'QA Lead': 'Assess quality strategy and test coverage needs.',
      'Data Analyst': 'Consider data and metrics implications.',
    };
    return adviceMap[role] || 'Evaluate this query from your perspective.';
  }

  review(filePath, options = {}) {
    if (!filePath) {
      throw new Error('File path is required. Usage: stdd supervisor review <file>');
    }

    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const roles = options.roles || ['Developer', 'Reviewer', 'Tester'];

    if (options.json) {
      console.log(JSON.stringify({ file: filePath, roles, review: 'See detailed review below' }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Review\n'));
      console.log(`  File: ${chalk.cyan(filePath)}`);
      console.log(`  Reviewers: ${roles.join(', ')}\n`);

      console.log(chalk.bold('Review Comments:\n'));

      for (const role of roles) {
        const comments = this.getReviewComments(role, content);
        const color = ROLES[role]?.color || 'white';
        console.log(`  ${chalk[color]('●')} ${chalk.bold(role)}:`);
        console.log(`      ${comments}\n`);
      }
    }

    return { file: filePath, roles, reviewed: true };
  }

  getReviewComments(role, content) {
    const lines = content.split('\n').length;
    const hasTests = /test|spec|expect/i.test(content);
    const hasComments = /\/\/|\/\*|#/i.test(content);
    const hasConsole = /console\.|print\(/i.test(content);
    const hasTODO = /TODO|FIXME|XXX/i.test(content);

    const comments = {
      'Developer': [
        `Code is ${lines} lines long.`,
        hasTests ? '✓ Tests detected' : '⚠ No tests found',
      ].join('. '),
      'Reviewer': [
        hasComments ? '✓ Has comments' : '○ Could use more comments',
        hasConsole ? '⚠ Console.log statements should be removed' : '',
        hasTODO ? '⚠ Contains TODO items' : '',
      ].filter(Boolean).join('. '),
      'Tester': [
        hasTests ? '✓ Test coverage appears present' : '⚠ Add tests for this code',
      ].join('. '),
      'Architect': 'Consider how this fits into the broader architecture.',
      'Security': 'Review for potential security vulnerabilities.',
    };

    return comments[role] || 'Review complete.';
  }

  async debate(topic, options = {}) {
    if (!topic) {
      throw new Error('Topic is required. Usage: stdd supervisor debate "<topic>"');
    }

    const roles = options.roles || ['Developer', 'Architect', 'Tester'];
    const rounds = options.rounds || 2;

    if (options.json) {
      console.log(JSON.stringify({ topic, roles, rounds, debate: 'Initiated' }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Debate\n'));
      console.log(`  Topic: ${chalk.cyan(topic)}`);
      console.log(`  Participants: ${roles.join(', ')}`);
      console.log(`  Rounds: ${rounds}\n`);

      console.log(chalk.bold('Debate Structure:\n'));

      for (let i = 1; i <= rounds; i++) {
        console.log(`  ${chalk.dim('─── Round ' + i + ' ───')}`);
        for (const role of roles) {
          const color = ROLES[role]?.color || 'white';
          console.log(`    ${chalk[color]('●')} ${chalk.bold(role)}: [Position statement]`);
        }
        console.log('');
      }

      console.log(chalk.dim('  Use runtime agent engine for full debate simulation.\n'));
    }

    return { topic, roles, rounds, debate: 'structured' };
  }

  listRoles(options = {}) {
    if (options.json) {
      console.log(JSON.stringify({ roles: ROLES }, null, 2));
    } else {
      console.log(chalk.bold('\nAvailable Agent Roles\n'));

      for (const [role, info] of Object.entries(ROLES)) {
        const color = info.color || 'white';
        console.log(`  ${chalk[color]('●')} ${chalk.bold(role)}`);
        console.log(`      ${chalk.dim(info.expertise)}`);
      }
      console.log('');
    }

    return { roles: Object.keys(ROLES) };
  }

  status(options = {}) {
    const sessions = this.loadSessions();
    const current = sessions.find(s => s.status === 'in-progress');

    if (options.json) {
      console.log(JSON.stringify({ current, total: sessions.length }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Status\n'));

      if (current) {
        console.log(`  Current session: ${chalk.cyan(current.topic)}`);
        console.log(`  Roles: ${current.roles.join(', ')}`);
        console.log(`  Started: ${chalk.dim(new Date(current.started).toLocaleString())}`);
        console.log(`  Session ID: ${chalk.dim(current.id)}\n`);
      } else {
        console.log(`  ${chalk.yellow('No active session')}`);
        console.log(`  ${chalk.dim('Run "stdd supervisor start <topic>" to begin')}\n`);
      }

      console.log(`  Total sessions: ${chalk.cyan(sessions.length.toString())}\n`);
    }

    return { current, total: sessions.length };
  }

  history(options = {}) {
    const sessions = this.loadSessions().slice(-(options.limit || 20));

    if (options.json) {
      console.log(JSON.stringify({ sessions, count: sessions.length }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Session History\n'));

      if (sessions.length === 0) {
        console.log(chalk.dim('  No sessions found.\n'));
      } else {
        sessions.forEach(session => {
          const status = session.status === 'completed' ? chalk.green('✓') :
                         session.status === 'in-progress' ? chalk.yellow('○') :
                         chalk.red('✗');
          const date = new Date(session.started).toLocaleDateString();
          console.log(`  ${status} ${chalk.cyan(session.topic)}`);
          console.log(`      ${chalk.dim(date)} · ${session.roles.length} roles · ${session.status}\n`);
        });
      }
    }

    return { sessions, count: sessions.length };
  }

  loadSessions() {
    if (!fs.existsSync(this.sessionsPath)) {
      return [];
    }
    return fs.readFileSync(this.sessionsPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  recordSession(session) {
    fs.mkdirSync(this.supervisorDir, { recursive: true });
    fs.appendFileSync(this.sessionsPath, JSON.stringify(session) + '\n', 'utf8');
  }
}

module.exports = { SupervisorCommand };
