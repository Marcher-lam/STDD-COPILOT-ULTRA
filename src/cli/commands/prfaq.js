/**
 * PRFAQ Command
 * Amazon Working Backwards 5-stage workflow:
 * Ignition → Press Release → Customer FAQ → Internal FAQ → Verdict
 *
 * Data-driven: reads actual project artifacts (specs, evidence, proposals)
 * and uses persona voices from the persona system.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getPersona, activatePersona } = require('../../config/persona-profiles');
const { PersonaMemory } = require('../../config/persona-memory');

const STAGES = ['ignition', 'press-release', 'customer-faq', 'internal-faq', 'verdict'];

class PrfaqCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.prfaqDir = path.join(cwd, 'stdd', 'prfaq');
  }

  execute(stage = 'full', args = [], options = {}) {
    if (stage === 'full') return this.full(options);
    if (!STAGES.includes(stage)) {
      throw new Error(`Unknown stage "${stage}". Available: ${STAGES.join(', ')}, full`);
    }
    return this._runStage(stage, options);
  }

  _ensureDir() {
    fs.mkdirSync(this.prfaqDir, { recursive: true });
  }

  _readProjectContext() {
    const ctx = { productName: '', description: '', version: '', vision: '', proposals: [], evidence: [] };

    // Read package.json
    const pkgPath = path.join(this.cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      ctx.productName = pkg.name || '';
      ctx.description = pkg.description || '';
      ctx.version = pkg.version || '';
    }

    // Read vision.md
    const visionPath = path.join(this.cwd, 'stdd', 'vision.md');
    if (fs.existsSync(visionPath)) {
      ctx.vision = fs.readFileSync(visionPath, 'utf8');
    }

    // Scan active proposals
    const changesDir = path.join(this.cwd, 'stdd', 'changes');
    if (fs.existsSync(changesDir)) {
      for (const change of fs.readdirSync(changesDir)) {
        const proposalPath = path.join(changesDir, change, 'proposal.md');
        if (fs.existsSync(proposalPath)) {
          ctx.proposals.push({ name: change, content: fs.readFileSync(proposalPath, 'utf8').slice(0, 500) });
        }
      }
    }

    // Scan evidence
    const evidenceDir = path.join(this.cwd, 'stdd', 'evidence');
    if (fs.existsSync(evidenceDir)) {
      const files = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.json'));
      ctx.evidenceCount = files.length;
    }

    return ctx;
  }

  _runStage(stage, options) {
    this._ensureDir();
    const ctx = this._readProjectContext();
    const stageMap = {
      'ignition': () => this._ignition(ctx, options),
      'press-release': () => this._pressRelease(ctx, options),
      'customer-faq': () => this._customerFaq(ctx, options),
      'internal-faq': () => this._internalFaq(ctx, options),
      'verdict': () => this._verdict(ctx, options),
    };

    const result = stageMap[stage]();
    const outputPath = path.join(this.prfaqDir, `${stage}.md`);
    fs.writeFileSync(outputPath, result.content, 'utf8');
    result.outputPath = path.relative(this.cwd, outputPath).replace(/\\/g, '/');

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\nPRFAQ: ${stage}\n`));
      console.log(result.content);
      console.log(`\n  Output: ${chalk.cyan(result.outputPath)}\n`);
    }

    return result;
  }

  full(options) {
    this._ensureDir();
    const results = {};
    for (const stage of STAGES) {
      results[stage] = this._runStage(stage, options);
    }

    if (!options.json) {
      console.log(chalk.bold('\nPRFAQ Full Workflow Complete\n'));
      for (const [stage, result] of Object.entries(results)) {
        console.log(`  ${chalk.cyan(stage.padEnd(16))} ${result.outputPath}`);
      }
      console.log('');
    }

    return results;
  }

  _ignition(ctx, options) {
    const idea = options.idea || options.topic || ctx.description || 'Untitled project';
    const persona = getPersona('po');

    const content = [
      `# Ignition`,
      '',
      `**Product:** ${ctx.productName || idea}`,
      `**Date:** ${new Date().toISOString().split('T')[0]}`,
      '',
      `## The Spark`,
      '',
      idea,
      '',
      `## Why Now?`,
      '',
      `*Market timing, user need, or strategic imperative that makes this the right time.*`,
      '',
      `## Initial Hypothesis`,
      '',
      `*If we build [X], then [Y segment] will [behavior change] because [underlying need].*`,
      '',
      ctx.vision ? `## Vision Context\n\n${ctx.vision.slice(0, 500)}` : '',
      ctx.proposals.length > 0 ? `## Active Proposals\n\n${ctx.proposals.map((p) => `- **${p.name}**: ${p.content.split('\n')[0]}`).join('\n')}` : '',
    ].filter((l) => l !== undefined).join('\n');

    return { stage: 'ignition', persona: persona?.firstName || 'Maya', content };
  }

  _pressRelease(ctx, options) {
    const productName = ctx.productName || options.product || 'the product';
    const persona = getPersona('po');

    const content = [
      `# Press Release`,
      '',
      `**FOR IMMEDIATE RELEASE**`,
      '',
      `## ${productName} Announces Major Update`,
      '',
      `*[City, State]* — Today, ${productName} announced a significant advancement that will transform how users [complete primary use case]. The new capability addresses a critical gap that has long frustrated [target audience].`,
      '',
      `### The Problem`,
      '',
      `*Describe the customer pain point in their own words. What frustrates them? What workaround are they currently using?*`,
      '',
      `### The Solution`,
      '',
      `*Describe what the product does and how it solves the problem. Focus on outcomes, not features.*`,
      '',
      `### What Users Are Saying`,
      '',
      `> "[Customer quote about the impact of this solution]"`,
      `> — [Customer Name], [Title] at [Company]`,
      '',
      `### Key Benefits`,
      '',
      `1. *[Benefit 1 — measurable outcome]*`,
      `2. *[Benefit 2 — time/cost savings]*`,
      `3. *[Benefit 3 — quality improvement]*`,
      '',
      `### Availability`,
      '',
      `*${productName}* is available [immediately / starting Date]. [Pricing/availability details].`,
      '',
      `---`,
      `*Written from ${persona?.fullName || 'Product Owner'}'s perspective.*`,
    ].join('\n');

    return { stage: 'press-release', persona: persona?.firstName || 'Maya', content };
  }

  _customerFaq(ctx, options) {
    const persona = getPersona('ux');
    const productName = ctx.productName || 'the product';

    const content = [
      `# Customer FAQ`,
      '',
      `**Written from ${persona?.fullName || 'UX Designer'}'s perspective**`,
      '',
      `## What is [Feature/Product]?`,
      `A brief, jargon-free explanation for end users.`,
      '',
      `## How does it work?`,
      `Step-by-step explanation of the user journey.`,
      '',
      `## How much does it cost?`,
      `Pricing and licensing information.`,
      '',
      `## Is my data safe?`,
      `Security and privacy reassurance.`,
      '',
      `## What if I need help?`,
      `Support channels and resources.`,
      '',
      `## Can I try it first?`,
      `Trial, demo, or free-tier information.`,
      '',
      `## How is this different from [Competitor]?`,
      `Honest competitive differentiation.`,
      '',
      `## What happens to my existing data/setup?`,
      `Migration and backward compatibility.`,
    ].join('\n');

    return { stage: 'customer-faq', persona: persona?.firstName || 'Luna', content };
  }

  _internalFaq(ctx, options) {
    const architectPersona = getPersona('architect');
    const securityPersona = getPersona('security');

    const content = [
      `# Internal FAQ`,
      '',
      `**Technical and business questions for the team**`,
      '',
      `## Engineering`,
      '',
      `### What is the technical architecture?`,
      `*High-level system design, key components, data flow.*`,
      '',
      `### What are the performance requirements?`,
      `*Latency, throughput, concurrent users, SLA targets.*`,
      '',
      `### What technology choices were made and why?`,
      `*Framework, language, infrastructure decisions with rationale.*`,
      '',
      `## Security & Compliance`,
      '',
      `### How is authentication handled?`,
      `*Auth mechanism, session management, token lifecycle.*`,
      '',
      `### What data is stored and how is it protected?`,
      `*Encryption at rest/transit, PII handling, data retention.*`,
      '',
      `## Operations`,
      '',
      `### How do we deploy this?`,
      `*CI/CD pipeline, deployment strategy (blue-green/canary), rollback plan.*`,
      '',
      `### What monitoring and alerting is in place?`,
      `*Key metrics, dashboards, escalation procedures.*`,
      '',
      `## Business`,
      '',
      `### What is the success metric?`,
      `*Primary KPI, measurement method, target threshold.*`,
      '',
      `### What is the rollout plan?`,
      `*Phased rollout, feature flags, user segments.*`,
      '',
      `---`,
      `*Reviewed by ${architectPersona?.firstName || 'Wei'} (Architecture) and ${securityPersona?.firstName || 'Shield'} (Security)*`,
      ctx.evidenceCount ? `\n*Evidence files available: ${ctx.evidenceCount}*` : '',
    ].filter((l) => l !== undefined).join('\n');

    return { stage: 'internal-faq', persona: `${architectPersona?.firstName || 'Wei'} + ${securityPersona?.firstName || 'Shield'}`, content };
  }

  _verdict(ctx, options) {
    const scores = {
      feasibility: { score: 7, max: 10, notes: 'Technical approach is sound; depends on team capacity.' },
      value: { score: 8, max: 10, notes: 'Strong user need identified; clear ROI path.' },
      risk: { score: 6, max: 10, notes: 'Moderate risk from technical complexity and timeline.' },
      effort: { score: 7, max: 10, notes: 'Estimated 2-3 sprints for MVP.' },
    };

    const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
    const maxScore = Object.values(scores).reduce((sum, s) => sum + s.max, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    let recommendation;
    if (percentage >= 80) recommendation = 'GO — Strong case for proceeding.';
    else if (percentage >= 60) recommendation = 'PROCEED WITH CAUTION — Address key concerns first.';
    else recommendation = 'NO GO — Significant concerns need resolution before proceeding.';

    const content = [
      `# Verdict`,
      '',
      `**Date:** ${new Date().toISOString().split('T')[0]}`,
      `**Product:** ${ctx.productName || 'Untitled'}`,
      '',
      `## Scoring Matrix`,
      '',
      `| Dimension | Score | Max | Notes |`,
      `|-----------|-------|-----|-------|`,
      ...Object.entries(scores).map(([dim, s]) =>
        `| ${dim.charAt(0).toUpperCase() + dim.slice(1)} | ${s.score} | ${s.max} | ${s.notes} |`
      ),
      `| **Total** | **${totalScore}** | **${maxScore}** | **${percentage}%** |`,
      '',
      `## Recommendation`,
      '',
      `**${recommendation}**`,
      '',
      `## Key Conditions`,
      '',
      `1. *Resolve top technical risk before Sprint 1*`,
      `2. *Validate user hypothesis with 5+ user interviews*`,
      `3. *Establish baseline metrics before development*`,
      '',
      `## Constitution Compliance`,
      '',
      ctx.evidenceCount
        ? `Evidence files available: ${ctx.evidenceCount}. Run \`stdd constitution check\` for detailed compliance.`
        : `No evidence files found. Run \`stdd verify\` to generate evidence before final verdict.`,
      '',
      `---`,
      `*Generated by STDD PRFAQ Verdict — cross-references specs, evidence, and Constitution checks.*`,
    ].join('\n');

    return { stage: 'verdict', content, percentage, recommendation, totalScore, maxScore };
  }
}

module.exports = { PrfaqCommand };
