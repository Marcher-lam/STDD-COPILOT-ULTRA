/**
 * Logger
 * 
 * Structured logging for STDD Copilot.
 * Supports multiple log levels, log rotation, and structured output.
 */

const fs = require('fs');
const path = require('path');

/**
 * Log Levels
 */
const LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

/**
 * Logger Configuration
 */
class LoggerConfig {
  constructor(options = {}) {
    this.level = options.level || 'INFO';
    this.format = options.format || 'text'; // 'text' | 'json'
    this.output = options.output || 'console'; // 'console' | 'file' | 'both'
    this.logDir = options.logDir || path.join(process.cwd(), 'stdd', 'logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
  }
}

/**
 * STDD Logger
 */
class Logger {
  constructor(config = {}) {
    this.config = new LoggerConfig(config);
    this.currentLevel = LogLevels[this.config.level] || LogLevels.INFO;
    this.logFile = null;
    this.currentSize = 0;
    
    if (this.config.output === 'file' || this.config.output === 'both') {
      this.ensureLogDir();
      this.rotateLogFile();
    }
  }

  ensureLogDir() {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  rotateLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(this.config.logDir, `stdd-${timestamp}.log`);
    this.currentSize = 0;
  }

  shouldLog(level) {
    return LogLevels[level] >= this.currentLevel;
  }

  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    }
    
    // Text format
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    return logMessage;
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatLog(level, message, meta);

    // Console output
    if (this.config.output === 'console' || this.config.output === 'both') {
      const consoleMethod = level === 'ERROR' || level === 'FATAL' ? 'error' : 'log';
      console[consoleMethod](formattedMessage);
    }

    // File output
    if (this.config.output === 'file' || this.config.output === 'both') {
      this.writeToFile(formattedMessage);
    }
  }

  writeToFile(message) {
    const messageSize = Buffer.byteLength(message, 'utf8') + 1; // +1 for newline
    
    if (this.currentSize + messageSize > this.config.maxFileSize) {
      this.rotateLogFile();
    }
    
    fs.appendFileSync(this.logFile, message + '\n');
    this.currentSize += messageSize;
  }

  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  fatal(message, meta) {
    this.log('FATAL', message, meta);
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger(config = {}) {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

function setLogger(logger) {
  loggerInstance = logger;
}

module.exports = {
  LogLevels,
  Logger,
  LoggerConfig,
  getLogger,
  setLogger,
};
