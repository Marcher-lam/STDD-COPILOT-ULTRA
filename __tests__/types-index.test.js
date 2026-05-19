const { TASK_STATUS, GUARD_STATUS, CHANGE_PHASES } = require('../src/types');

describe('types/index.js', () => {
  test('TASK_STATUS has correct values', () => {
    expect(TASK_STATUS.PENDING).toBe(' ');
    expect(TASK_STATUS.IN_PROGRESS).toBe('~');
    expect(TASK_STATUS.DONE).toBe('x');
  });

  test('GUARD_STATUS has correct values', () => {
    expect(GUARD_STATUS.PASS).toBe('pass');
    expect(GUARD_STATUS.FAIL).toBe('fail');
    expect(GUARD_STATUS.WARN).toBe('warn');
    expect(GUARD_STATUS.SKIP).toBe('skip');
  });

  test('CHANGE_PHASES has 6 phases', () => {
    expect(Object.keys(CHANGE_PHASES).length).toBe(6);
    expect(CHANGE_PHASES.PROPOSAL).toBe('Phase 1: Proposal');
    expect(CHANGE_PHASES.SPECIFICATION).toBe('Phase 2: Specification');
    expect(CHANGE_PHASES.DESIGN).toBe('Phase 3: Design');
    expect(CHANGE_PHASES.IMPLEMENTATION).toBe('Phase 4: Implementation');
    expect(CHANGE_PHASES.VERIFICATION).toBe('Phase 5: Verification');
    expect(CHANGE_PHASES.COMPLETE).toBe('Phase 6: Complete');
  });

  test('all exports are frozen or constant-like', () => {
    expect(typeof TASK_STATUS).toBe('object');
    expect(typeof GUARD_STATUS).toBe('object');
    expect(typeof CHANGE_PHASES).toBe('object');
  });
});
