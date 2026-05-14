/**
 * @typedef {Object} ChangeOptions
 * @property {string} [title] - Change title
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} ApplyOptions
 * @property {string} [task] - Task ID to apply
 * @property {boolean} [dryRun] - Show what would be done
 * @property {string} [testCommand] - Custom test command
 * @property {boolean} [delegate] - Write cross-model delegation evidence on failure
 * @property {string} [e2eCommand] - Run E2E probe
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} VerifyOptions
 * @property {boolean} [constitution] - Skip constitution check
 * @property {boolean} [lint] - Run lint check
 * @property {string} [lintCommand] - Custom lint command
 * @property {string} [testCommand] - Custom test command
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} WorkspaceInfo
 * @property {string} name - Workspace name
 * @property {string} root - Workspace root directory
 * @property {string} sourceDir - Source directory
 * @property {string} packageJson - Path to package.json
 */

/**
 * @typedef {Object} EvidenceReport
 * @property {string} type - Report type (verify, guard, mutation)
 * @property {string} id - Report ID
 * @property {string} timestamp - ISO timestamp
 * @property {Object} results - Verification results
 * @property {Object} metadata - Additional metadata
 * @property {string} status - Overall status (pass, fail, warn)
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} name - Node name
 * @property {string} description - Node description
 * @property {string} phase - Execution phase
 * @property {string[]} inputs - Input files
 * @property {string[]} outputs - Output files
 * @property {string[]} [next] - Next nodes
 * @property {Object} metadata - Node metadata
 */

/**
 * @typedef {Object} GraphDefinition
 * @property {string} version - Graph version
 * @property {string} name - Graph name
 * @property {Object} config - Graph configuration
 * @property {Object.<string, GraphNode>} skills - Skill nodes
 */

/**
 * @typedef {Object} ConstitutionArticle
 * @property {number} n - Article number
 * @property {string} name - Article name
 * @property {string} priority - Priority level (Blocking, Warning, Suggestion)
 * @property {string} desc - Description
 * @property {string} enforcement - Enforcement method
 */

/**
 * @typedef {Object} MutationResult
 * @property {number} score - Mutation score
 * @property {number} threshold - Score threshold
 * @property {string} status - Status (pass, fail)
 * @property {number} assertions - Number of assertions
 * @property {number} placeholders - Number of placeholder assertions
 * @property {number} emptyTests - Number of empty tests
 */

/**
 * @typedef {Object} GuardReport
 * @property {Object} constitution - Constitution check results
 * @property {Object} lint - Lint check results
 * @property {Object} coverage - Coverage check results
 * @property {Object} testCommands - Test command detection results
 * @property {Object} mutation - Mutation evidence results
 */

module.exports = {};
