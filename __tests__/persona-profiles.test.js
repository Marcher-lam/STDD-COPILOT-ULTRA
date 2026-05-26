const {
  PERSONA_PROFILES,
  ACTIVATION_STEPS,
  getPersonaForRole,
  activatePersona,
  getPersona,
  listPersonaNames,
} = require('../src/config/persona-profiles');

describe('persona-profiles', () => {
  describe('PERSONA_PROFILES', () => {
    it('has 12 persona entries matching role IDs', () => {
      const expectedIds = [
        'po', 'developer', 'tester', 'reviewer', 'architect',
        'security', 'devops', 'ux', 'ba', 'techwriter', 'qalead', 'dataanalyst',
      ];
      expect(Object.keys(PERSONA_PROFILES).sort()).toEqual(expectedIds.sort());
      expect(Object.keys(PERSONA_PROFILES)).toHaveLength(12);
    });

    it.each(Object.keys(PERSONA_PROFILES))('persona %s has required fields', (id) => {
      const p = PERSONA_PROFILES[id];
      expect(p).toHaveProperty('firstName');
      expect(p).toHaveProperty('fullName');
      expect(p).toHaveProperty('personality');
      expect(p).toHaveProperty('catchphrase');
      expect(p).toHaveProperty('greeting');
      expect(p).toHaveProperty('persistentFacts');
      expect(p).toHaveProperty('communicationStyle');
      expect(p).toHaveProperty('activationProtocol');
      expect(typeof p.firstName).toBe('string');
      expect(typeof p.fullName).toBe('string');
      expect(typeof p.personality).toBe('string');
      expect(typeof p.catchphrase).toBe('string');
      expect(typeof p.greeting).toBe('function');
      expect(Array.isArray(p.persistentFacts)).toBe(true);
      expect(p.persistentFacts.length).toBeGreaterThan(0);
    });

    it.each(Object.keys(PERSONA_PROFILES))('persona %s has communicationStyle with tone/verbosity/technicalDepth', (id) => {
      const p = PERSONA_PROFILES[id];
      expect(p.communicationStyle).toHaveProperty('tone');
      expect(p.communicationStyle).toHaveProperty('verbosity');
      expect(p.communicationStyle).toHaveProperty('technicalDepth');
    });

    it('all personas have 8-step activation protocol', () => {
      for (const [id, p] of Object.entries(PERSONA_PROFILES)) {
        expect(p.activationProtocol).toHaveLength(8);
        expect(p.activationProtocol).toEqual(ACTIVATION_STEPS);
      }
    });

    it('greeting functions return strings with persona name', () => {
      for (const [id, p] of Object.entries(PERSONA_PROFILES)) {
        const greeting = p.greeting('');
        expect(typeof greeting).toBe('string');
        expect(greeting.length).toBeGreaterThan(0);
        expect(greeting).toContain(p.firstName);
      }
    });

    it('greeting accepts userName parameter', () => {
      const greeting = PERSONA_PROFILES.po.greeting('Alice');
      expect(greeting).toContain('Alice');
    });
  });

  describe('getPersonaForRole', () => {
    it('returns merged role + persona for valid roleId', () => {
      const result = getPersonaForRole('architect');
      expect(result).toBeTruthy();
      expect(result.id).toBe('architect');
      expect(result.name).toBe('Architect');
      expect(result.lens).toBeTruthy();
      expect(result.expertise).toBeInstanceOf(Array);
      expect(result.persona).toBeTruthy();
      expect(result.persona.firstName).toBe('Wei');
      expect(result.persona.fullName).toBe('Wei Zhang, Architect');
    });

    it('returns all 12 roles with persona data', () => {
      const ids = ['po', 'developer', 'tester', 'reviewer', 'architect',
        'security', 'devops', 'ux', 'ba', 'techwriter', 'qalead', 'dataanalyst'];
      for (const id of ids) {
        const result = getPersonaForRole(id);
        expect(result).not.toBeNull();
        expect(result.persona).toBeTruthy();
        expect(result.persona.firstName).toBeTruthy();
      }
    });

    it('returns null for unknown roleId', () => {
      expect(getPersonaForRole('nonexistent')).toBeNull();
    });
  });

  describe('activatePersona', () => {
    it('generates activation transcript for a known role', () => {
      const transcript = activatePersona('developer', { topic: 'auth refactor' });
      expect(typeof transcript).toBe('string');
      expect(transcript).toContain('Alex Kim');
      expect(transcript).toContain('auth refactor');
      expect(transcript).toContain('implementation simplicity');
    });

    it('includes all 8 activation steps', () => {
      const transcript = activatePersona('po', { topic: 'new feature', projectContext: 'React SPA' });
      expect(transcript).toContain('Maya Chen');
      expect(transcript).toContain('Recalled context');
      expect(transcript).toContain('My lens:');
      expect(transcript).toContain('Key risks');
      expect(transcript).toContain('checklist');
      expect(transcript).toContain('recommendation');
      expect(transcript).toContain('blockers');
      expect(transcript).toContain('focus on');
    });

    it('works without topic or context', () => {
      const transcript = activatePersona('security');
      expect(transcript).toContain('Shield Okafor');
      expect(transcript).toContain('starting fresh');
    });

    it('throws for unknown role', () => {
      expect(() => activatePersona('unknown')).toThrow('Unknown role: unknown');
    });

    it('includes persona catchphrase at the end', () => {
      const transcript = activatePersona('tester');
      expect(transcript).toContain(PERSONA_PROFILES.tester.catchphrase);
    });
  });

  describe('getPersona', () => {
    it('returns persona profile for valid ID', () => {
      const p = getPersona('ux');
      expect(p).toBeTruthy();
      expect(p.firstName).toBe('Luna');
    });

    it('returns null for unknown ID', () => {
      expect(getPersona('nobody')).toBeNull();
    });
  });

  describe('listPersonaNames', () => {
    it('returns 12 persona entries', () => {
      const names = listPersonaNames();
      expect(names).toHaveLength(12);
      expect(names[0]).toHaveProperty('id');
      expect(names[0]).toHaveProperty('firstName');
      expect(names[0]).toHaveProperty('fullName');
    });
  });
});
