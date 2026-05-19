const {
  normalizePath,
  workspaceToScope,
  resolveWorkspaceScope,
  commandToWorkspaceScope,
  workspaceMatchesScope,
  workspaceFromPath,
  extractEvidenceWorkspaceRefs,
  evidenceMatchesWorkspace,
} = require('../src/utils/workspace-scope');

describe('workspace-scope', () => {
  const cwd = '/project';

  describe('normalizePath', () => {
    test('converts backslashes to forward slashes', () => {
      expect(normalizePath('packages\\api')).toBe('packages/api');
    });

    test('strips leading ./', () => {
      expect(normalizePath('./src')).toBe('src');
    });

    test('strips trailing /', () => {
      expect(normalizePath('src/')).toBe('src');
    });

    test('handles null/undefined gracefully', () => {
      expect(normalizePath(null)).toBe('');
      expect(normalizePath(undefined)).toBe('');
    });
  });

  describe('workspaceToScope', () => {
    test('returns null for null input', () => {
      expect(workspaceToScope(cwd, null)).toBeNull();
    });

    test('converts workspace to scope object', () => {
      const ws = { name: 'api', root: '/project/packages/api' };
      const scope = workspaceToScope(cwd, ws);
      expect(scope.name).toBe('api');
      expect(scope.path).toBe('packages/api');
      expect(scope.root).toBe('/project/packages/api');
    });

    test('uses workspace name when root equals cwd', () => {
      const ws = { name: 'root', root: '/project' };
      const scope = workspaceToScope(cwd, ws);
      expect(scope.path).toBe('root');
    });
  });

  describe('resolveWorkspaceScope', () => {
    test('returns null for null selector', () => {
      expect(resolveWorkspaceScope(cwd, null)).toBeNull();
    });

    test('resolves string selector via workspace detector', () => {
      const scope = resolveWorkspaceScope(cwd, 'api');
      expect(scope).toBeNull();
    });

    test('accepts workspace object directly', () => {
      const ws = { name: 'api', root: '/project/packages/api' };
      const scope = resolveWorkspaceScope(cwd, ws);
      expect(scope.name).toBe('api');
    });
  });

  describe('commandToWorkspaceScope', () => {
    test('returns null for null command', () => {
      expect(commandToWorkspaceScope(cwd, null)).toBeNull();
    });

    test('returns null for non-workspace source', () => {
      expect(commandToWorkspaceScope(cwd, { source: 'root' })).toBeNull();
    });

    test('returns scope for workspace source', () => {
      const cmd = { source: 'workspace', workspaceName: 'api', cwd: '/project/packages/api' };
      const scope = commandToWorkspaceScope(cwd, cmd);
      expect(scope.name).toBe('api');
      expect(scope.path).toBe('packages/api');
    });
  });

  describe('workspaceMatchesScope', () => {
    test('returns false for null inputs', () => {
      expect(workspaceMatchesScope(null, 'api')).toBe(false);
      expect(workspaceMatchesScope({ name: 'api' }, null)).toBe(false);
    });

    test('matches by name', () => {
      const scope = { name: 'api', path: 'packages/api', root: '/project/packages/api' };
      expect(workspaceMatchesScope(scope, 'api')).toBe(true);
    });

    test('matches by path', () => {
      const scope = { name: 'api', path: 'packages/api', root: '/project/packages/api' };
      expect(workspaceMatchesScope(scope, 'packages/api')).toBe(true);
    });

    test('matches by root', () => {
      const scope = { name: 'api', path: 'packages/api', root: '/project/packages/api' };
      expect(workspaceMatchesScope(scope, '/project/packages/api')).toBe(true);
    });

    test('returns false for non-matching selector', () => {
      const scope = { name: 'api', path: 'packages/api', root: '/project/packages/api' };
      expect(workspaceMatchesScope(scope, 'web')).toBe(false);
    });
  });

  describe('workspaceFromPath', () => {
    test('extracts packages/* workspace', () => {
      expect(workspaceFromPath('packages/api/src/index.js')).toBe('packages/api');
    });

    test('extracts apps/* workspace', () => {
      expect(workspaceFromPath('apps/web/src/App.tsx')).toBe('apps/web');
    });

    test('returns null for non-workspace path', () => {
      expect(workspaceFromPath('src/index.js')).toBeNull();
    });

    test('returns null for root-level file', () => {
      expect(workspaceFromPath('package.json')).toBeNull();
    });

    test('handles Windows backslash paths after normalization', () => {
      expect(workspaceFromPath('packages\\api\\src\\index.js')).toBe('packages/api');
    });
  });

  describe('addScope (indirect via extractEvidenceWorkspaceRefs)', () => {
    test('extracts workspace string from metadata', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspace: 'packages/api/' },
      });
      expect(refs).toContain('packages/api');
    });

    test('extracts workspace from object metadata with known keys', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspace: { name: 'api', path: 'packages/api', root: '/project/packages/api' } },
      });
      expect(refs).toContain('api');
      expect(refs).toContain('packages/api');
    });

    test('handles null metadata workspace gracefully', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspace: null },
      });
      expect(refs).toEqual([]);
    });
  });

  describe('extractEvidenceWorkspaceRefs', () => {
    test('returns empty array for empty data', () => {
      expect(extractEvidenceWorkspaceRefs({})).toEqual([]);
    });

    test('extracts workspace from metadata', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspace: 'packages/api' },
      });
      expect(refs).toContain('packages/api');
    });

    test('extracts workspaces array from metadata', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspaces: ['packages/api', 'apps/web'] },
      });
      expect(refs).toContain('packages/api');
      expect(refs).toContain('apps/web');
    });

    test('extracts workspace from results.tests', () => {
      const refs = extractEvidenceWorkspaceRefs({
        results: { tests: { workspace: 'packages/api' } },
      });
      expect(refs).toContain('packages/api');
    });

    test('extracts workspace from constitution issue file path', () => {
      const refs = extractEvidenceWorkspaceRefs({
        results: {
          constitution: {
            issues: {
              blocking: [{ file: 'packages/api/src/handler.js', message: '' }],
            },
          },
        },
      });
      expect(refs).toContain('packages/api');
    });

    test('extracts workspace from constitution issue message regex', () => {
      const refs = extractEvidenceWorkspaceRefs({
        results: {
          constitution: {
            issues: {
              warning: [{ message: 'Check packages/api/src/index.ts for issues' }],
            },
          },
        },
      });
      expect(refs).toContain('packages/api');
    });

    test('returns sorted unique refs', () => {
      const refs = extractEvidenceWorkspaceRefs({
        metadata: { workspace: 'apps/web' },
        results: { workspace: 'packages/api' },
      });
      expect(refs).toEqual(['apps/web', 'packages/api']);
    });
  });

  describe('evidenceMatchesWorkspace', () => {
    test('returns true for null selector (no filter)', () => {
      expect(evidenceMatchesWorkspace({}, null)).toBe(true);
    });

    test('returns true when workspace matches exactly', () => {
      const data = { metadata: { workspace: 'packages/api' } };
      expect(evidenceMatchesWorkspace(data, 'packages/api')).toBe(true);
    });

    test('returns true when workspace ends with selector', () => {
      const data = { metadata: { workspace: 'packages/api' } };
      expect(evidenceMatchesWorkspace(data, 'api')).toBe(true);
    });

    test('returns false when no workspace matches', () => {
      const data = { metadata: { workspace: 'packages/api' } };
      expect(evidenceMatchesWorkspace(data, 'web')).toBe(false);
    });
  });
});
