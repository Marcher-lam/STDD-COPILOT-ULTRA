const chalk = require('chalk');
const { commandRegistry } = require('./command-registry');

/**
 * Command Loader - Dynamically loads and registers commands
 * 
 * This module provides a centralized way to register commands
 * from the command registry, reducing boilerplate in cli.js
 */

class CommandLoader {
  constructor(program) {
    this.program = program;
    this.commands = new Map();
  }

  /**
   * Register all commands from the registry
   */
  registerAll() {
    for (const commandDef of commandRegistry) {
      this.registerCommand(commandDef);
    }
  }

  /**
   * Register a single command
   * @param {object} commandDef - Command definition from registry
   */
  registerCommand(commandDef) {
    const { name, alias, description, options, helpText, subcommands } = commandDef;

    // If this is a parent command with subcommands
    if (subcommands && subcommands.length > 0) {
      const parentCmd = this.program.command(name).description(description);
      
      // Register options on parent if any
      if (options) {
        for (const option of options) {
          parentCmd.option(option.flags, option.description, option.default);
        }
      }

      // Register subcommands
      for (const sub of subcommands) {
        this.registerSubcommand(parentCmd, sub);
      }
    } else {
      // Register as a regular command
      const cmd = this.program.command(name).description(description);
      
      if (alias) {
        cmd.alias(alias);
      }

      // Register options
      if (options) {
        for (const option of options) {
          cmd.option(option.flags, option.description, option.default);
        }
      }

      // Add help text if provided
      if (helpText) {
        cmd.addHelpText('after', helpText);
      }

      // Store command reference
      this.commands.set(name, cmd);
    }
  }

  /**
   * Register a subcommand
   * @param {object} parent - Parent command
   * @param {object} subDef - Subcommand definition
   */
  registerSubcommand(parent, subDef) {
    const { name, description, options, helpText } = subDef;
    
    const sub = parent.command(name).description(description);
    
    if (options) {
      for (const option of options) {
        sub.option(option.flags, option.description, option.default);
      }
    }

    if (helpText) {
      sub.addHelpText('after', helpText);
    }
  }

  /**
   * Get a registered command by name
   * @param {string} name - Command name
   * @returns {object|null}
   */
  getCommand(name) {
    return this.commands.get(name) || null;
  }

  /**
   * Get all registered commands
   * @returns {Map}
   */
  getAllCommands() {
    return this.commands;
  }
}

module.exports = { CommandLoader };
