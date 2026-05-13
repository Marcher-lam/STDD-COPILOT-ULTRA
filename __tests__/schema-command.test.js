const fs = require('fs');
const path = require('path');
const os = require('os');
const { SchemaCommand } = require('../src/cli/commands/schema');

describe('SchemaCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-schema-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = null;
  }

  describe('validate', () => {
    it('should pass when all JSON files are valid', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'valid.json'),
        JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: {} })
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      expect(result.files).toHaveLength(1);
      teardown();
    });

    it('should pass when all YAML files are valid', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'valid.yaml'),
        'type: object\nproperties:\n  name:\n    type: string\n'
      );
      fs.writeFileSync(
        path.join(schemasDir, 'valid.yml'),
        'type: array\nitems:\n  type: string\n'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      expect(result.files).toHaveLength(2);
      teardown();
    });

    it('should fail when JSON file has syntax error', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'invalid.json'),
        '{"type": "object",, "properties": {}}'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].file).toContain('invalid.json');
      expect(result.errors[0].line).toBeDefined();
      teardown();
    });

    it('should fail when YAML file has syntax error', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'invalid.yaml'),
        'type: object\n  bad indent: [unclosed\n'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].file).toContain('invalid.yaml');
      teardown();
    });

    it('should return pass when no schemas directory exists', () => {
      setup();
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('nonexistent');
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      teardown();
    });

    it('should return pass when schemas directory is empty', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      expect(result.files).toHaveLength(0);
      teardown();
    });

    it('should find schemas/ directory by default when no path given', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'test.json'),
        '{"type": "string"}'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate(null);
      expect(result.status).toBe('pass');
      expect(result.files).toHaveLength(1);
      teardown();
    });

    it('should find src/schemas/ directory by default when no path given', () => {
      setup();
      const schemasDir = path.join(tempDir, 'src', 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'test.json'),
        '{"type": "number"}'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate(null);
      expect(result.status).toBe('pass');
      expect(result.files).toHaveLength(1);
      teardown();
    });

    it('should save evidence file when stdd/ directory exists', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'test.json'),
        '{"type": "string"}'
      );
      fs.mkdirSync(path.join(tempDir, 'stdd'), { recursive: true });
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('pass');
      expect(result.evidence).toBeDefined();
      expect(result.evidence.type).toBe('schema-validation');
      const evidenceDir = path.join(tempDir, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);
      const evidenceFiles = fs.readdirSync(evidenceDir).filter(f => f.startsWith('schema-validation-'));
      expect(evidenceFiles.length).toBeGreaterThanOrEqual(1);
      teardown();
    });

    it('should save evidence on validation failure', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'bad.json'),
        '{"broken": json}'
      );
      fs.mkdirSync(path.join(tempDir, 'stdd'), { recursive: true });
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      const evidenceDir = path.join(tempDir, 'stdd', 'evidence');
      const evidenceFiles = fs.readdirSync(evidenceDir).filter(f => f.startsWith('schema-validation-'));
      expect(evidenceFiles.length).toBeGreaterThanOrEqual(1);
      teardown();
    });

    it('should detect mixed valid and invalid files', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'good.json'),
        '{"type": "boolean"}'
      );
      fs.writeFileSync(
        path.join(schemasDir, 'bad.json'),
        '{type: "boolean"}'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      teardown();
    });

    it('should recursively scan subdirectories', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      const subDir = path.join(schemasDir, 'nested');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(
        path.join(subDir, 'nested.json'),
        '{"type": "object"}'
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas');
      expect(result.status).toBe('pass');
      expect(result.files).toHaveLength(1);
      teardown();
    });
  });

  describe('strict mode', () => {
    it('should pass when schema keywords are correct', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'schema.json'),
        JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        })
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas', { strict: true });
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      teardown();
    });

    it('should detect invalid type values in strict mode', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'schema.json'),
        JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'objec',
        })
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas', { strict: true });
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].error).toContain('Invalid type value');
      teardown();
    });

    it('should detect unknown schema keywords with $ prefix in strict mode', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'schema.json'),
        JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          $unknownKeyword: true,
          type: 'object',
        })
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas', { strict: true });
      expect(result.status).toBe('fail');
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].error).toContain('$unknownKeyword');
      teardown();
    });

    it('should not check strict mode without $schema', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'simple.json'),
        JSON.stringify({
          type: 'objec',
        })
      );
      const cmd = new SchemaCommand(tempDir);
      const result = cmd.validate('schemas', { strict: true });
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      teardown();
    });
  });

  describe('JSON output', () => {
    it('should produce valid JSON output when --json flag is set', () => {
      setup();
      const schemasDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasDir, 'test.json'),
        '{"type": "string"}'
      );
      const cmd = new SchemaCommand(tempDir);
      let capturedOutput = '';
      const originalLog = console.log;
      console.log = (msg) => { capturedOutput = msg; };
      try {
        const result = cmd.validate('schemas', { json: true });
        expect(result.status).toBe('pass');
        const parsed = JSON.parse(capturedOutput);
        expect(parsed.status).toBe('pass');
        expect(Array.isArray(parsed.files)).toBe(true);
      } finally {
        console.log = originalLog;
      }
      teardown();
    });
  });
});
