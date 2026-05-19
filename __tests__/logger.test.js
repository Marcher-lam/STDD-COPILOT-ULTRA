const { createLogger, logger } = require('../src/utils/logger');

describe('createLogger', () => {
  let logSpy;
  let warnSpy;
  let errorSpy;
  let origStddLevel;
  let origLogLevel;

  beforeEach(() => {
    origStddLevel = process.env.STDD_LOG_LEVEL;
    origLogLevel = process.env.LOG_LEVEL;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    if (origStddLevel === undefined) delete process.env.STDD_LOG_LEVEL;
    else process.env.STDD_LOG_LEVEL = origStddLevel;
    if (origLogLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = origLogLevel;
  });

  it('creates a logger with module prefix', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('TestModule');
    mod.info('hello');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[TestModule]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello'));
  });

  it('debug is suppressed at default info level', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Test');
    mod.debug('should not appear');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('debug is shown when STDD_LOG_LEVEL=debug', () => {
    process.env.STDD_LOG_LEVEL = 'debug';
    const mod = createLogger('Test');
    mod.debug('visible');
    expect(logSpy).toHaveBeenCalled();
  });

  it('warn uses console.warn', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Test');
    mod.warn('caution');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('error uses console.error', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Test');
    mod.error('bad');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('defaults prefix to STDD when no module name', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger();
    mod.info('test');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[STDD]'));
  });

  it('LOG_LEVEL env var takes priority over STDD_LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'debug';
    process.env.STDD_LOG_LEVEL = 'error';
    const mod = createLogger('Priority');
    mod.debug('shown');
    expect(logSpy).toHaveBeenCalled();
  });

  it('falls back to info for unknown log levels', () => {
    process.env.LOG_LEVEL = 'nonsense';
    const mod = createLogger('Test');
    mod.debug('suppressed');
    expect(logSpy).not.toHaveBeenCalled();
    mod.info('shown');
    expect(logSpy).toHaveBeenCalled();
  });

  it('supports printf-style %s substitution', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Printf');
    mod.info('hello %s', 'world');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello world'));
  });

  it('appends leftover args after format substitution', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Printf');
    mod.info('value %s', 'x', 'extra1', 'extra2');
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('extra1');
    expect(output).toContain('extra2');
  });

  it('handles non-string first argument', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Obj');
    mod.info({ key: 'value' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[object Object]'));
  });

  it('handles number first argument', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Num');
    mod.info(42);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('42'));
  });

  it('info level is suppressed when level is warn', () => {
    process.env.STDD_LOG_LEVEL = 'warn';
    const mod = createLogger('Test');
    mod.info('suppressed');
    expect(logSpy).not.toHaveBeenCalled();
    mod.warn('shown');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('exports a singleton logger', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
  });

  it('formats %s with no args gracefully', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Fmt');
    mod.info('no substitution %s');
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles multiple %s placeholders', () => {
    delete process.env.STDD_LOG_LEVEL;
    const mod = createLogger('Fmt');
    mod.info('%s and %s', 'a', 'b');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('a and b'));
  });

  it('case-insensitive level matching', () => {
    process.env.STDD_LOG_LEVEL = 'DEBUG';
    const mod = createLogger('Case');
    mod.debug('case test');
    expect(logSpy).toHaveBeenCalled();
  });
});
