/**
 * Error Handler
 * 
 * Centralized error handling for STDD Copilot CLI.
 * Provides consistent error formatting, logging, and recovery.
 */

const chalk = require('chalk');

/**
 * STDD Error Codes
 */
const ErrorCodes = {
  // Initialization errors
  NOT_INITIALIZED: 'E001',
  ALREADY_INITIALIZED: 'E002',
  
  // Change errors
  CHANGE_NOT_FOUND: 'E101',
  CHANGE_ALREADY_EXISTS: 'E102',
  INVALID_CHANGE_NAME: 'E103',
  
  // Task errors
  TASK_NOT_FOUND: 'E201',
  TASK_ALREADY_COMPLETED: 'E202',
  
  // Validation errors
  VALIDATION_FAILED: 'E301',
  CONSTITUTION_VIOLATION: 'E302',
  
  // Execution errors
  COMMAND_FAILED: 'E401',
  TEST_FAILED: 'E402',
  MUTATION_FAILED: 'E403',
  
  // System errors
  FILE_SYSTEM_ERROR: 'E501',
  NETWORK_ERROR: 'E502',
  PERMISSION_DENIED: 'E503',
};

/**
 * STDD Base Error
 */
class STDDError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'STDDError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Handle CLI errors with consistent formatting
 * @param {Error} error - The error to handle
 * @param {object} options - Options
 * @returns {number} Exit code
 */
function handleCliError(error, options = {}) {
  const { silent = false, exit = true } = options;
  
  if (error instanceof STDDError) {
    if (!silent) {
      console.error(chalk.red(`\n❌ Error [${error.code}]: ${error.message}`));
      if (Object.keys(error.details).length > 0) {
        console.error(chalk.dim('Details:'), error.details);
      }
    }
    
    if (exit) {
      process.exit(1);
    }
    return 1;
  }

  // Generic error handling
  if (!silent) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(chalk.dim(error.stack));
    }
  }
  
  if (exit) {
    process.exit(1);
  }
  return 1;
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Function to wrap
 * @param {object} options - Options
 * @returns {Function}
 */
function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleCliError(error, options);
    }
  };
}

/**
 * Create a retry wrapper for async functions
 * @param {Function} fn - Function to wrap
 * @param {object} options - Options
 * @returns {Function}
 */
function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, onRetry } = options;
  
  return async (...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          if (onRetry) {
            onRetry(error, attempt);
          }
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  };
}

/**
 * Log error to evidence directory
 * @param {Error} error - The error to log
 * @param {string} evidenceDir - Evidence directory path
 */
function logErrorToEvidence(error, evidenceDir) {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  
  const errorFile = path.join(evidenceDir, `error-${Date.now()}.json`);
  const errorData = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code || 'UNKNOWN',
    stack: error.stack,
    details: error.details || {},
  };
  
  fs.writeFileSync(errorFile, JSON.stringify(errorData, null, 2));
}

module.exports = {
  ErrorCodes,
  STDDError,
  handleCliError,
  withErrorHandling,
  withRetry,
  logErrorToEvidence,
};
