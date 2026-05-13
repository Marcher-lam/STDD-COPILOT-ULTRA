'use strict';

class Greeter {
  greet(name) {
    return `Hello, ${name || 'World'}!`;
  }
}

module.exports = { Greeter };
