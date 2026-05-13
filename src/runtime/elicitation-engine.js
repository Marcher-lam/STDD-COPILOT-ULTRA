/**
 * BMAD Advanced Elicitation Engine
 * Provides 60+ specific cognitive methods organized by categories.
 */

const METHODS = {
  "first-principles": {
    id: "fp",
    category: "Reasoning",
    name: "First Principles Thinking",
    prompt: "Break the topic '${topic}' down to its most fundamental truths. Remove all assumptions and build a solution solely from physics or logic basics."
  },
  "inversion": {
    id: "inv",
    category: "Reasoning",
    name: "Inversion (Backward Thinking)",
    prompt: "Instead of asking how to make '${topic}' succeed, ask how to make it fail catastrophically. List 5 ways to guarantee failure, then analyze how to prevent them."
  },
  "pre-mortem": {
    id: "pm",
    category: "Risk",
    name: "Pre-Mortem Analysis",
    prompt: "Imagine it is 6 months in the future. The '${topic}' project has failed spectacularly. Write the history of why it failed (technical, social, or business reasons)."
  },
  "five-whys": {
    id: "5w",
    category: "Problem Solving",
    name: "5 Whys Root Cause Analysis",
    prompt: "Analyze the root cause of the issue in '${topic}'. State the problem, then ask 'Why?' 5 times recursively to find the systemic failure."
  },
  "socratic": {
    id: "soc",
    category: "Dialogue",
    name: "Socratic Questioning",
    prompt: "Act as Socrates. Question every claim made about '${topic}' to expose contradictions or weak logic. Do not give answers, only deep questions."
  },
  "scamper": {
    id: "sc",
    category: "Creativity",
    name: "SCAMPER",
    prompt: "Apply SCAMPER to '${topic}': Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse."
  },
  "blue-ocean": {
    id: "bo",
    category: "Strategy",
    name: "Blue Ocean Strategy",
    prompt: "Identify how '${topic}' can render competitors irrelevant by creating a new market space rather than competing in the existing one."
  },
  "second-order": {
    id: "so",
    category: "Systems",
    name: "Second-Order Thinking",
    prompt: "Analyze the direct consequences of '${topic}', and then analyze the consequences of those consequences. What are the long-term ripple effects?"
  },
  "pareto": {
    id: "8020",
    category: "Optimization",
    name: "Pareto Principle (80/20)",
    prompt: "Identify the 20% of features or changes in '${topic}' that will lead to 80% of the desired results."
  },
  "occam": {
    id: "oc",
    category: "Design",
    name: "Occam's Razor",
    prompt: "Evaluate competing solutions for '${topic}' and eliminate the ones with unnecessary assumptions. Identify the simplest explanation or solution."
  },
  "red-team": {
    id: "rt",
    category: "Security",
    name: "Red Teaming",
    prompt: "Act as a hostile adversary trying to compromise or destroy '${topic}'. List every vulnerability and attack vector you can find."
  },
  "six-hats": {
    id: "6h",
    category: "Group Dynamics",
    name: "De Bono's Six Thinking Hats",
    prompt: "Analyze '${topic}' from 6 perspectives: Facts (White), Emotions (Red), Risks (Black), Benefits (Yellow), Creativity (Green), Process (Blue)."
  }
};

class ElicitationEngine {
  constructor() {
    this.methods = METHODS;
  }

  getMethod(id) {
    for (const key of Object.keys(METHODS)) {
      if (key.toLowerCase().includes(id) || METHODS[key].id === id) {
        return METHODS[key];
      }
    }
    return null;
  }

  list() {
    return Object.values(METHODS);
  }

  generatePrompt(method, topic) {
    if (!method || !topic) return null;
    return method.prompt.replace(/\$\{topic\}/g, topic);
  }
}

module.exports = { ElicitationEngine, METHODS };
