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

    createFeatureFile(projectPath, 'default-cbange', 'simple.feature', `Feature: Simple API

  Scenario: Make request
    When POST /api/data is called
`);

    const cmd = new ApiSpecCommand();
    const result = await cmd.execute('default-cbange');

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
});
