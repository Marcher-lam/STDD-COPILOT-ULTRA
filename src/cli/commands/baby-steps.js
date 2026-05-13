/**
 * Baby Steps Command (TDD Guessing Game)
 * Implements the pedagogical interaction: Guess the Test -> System Feedback -> Implement Test.
 */
const inquirer = require('inquirer');
const chalk = require('chalk');

class BabyStepsCommand {
  constructor(changeDir) {
    this.changeDir = changeDir;
  }

  async execute(taskName) {
    console.log(chalk.bold('\n 🧩 Baby Steps TDD Game'));
    console.log(chalk.dim(`Target: ${taskName}`));
    console.log('');

    // Step 1: Ask user to guess the minimal test
    const testAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'userGuess',
        message: chalk.bold("What is the absolute smallest failing test for this step?")
      }
    ]);

    console.log(chalk.cyan(`\n Your guess: ${testAnswer.userGuess}`));

    // Step 2: System feedback (Heuristic simulation of "Best Practice")
    console.log(chalk.green('\n Feedback / Best Practice:'));
    console.log(` For this step, focus on the ${this.extractKeyEntity(testAnswer.userGuess)} scenario.`);
    console.log(` Avoid mocking complex dependencies. Just test the input->output.`);
    
    // Step 3: Ask for implementation plan
    const implAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'implGuess',
        message: chalk.bold("What is the minimal code change to pass this test?"),
        default: 'Return a hardcoded value or constant.'
      }
    ]);

    console.log(chalk.green('\n Next Step:'));
    console.log(` Write the test and run it. Ensure it fails (RED).`);
    console.log(` Then write only enough code to pass: ${implAnswer.implGuess}`);
    console.log('');
    console.log(chalk.dim('Run "stdd apply" to verify your implementation.'));

    return { testGuess: testAnswer.userGuess, implGuess: implAnswer.implGuess };
  }

  extractKeyEntity(text) {
    // Simple heuristic to pick out nouns/entities
    const words = text.split(' ');
    return words.length > 4 ? words[words.length - 2] : 'happy path';
  }
}

module.exports = { BabyStepsCommand };
