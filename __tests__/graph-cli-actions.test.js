const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

const {
  graphCommand,
  compileGraph, getEdges, getLayers, buildMermaid,
  formatAnalyze, formatParallelLayers, writeOrPrint,
} = require('../src/cli/commands/graph');

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'close') cb(0);
    }),
  })),
  exec: jest.fn((_cmd, _opts, cb) => cb(null, { stdout: '', stderr: '' })),
}));

describe('graphCommand CLI registration', () => {
  it('registers graph command and subcommands', () => {
    const mockGraph = {
      command: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
      addHelpText: jest.fn().mockReturnThis(),
    };

    const program = {
      command: jest.fn().mockReturnValue(mockGraph),
      description: jest.fn().mockReturnThis(),
      addHelpText: jest.fn().mockReturnThis(),
    };

    graphCommand(program);

    expect(program.command).toHaveBeenCalledWith('graph');
    expect(mockGraph.command).toHaveBeenCalled();
    const subCmdCalls = mockGraph.command.mock.calls.map(c => c[0]);
    expect(subCmdCalls).toContain('visualize');
    expect(subCmdCalls).toContain('analyze');
    expect(subCmdCalls).toContain('parallel');
    expect(subCmdCalls).toContain('history');
    expect(subCmdCalls).toContain('run');
    expect(subCmdCalls).toContain('recommend [change]');
    expect(mockGraph.action).toHaveBeenCalled();
  });
});

describe('graph CLI action handlers', () => {
  let tempDir;
  let originalCwd;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-cli-'));
    fs.mkdirSync(path.join(tempDir, 'stdd', 'changes'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
    process.exitCode = 0;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exitCode = 0;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('visualize - mermaid format', () => {
    it('outputs mermaid by default', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'visualize'], { from: 'user' });
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('graph TD');
    });

    it('writes to file with --output', async () => {
      const outFile = path.join(tempDir, 'graph.txt');
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'visualize', '--output', outFile], { from: 'user' });
      expect(fs.existsSync(outFile)).toBe(true);
      const content = fs.readFileSync(outFile, 'utf8');
      expect(content).toContain('graph TD');
    });
  });

  describe('visualize - json format', () => {
    it('outputs valid JSON', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'visualize', '--format', 'json'], { from: 'user' });
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.nodes.length).toBeGreaterThan(0);
      expect(parsed.edges).toBeDefined();
      expect(parsed.name).toBeDefined();
    });

    it('writes JSON to file with --output', async () => {
      const outFile = path.join(tempDir, 'graph.json');
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'visualize', '--format', 'json', '--output', outFile], { from: 'user' });
      const parsed = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      expect(parsed.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('visualize - unsupported format', () => {
    it('prints error and sets exitCode to 1', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      try {
        await program.parseAsync(['graph', 'visualize', '--format', 'bogus'], { from: 'user' });
      } catch {}
      expect(errorSpy).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });

  describe('analyze action', () => {
    it('prints analysis summary with correct fields', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'analyze'], { from: 'user' });
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Nodes:');
      expect(output).toContain('Edges:');
      expect(output).toContain('Entry nodes:');
      expect(output).toContain('Terminal nodes:');
      expect(output).toContain('Parallel layers:');
    });

    it('supports different intents', async () => {
      for (const intent of ['hotfix', 'research']) {
        logSpy.mockClear();
        const program = new Command();
        program.exitOverride();
        graphCommand(program);
        await program.parseAsync(['graph', 'analyze', '--intent', intent], { from: 'user' });
        const output = logSpy.mock.calls.map(c => c[0]).join('\n');
        expect(output).toContain('Nodes:');
      }
    });
  });

  describe('parallel action', () => {
    it('prints parallel layers with --detect', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'parallel', '--detect'], { from: 'user' });
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Layer');
    });

    it('errors without --detect flag', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      try {
        await program.parseAsync(['graph', 'parallel'], { from: 'user' });
      } catch {}
      expect(errorSpy).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });

  describe('recommend action', () => {
    it('prints recommendations to console', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'recommend'], { from: 'user' });
      expect(logSpy).toHaveBeenCalled();
    });

    it('outputs JSON with --json flag', async () => {
      const program = new Command();
      program.exitOverride();
      graphCommand(program);
      await program.parseAsync(['graph', 'recommend', '--json'], { from: 'user' });
      const jsonOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });
  });
});

describe('graph exported helpers — additional coverage', () => {
  let logSpy;
  let tmpDir;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-cli-'));
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('JSON format round-trip', () => {
    const compiled = compileGraph('feature');
    const payload = {
      name: compiled.name,
      nodes: Object.keys(compiled.skills || {}),
      edges: getEdges(compiled),
    };
    const json = JSON.stringify(payload, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.nodes.length).toBeGreaterThan(0);
  });

  it('all intents produce valid analysis', () => {
    for (const intent of ['feature', 'hotfix', 'research', 'repair']) {
      const output = formatAnalyze(compileGraph(intent));
      expect(output).toContain('Nodes:');
      expect(output).toContain('Edges:');
      expect(output).toContain('Entry nodes:');
      expect(output).toContain('Terminal nodes:');
      expect(output).toContain('Parallel layers:');
    }
  });

  it('parallel layers for diamond dependency', () => {
    const graph = {
      skills: {
        root: { depends_on: [] },
        left: { depends_on: ['root'] },
        right: { depends_on: ['root'] },
        merge: { depends_on: ['left', 'right'] },
      },
    };
    const output = formatParallelLayers(graph);
    expect(output).toContain('Layer 0: root');
    expect(output).toContain('merge');
  });

  it('writeOrPrint creates nested dirs and writes content', () => {
    const outPath = path.join(tmpDir, 'a', 'b', 'graph.txt');
    writeOrPrint('hello world', outPath);
    expect(fs.readFileSync(outPath, 'utf8')).toBe('hello world');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Graph output written to'));
  });

  it('writeOrPrint prints to console when no output path', () => {
    writeOrPrint('test content');
    expect(logSpy).toHaveBeenCalledWith('test content');
  });

  it('buildMermaid handles multi-edge graph', () => {
    const graph = {
      skills: {
        A: { depends_on: [] },
        B: { depends_on: ['A'] },
        C: { depends_on: ['A'] },
        D: { depends_on: ['B', 'C'] },
      },
    };
    const mermaid = buildMermaid(graph);
    expect(mermaid).toContain('graph TD');
    const arrowCount = (mermaid.match(/-->/g) || []).length;
    expect(arrowCount).toBe(4);
  });

  it('buildMermaid handles empty graph', () => {
    const mermaid = buildMermaid({ skills: {} });
    expect(mermaid).toContain('empty[No graph nodes]');
  });

  it('getEdges returns correct edges for diamond', () => {
    const graph = {
      skills: {
        A: { depends_on: [] },
        B: { depends_on: ['A'] },
        C: { depends_on: ['A'] },
        D: { depends_on: ['B', 'C'] },
      },
    };
    const edges = getEdges(graph);
    expect(edges.length).toBe(4);
    expect(edges).toContainEqual({ from: 'A', to: 'B' });
    expect(edges).toContainEqual({ from: 'C', to: 'D' });
  });

  it('getLayers produces correct topology for diamond', () => {
    const graph = {
      skills: {
        A: { depends_on: [] },
        B: { depends_on: ['A'] },
        C: { depends_on: ['A'] },
        D: { depends_on: ['B', 'C'] },
      },
    };
    const layers = getLayers(graph);
    expect(layers[0]).toEqual(['A']);
    expect(layers[1].sort()).toEqual(['B', 'C']);
    expect(layers[2]).toEqual(['D']);
  });

  it('formatAnalyze handles graph with no skills', () => {
    const output = formatAnalyze({ name: 'empty', skills: {} });
    expect(output).toContain('Nodes: 0');
    expect(output).toContain('(none)');
  });

  it('formatAnalyze handles nodes with no edges', () => {
    const graph = { name: 'solo', skills: { A: { depends_on: [] } } };
    const output = formatAnalyze(graph);
    expect(output).toContain('Entry nodes: A');
    expect(output).toContain('Terminal nodes: A');
  });
});
