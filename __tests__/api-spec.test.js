const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { ApiSpecCommand } = require('../src/cli/commands/api-spec');

describe('ApiSpecCommand', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-api-spec-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });

    return projectPath;
  }

  function createFeatureFile(projectPath, changeName, filename, content) {
    const specsDir = path.join(projectPath, 'stdd', 'changes', changeName, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, filename), content, 'utf8');
  }

  function createWorkspace(projectPath, workspacePath, name) {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    const root = path.join(projectPath, workspacePath);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }, null, 2));
  }

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should generate YAML with POST /api/users path from feature file', async () => {
    const projectPath = createTempProject('api-users-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'create-user', 'create-user.feature', `Feature: Create User

  Scenario: Create a new user
    Given the user provides valid data
    When POST /api/users is called with user object in the request body
    Then the response should be 201 Created
    And the user is created in the database
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('create-user');

    expect(fs.existsSync(result.outputPath)).toBe(true);

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.openapi).toBe('3.0.0');
    expect(doc.paths['/api/users']).toBeDefined();
    expect(doc.paths['/api/users'].post).toBeDefined();
  });

  it('should generate response 200 for GET /api/items scenario', async () => {
    const projectPath = createTempProject('api-items-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'list-items', 'list-items.feature', `Feature: List Items

Scenario: Fetch all items
  Given the items exist in the system
  When GET /api/items is called
  Then the response should be 200 OK
  And the response body contains a list of items
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('list-items');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/items']).toBeDefined();
    expect(doc.paths['/api/items'].get).toBeDefined();
    expect(doc.paths['/api/items'].get.responses['200']).toBeDefined();
    expect(doc.paths['/api/items'].get.responses['200'].description).toContain('200 OK');
  });

  it('should handle multiple endpoints from multiple feature files', async () => {
    const projectPath = createTempProject('multi-endpoint-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'crud-users', 'create-user.feature', `Feature: Create User

  Scenario: Create a new user
    When POST /api/users is called
    Then the response should be 201 Created
`);

    createFeatureFile(projectPath, 'crud-users', 'delete-user.feature', `Feature: Delete User

  Scenario: Delete a user
    When DELETE /api/users/{id} is called
    Then the response should be 204 No Content
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('crud-users');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/users']).toBeDefined();
    expect(doc.paths['/api/users'].post).toBeDefined();
    expect(doc.paths['/api/users/{id}']).toBeDefined();
    expect(doc.paths['/api/users/{id}'].delete).toBeDefined();
  });

  it('should include request body hints when payload keyword is found', async () => {
    const projectPath = createTempProject('request-body-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'update-user', 'update-user.feature', `Feature: Update User

  Scenario: Update user profile
    Given the payload contains the updated fields
    When PUT /api/users/{id} is called with the request body
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('update-user');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/users/{id}'].put.requestBody).toBeDefined();
    expect(doc.paths['/api/users/{id}'].put.requestBody.required).toBe(true);
  });

  it('should output JSON when format option is json', async () => {
    const projectPath = createTempProject('json-output-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'json-change', 'test.feature', `Feature: Test

  Scenario: Get health
    When GET /api/health is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('json-change', { format: 'json' });

    expect(result.openapiDoc).toBeDefined();
    expect(result.openapiDoc.openapi).toBe('3.0.0');
  });

  it('should throw when change does not exist', async () => {
    const projectPath = createTempProject('missing-change-project');
    process.chdir(projectPath);

    const cmd = new ApiSpecCommand();

    await expect(cmd.execute('nonexistent-change')).rejects.toThrow(
      "Change 'nonexistent-change' does not exist in stdd/changes/."
    );
  });

  it('should throw when no feature files exist', async () => {
    const projectPath = createTempProject('no-features-project');
    process.chdir(projectPath);

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'empty-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(path.join(changeDir, 'specs'));

    const cmd = new ApiSpecCommand();

    await expect(cmd.execute('empty-change')).rejects.toThrow(
      'No .feature files found'
    );
  });

  it('should extract path parameters and add them as parameters', async () => {
    const projectPath = createTempProject('path-params-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'get-user-by-id', 'get-user.feature', `Feature: Get User by ID

  Scenario: Fetch single user
    When GET /api/users/{id} is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('get-user-by-id');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/users/{id}'].get.parameters).toBeDefined();
    expect(doc.paths['/api/users/{id}'].get.parameters[0].name).toBe('id');
    expect(doc.paths['/api/users/{id}'].get.parameters[0].in).toBe('path');
    expect(doc.paths['/api/users/{id}'].get.parameters[0].required).toBe(true);
  });

  it('should generate default 200 response when no status code is found', async () => {
    const projectPath = createTempProject('default-response-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'default-change', 'simple.feature', `Feature: Simple API

  Scenario: Make request
    When POST /api/data is called
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('default-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/data'].post.responses).toBeDefined();
    expect(doc.paths['/api/data'].post.responses['200']).toBeDefined();
  });

  it('should include tag derived from feature file name', async () => {
    const projectPath = createTempProject('tags-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'tag-change', 'user-auth.feature', `Feature: User Auth

  Scenario: Login
    When POST /api/login is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('tag-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/login'].post.tags).toContain('user_auth');
  });

  it('should generate workspace API spec from matching workspace features only', async () => {
    const projectPath = createTempProject('workspace-api-spec-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');
    createWorkspace(projectPath, 'packages/web', '@demo/web');

    createFeatureFile(projectPath, 'workspace-change', 'packages-api-users.feature', `# Workspace: packages/api
Feature: API Users

  @workspace:packages-api
  Scenario: List API users
    When GET /api/users is called
    Then the response should be 200 OK
`);
    createFeatureFile(projectPath, 'workspace-change', 'packages-web-users.feature', `# Workspace: packages/web
Feature: Web Users

  @workspace:packages-web
  Scenario: List Web users
    When GET /web/users is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('workspace-change', { workspace: 'packages/api' });

    expect(path.basename(result.outputPath)).toBe('api-spec.packages-api.yaml');
    expect(result.workspace).toMatchObject({ name: '@demo/api', path: 'packages/api', tag: 'packages-api' });

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);
    expect(doc['x-stdd-workspace']).toBe('packages/api');
    expect(doc.info.title).toContain('packages/api');
    expect(doc.paths['/api/users']).toBeDefined();
    expect(doc.paths['/web/users']).toBeUndefined();
  });

  it('should throw when workspace does not exist', async () => {
    const projectPath = createTempProject('missing-workspace-api-spec-project');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'workspace-change'), { recursive: true });

    const cmd = new ApiSpecCommand();
    await expect(cmd.execute('workspace-change', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });

  it('should extract headers as request hints', async () => {
    const projectPath = createTempProject('header-hints-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'auth-api', 'auth.feature', `Feature: Auth API

  Scenario: Authenticated request
    Given the Authorization header is set
    When GET /api/protected is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('auth-api');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/protected'].get.requestBody).toBeDefined();
  });

  it('should extract query params as request hints', async () => {
    const projectPath = createTempProject('query-params-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'search-api', 'search.feature', `Feature: Search API

  Scenario: Search with query params
    Given the query parameters include page and limit
    When GET /api/search is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('search-api');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/search'].get.requestBody).toBeDefined();
  });

  it('should extract response body hints with JSON content', async () => {
    const projectPath = createTempProject('response-body-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'detail-api', 'detail.feature', `Feature: Detail API

  Scenario: Get user details
    When GET /api/users/{id} is called
    Then the response should be 200 OK
    And the response body contains {"name": "John"}
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('detail-api');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/users/{id}'].get.responses['200']).toBeDefined();
  });

  it('should extract Scenario Outline summary', async () => {
    const projectPath = createTempProject('scenario-outline-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'outline-change', 'outline.feature', `Feature: Outline API

  Scenario Outline: Get item by id
    When GET /api/items/{id} is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('outline-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/items/{id}']).toBeDefined();
    expect(doc.paths['/api/items/{id}'].get.summary).toBe('Get item by id');
  });

  it('should handle feature files without workspace scope when workspace is provided', async () => {
    const projectPath = createTempProject('no-scope-ws-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    // Feature files without workspace metadata or tags
    createFeatureFile(projectPath, 'noscope-change', 'generic.feature', `Feature: Generic API

  Scenario: Generic endpoint
    When GET /api/generic is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    // When no feature files have workspace scope, all features are included
    const result = await cmd.execute('noscope-change', { workspace: 'packages/api' });

    expect(result.openapiDoc.paths['/api/generic']).toBeDefined();
  });

  it('should filter workspace-scoped features to matching workspace only', async () => {
    const projectPath = createTempProject('ws-filter-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');
    createWorkspace(projectPath, 'packages/web', '@demo/web');

    // Feature with workspace metadata matching packages/api
    createFeatureFile(projectPath, 'ws-filter-change', 'api-users.feature', `# Workspace: packages/api
Feature: API Users

  Scenario: List users
    When GET /api/users is called
    Then the response should be 200 OK
`);

    // Feature with workspace metadata matching packages/web (should be excluded)
    createFeatureFile(projectPath, 'ws-filter-change', 'web-pages.feature', `# Workspace: packages/web
Feature: Web Pages

  Scenario: List pages
    When GET /web/pages is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('ws-filter-change', { workspace: 'packages/api' });

    expect(result.openapiDoc.paths['/api/users']).toBeDefined();
    expect(result.openapiDoc.paths['/web/pages']).toBeUndefined();
  });

  it('should throw when workspace provided but no feature files match', async () => {
    const projectPath = createTempProject('no-match-ws-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    // Feature scoped to different workspace
    createFeatureFile(projectPath, 'nomatch-change', 'other.feature', `# Workspace: packages/other
Feature: Other

  @workspace:packages-other
  Scenario: Other endpoint
    When GET /other/endpoint is called
`);

    const cmd = new ApiSpecCommand();
    // All features have workspace scope but none match packages/api
    await expect(cmd.execute('nomatch-change', { workspace: 'packages/api' }))
      .rejects
      .toThrow('No .feature files found');
  });

  it('should throw with workspace suffix when no features found for workspace', async () => {
    const projectPath = createTempProject('ws-suffix-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'ws-suffix-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(path.join(changeDir, 'specs'));

    const cmd = new ApiSpecCommand();
    await expect(cmd.execute('ws-suffix-change', { workspace: 'packages/api' }))
      .rejects
      .toThrow("for workspace 'packages/api'");
  });

  it('should handle findFeatureFiles when specsDir does not exist', async () => {
    const cmd = new ApiSpecCommand();
    const files = await cmd.findFeatureFiles('/nonexistent/path/specs');
    expect(files).toEqual([]);
  });

  it('should include 3xx, 4xx, and 5xx status codes in response hints', async () => {
    const projectPath = createTempProject('status-codes-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'status-change', 'status.feature', `Feature: Status Codes API

  Scenario: Various responses
    When GET /api/test is called
    Then the response should be 200 OK
    And the response should be 404 NotFound
    And the response should be 500 Internal
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('status-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/test'].get.responses['200']).toBeDefined();
    expect(doc.paths['/api/test'].get.responses['404']).toBeDefined();
    expect(doc.paths['/api/test'].get.responses['500']).toBeDefined();
  });

  it('should not overwrite existing path method if already defined', async () => {
    const projectPath = createTempProject('dup-method-project');
    process.chdir(projectPath);

    // Two feature files with the same endpoint and method
    createFeatureFile(projectPath, 'dup-change', 'first.feature', `Feature: First

  Scenario: First call
    When GET /api/items is called
    Then the response should be 200 OK
`);
    createFeatureFile(projectPath, 'dup-change', 'second.feature', `Feature: Second

  Scenario: Second call
    When GET /api/items is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('dup-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    // Should keep the first definition, not crash
    expect(doc.paths['/api/items'].get).toBeDefined();
  });

  it('should handle buildRequestBody with no body hint', async () => {
    const cmd = new ApiSpecCommand();
    const hints = [{ line: 1, type: 'header', text: 'Authorization: Bearer token' }];
    const result = cmd.buildRequestBody(hints);
    expect(result.required).toBe(true);
    expect(result.content['application/json'].schema.properties).toHaveProperty('data');
  });

  it('should handle buildRequestBody with body hint', async () => {
    const cmd = new ApiSpecCommand();
    const hints = [{ line: 1, type: 'body_ref', text: 'request body with user data' }];
    const result = cmd.buildRequestBody(hints);
    expect(result.required).toBe(true);
    expect(result.content['application/json'].schema.description).toBe('request body with user data');
  });

  it('should remove empty schemas from components', async () => {
    const projectPath = createTempProject('no-schemas-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'noschema-change', 'simple.feature', `Feature: Simple

  Scenario: Simple call
    When GET /api/simple is called
    Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('noschema-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.components).toBeDefined();
    // schemas should be deleted if empty
    expect(doc.components.schemas).toBeUndefined();
  });

  it('should use auto-generated summary when no scenario found', async () => {
    const projectPath = createTempProject('auto-summary-project');
    process.chdir(projectPath);

    createFeatureFile(projectPath, 'autosum-change', 'no-scenario.feature', `Feature: No Scenario

When GET /api/no-scenario is called
Then the response should be 200 OK
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('autosum-change');

    const content = fs.readFileSync(result.outputPath, 'utf8');
    const doc = yaml.load(content);

    expect(doc.paths['/api/no-scenario'].get.summary).toContain('Auto-generated');
  });

  it('should detect feature with workspace tags', async () => {
    const cmd = new ApiSpecCommand();

    // Test with actual content by writing temp files
    const projectPath = createTempProject('ws-tag-detect-project');

    // Test with workspace tags
    const tempFile = path.join(projectPath, 'tagged.feature');
    fs.writeFileSync(tempFile, `@workspace:my-tag\nFeature: Tagged\n  Scenario: Test\n    When GET /api/test is called`);
    expect(cmd.featureHasWorkspaceScope(tempFile)).toBe(true);

    // Test with workspace metadata
    const tempFile2 = path.join(projectPath, 'meta.feature');
    fs.writeFileSync(tempFile2, `# Workspace: some/path\nFeature: Meta\n  Scenario: Test\n    When GET /api/test is called`);
    expect(cmd.featureHasWorkspaceScope(tempFile2)).toBe(true);

    // Test without workspace scope
    const tempFile3 = path.join(projectPath, 'plain.feature');
    fs.writeFileSync(tempFile3, `Feature: Plain\n  Scenario: Test\n    When GET /api/test is called`);
    expect(cmd.featureHasWorkspaceScope(tempFile3)).toBe(false);
  });

  // ===== NEW TESTS FOR ENHANCED FEATURES =====

  describe('TypeScript Types Generation', () => {
    it('should generate TypeScript types when --full flag is provided', async () => {
      const projectPath = createTempProject('ts-types-project');
      process.chdir(projectPath);
      // Add package.json for language detection
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test' }, null, 2));

      createFeatureFile(projectPath, 'users-api', 'users.feature', `Feature: Users API

  Scenario: Create user
    When POST /api/users is called
    Then the response should be 201 Created

  Scenario: Get user
    When GET /api/users/{id} is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('users-api', { full: true });

      expect(result.results.types).toBeDefined();
      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const typesContent = fs.readFileSync(typesPath, 'utf8');
      expect(typesContent).toContain('export interface User');
      expect(typesContent).toContain('export interface ApiResponse<T>');
    });

    it('should generate TypeScript types only when --types-only flag is provided', async () => {
      const projectPath = createTempProject('ts-only-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'items-api', 'items.feature', `Feature: Items API

  Scenario: List items
    When GET /api/items is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('items-api', { language: 'typescript', typesOnly: true });

      expect(result.results.types).toBeDefined();
      expect(result.results.mocks).toBeUndefined();
      expect(result.results.validators).toBeUndefined();
    });
  });

  describe('MSW Handlers Generation', () => {
    it('should generate MSW handlers when --full flag is provided', async () => {
      const projectPath = createTempProject('msw-handlers-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test' }, null, 2));

      createFeatureFile(projectPath, 'products-api', 'products.feature', `Feature: Products API

  Scenario: Create product
    When POST /api/products is called
    Then the response should be 201 Created

  Scenario: Get product
    When GET /api/products/{id} is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('products-api', { full: true });

      expect(result.results.mocks).toBeDefined();
      const mswPath = path.join(projectPath, result.results.mocks.path);
      expect(fs.existsSync(mswPath)).toBe(true);

      const mswContent = fs.readFileSync(mswPath, 'utf8');
      expect(mswContent).toContain("import { http, HttpResponse } from 'msw'");
      expect(mswContent).toContain('productHandlers');
      expect(mswContent).toContain('http.post');
      expect(mswContent).toContain('http.get');
      expect(mswContent).toContain('HttpResponse.json');
    });

    it('should generate MSW handlers with DELETE returning 204', async () => {
      const projectPath = createTempProject('msw-delete-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'delete-api', 'delete.feature', `Feature: Delete API

  Scenario: Delete item
    When DELETE /api/items/{id} is called
    Then the response should be 204 No Content
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('delete-api', { language: 'ts', mswOnly: true });

      const mswPath = path.join(projectPath, result.results.mocks.path);
      const mswContent = fs.readFileSync(mswPath, 'utf8');

      expect(mswContent).toContain('http.delete');
      expect(mswContent).toContain('new HttpResponse(null, { status: 204 })');
    });
  });

  describe('Zod Schemas Generation', () => {
    it('should generate Zod schemas when --full flag is provided', async () => {
      const projectPath = createTempProject('zod-schemas-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test' }, null, 2));

      createFeatureFile(projectPath, 'orders-api', 'orders.feature', `Feature: Orders API

  Scenario: Create order
    When POST /api/orders is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('orders-api', { full: true });

      expect(result.results.validators).toBeDefined();
      const zodPath = path.join(projectPath, result.results.validators.path);
      expect(fs.existsSync(zodPath)).toBe(true);

      const zodContent = fs.readFileSync(zodPath, 'utf8');
      expect(zodContent).toContain("import { z } from 'zod'");
      expect(zodContent).toContain('OrderSchema');
      expect(zodContent).toContain('z.object({');
      expect(zodContent).toContain('z.infer<typeof');
    });

    it('should generate Zod schemas with ApiResponse wrapper', async () => {
      const projectPath = createTempProject('zod-api-response-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'wrapped-api', 'wrapped.feature', `Feature: Wrapped API

  Scenario: Get wrapped
    When GET /api/wrapped is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('wrapped-api', { language: 'typescript', zodOnly: true });

      const zodPath = path.join(projectPath, result.results.validators.path);
      const zodContent = fs.readFileSync(zodPath, 'utf8');

      expect(zodContent).toContain('ApiResponseSchema');
      expect(zodContent).toContain('dataSchema');
    });
  });

  describe('Type Inference', () => {
    it('should infer resource name from path', () => {
      const cmd = new ApiSpecCommand();

      expect(cmd.inferResourceName('/api/users', 'GET')).toBe('User');
      expect(cmd.inferResourceName('/api/users/{id}', 'GET')).toBe('User');
      expect(cmd.inferResourceName('/api/products', 'POST')).toBe('Product');
      expect(cmd.inferResourceName('/api/user-preferences', 'GET')).toBe('UserPreference');
    });

    it('should infer operation name from method and resource', () => {
      const cmd = new ApiSpecCommand();

      expect(cmd.inferOperationName('GET', 'User')).toBe('getUser');
      expect(cmd.inferOperationName('POST', 'User')).toBe('createUser');
      expect(cmd.inferOperationName('PUT', 'User')).toBe('updateUser');
      expect(cmd.inferOperationName('PATCH', 'User')).toBe('patchUser');
      expect(cmd.inferOperationName('DELETE', 'User')).toBe('deleteUser');
    });

    it('should singularize resource names', () => {
      const cmd = new ApiSpecCommand();

      expect(cmd.singularize('users')).toBe('user');
      expect(cmd.singularize('items')).toBe('item');
      expect(cmd.singularize('categories')).toBe('category');
      expect(cmd.singularize('statuses')).toBe('status');
      expect(cmd.singularize('class')).toBe('class');
    });

    it('should convert to pascal case', () => {
      const cmd = new ApiSpecCommand();

      expect(cmd.pascalCase('user')).toBe('User');
      expect(cmd.pascalCase('user-preferences')).toBe('UserPreferences');
      expect(cmd.pascalCase('api_key')).toBe('ApiKey');
    });

    it('should convert to camel case', () => {
      const cmd = new ApiSpecCommand();

      expect(cmd.camelCase('User')).toBe('user');
      expect(cmd.camelCase('UserPreferences')).toBe('userPreferences');
      expect(cmd.camelCase('Api_Key')).toBe('apiKey');
      expect(cmd.camelCase('API_KEY')).toBe('aPIKEY'); // Edge case: all caps with underscores
    });
  });

  describe('Multi-Language Support', () => {
    it('should detect TypeScript project from tsconfig.json', async () => {
      const projectPath = createTempProject('lang-detect-ts-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }, null, 2));

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('typescript');
    });

    it('should detect Python project from requirements.txt', async () => {
      const projectPath = createTempProject('lang-detect-py-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'requirements.txt'), 'pytest\npydantic\n');

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('python');
    });

    it('should detect Go project from go.mod', async () => {
      const projectPath = createTempProject('lang-detect-go-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'go.mod'), 'module test\n\ngo 1.21\n');

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('go');
    });

    it('should detect Java project from pom.xml', async () => {
      const projectPath = createTempProject('lang-detect-java-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'pom.xml'), '<?xml version="1.0"?><project></project>');

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('java');
    });

    it('should detect Rust project from Cargo.toml', async () => {
      const projectPath = createTempProject('lang-detect-rust-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'Cargo.toml'), '[package]\nname = "test"\n');

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('rust');
    });

    it('should detect C# project from .csproj file', async () => {
      const projectPath = createTempProject('lang-detect-cs-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'Test.csproj'), '<Project></Project>');

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('csharp');
    });

    it('should detect PHP project from composer.json', async () => {
      const projectPath = createTempProject('lang-detect-php-project');
      process.chdir(projectPath);
      fs.writeFileSync(path.join(projectPath, 'composer.json'), JSON.stringify({ name: 'test' }, null, 2));

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('php');
    });

    it('should return agnostic when no language files detected', async () => {
      const projectPath = createTempProject('lang-detect-none-project');
      process.chdir(projectPath);

      const cmd = new ApiSpecCommand();
      const detected = cmd.detectLanguage(projectPath);

      expect(detected).toBe('agnostic');
    });

    it('should resolve language aliases correctly', () => {
      const projectPath = createTempProject('lang-alias-project');
      process.chdir(projectPath);

      const cmd = new ApiSpecCommand();

      expect(cmd.resolveLanguage('ts', projectPath)).toBe('typescript');
      expect(cmd.resolveLanguage('js', projectPath)).toBe('javascript');
      expect(cmd.resolveLanguage('py', projectPath)).toBe('python');
      expect(cmd.resolveLanguage('golang', projectPath)).toBe('go');
      expect(cmd.resolveLanguage('cs', projectPath)).toBe('csharp');
      expect(cmd.resolveLanguage('csharp', projectPath)).toBe('csharp');
    });
  });

  describe('Python Artifact Generation', () => {
    it('should generate Python Pydantic models', async () => {
      const projectPath = createTempProject('py-models-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'users-api', 'users.feature', `Feature: Users API

  Scenario: Create user
    When POST /api/users is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('users-api', { language: 'python', typesOnly: true });

      expect(result.language).toBe('python');
      expect(result.results.types).toBeDefined();
      expect(result.results.types.language).toBe('python');

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('from pydantic import BaseModel');
      expect(content).toContain('class User(BaseModel):');
      expect(content).toContain('id: int');
    });

    it('should generate Python pytest fixtures', async () => {
      const projectPath = createTempProject('py-fixtures-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'items-api', 'items.feature', `Feature: Items API

  Scenario: List items
    When GET /api/items is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('items-api', { language: 'py', mocksOnly: true });

      expect(result.results.mocks).toBeDefined();

      const mocksPath = path.join(projectPath, result.results.mocks.path);
      const content = fs.readFileSync(mocksPath, 'utf8');

      expect(content).toContain('import pytest');
      expect(content).toContain('@pytest.fixture');
      expect(content).toContain('def mock_');
    });
  });

  describe('Java Artifact Generation', () => {
    it('should generate Java record classes', async () => {
      const projectPath = createTempProject('java-records-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'products-api', 'products.feature', `Feature: Products API

  Scenario: Create product
    When POST /api/products is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('products-api', { language: 'java', typesOnly: true });

      expect(result.language).toBe('java');
      expect(result.results.types).toBeDefined();

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('public record Product(');
      expect(content).toContain('Long id');
    });

    it('should generate Java WireMock stubs', async () => {
      const projectPath = createTempProject('java-wiremock-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'orders-api', 'orders.feature', `Feature: Orders API

  Scenario: List orders
    When GET /api/orders is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('orders-api', { language: 'java', mocksOnly: true });

      expect(result.results.mocks).toBeDefined();

      const mocksPath = path.join(projectPath, result.results.mocks.path);
      const content = fs.readFileSync(mocksPath, 'utf8');

      expect(content).toContain('WireMock');
      expect(content).toContain('MockServer');
    });
  });

  describe('Go Artifact Generation', () => {
    it('should generate Go structs', async () => {
      const projectPath = createTempProject('go-structs-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'tasks-api', 'tasks.feature', `Feature: Tasks API

  Scenario: Create task
    When POST /api/tasks is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('tasks-api', { language: 'go', typesOnly: true });

      expect(result.language).toBe('go');
      expect(result.results.types).toBeDefined();

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('package types');
      expect(content).toContain('type Task struct');
      expect(content).toContain('ID    int');
    });

    it('should generate Go httptest mocks', async () => {
      const projectPath = createTempProject('go-httptest-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'events-api', 'events.feature', `Feature: Events API

  Scenario: List events
    When GET /api/events is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('events-api', { language: 'go', mocksOnly: true });

      expect(result.results.mocks).toBeDefined();

      const mocksPath = path.join(projectPath, result.results.mocks.path);
      const content = fs.readFileSync(mocksPath, 'utf8');

      expect(content).toContain('httptest');
      expect(content).toContain('MockUsersHandler');
    });
  });

  describe('Rust Artifact Generation', () => {
    it('should generate Rust structs with serde derives', async () => {
      const projectPath = createTempProject('rust-structs-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'posts-api', 'posts.feature', `Feature: Posts API

  Scenario: Create post
    When POST /api/posts is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('posts-api', { language: 'rust', typesOnly: true });

      expect(result.language).toBe('rust');
      expect(result.results.types).toBeDefined();

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('use serde::{Serialize, Deserialize}');
      expect(content).toContain('#[derive(Debug, Clone, Serialize, Deserialize)]');
      expect(content).toContain('pub struct Post');
    });
  });

  describe('C# Artifact Generation', () => {
    it('should generate C# record classes', async () => {
      const projectPath = createTempProject('csharp-records-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'customers-api', 'customers.feature', `Feature: Customers API

  Scenario: Create customer
    When POST /api/customers is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('customers-api', { language: 'csharp', typesOnly: true });

      expect(result.language).toBe('csharp');
      expect(result.results.types).toBeDefined();

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('namespace Stdd.Api.Types');
      expect(content).toContain('public record Customer(');
    });
  });

  describe('PHP Artifact Generation', () => {
    it('should generate PHP DTO classes', async () => {
      const projectPath = createTempProject('php-dto-project');
      process.chdir(projectPath);

      createFeatureFile(projectPath, 'invoices-api', 'invoices.feature', `Feature: Invoices API

  Scenario: Create invoice
    When POST /api/invoices is called
    Then the response should be 201 Created
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('invoices-api', { language: 'php', typesOnly: true });

      expect(result.language).toBe('php');
      expect(result.results.types).toBeDefined();

      const typesPath = path.join(projectPath, result.results.types.path);
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf8');
      expect(content).toContain('namespace App\\DTO');
      expect(content).toContain('class InvoiceDTO');
    });
  });

  describe('Custom Output Directory', () => {
    it('should generate files in custom output directory', async () => {
      const projectPath = createTempProject('custom-output-project');
      process.chdir(projectPath);
      // Add package.json for language detection
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test' }, null, 2));

      createFeatureFile(projectPath, 'custom-api', 'custom.feature', `Feature: Custom API

  Scenario: Custom endpoint
    When GET /api/custom is called
    Then the response should be 200 OK
`);

      const cmd = new ApiSpecCommand();
      const result = await cmd.execute('custom-api', {
        full: true,
        outputDir: 'src/api/generated'
      });

      // Check that files are in the custom directory
      expect(result.outputPath).toContain('src/api/generated');
      expect(result.results.types.path).toContain('src/api/generated');
      expect(result.results.mocks.path).toContain('src/api/generated');
      expect(result.results.validators.path).toContain('src/api/generated');

      // Verify the directory structure (now includes language subdirectory)
      const typesPath = path.join(projectPath, 'src/api/generated/typescript/types/api-types.ts');
      const mswPath = path.join(projectPath, 'src/api/generated/typescript/mocks/msw-handlers.ts');
      const zodPath = path.join(projectPath, 'src/api/generated/typescript/validators/zod-schemas.ts');

      expect(fs.existsSync(typesPath)).toBe(true);
      expect(fs.existsSync(mswPath)).toBe(true);
      expect(fs.existsSync(zodPath)).toBe(true);
    });
  });
});
