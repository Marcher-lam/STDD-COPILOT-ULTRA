'use strict';

const { Greeter } = require('../src/index');

describe('Greeter', () => {
  it('should greet with a name', () => {
    const greeter = new Greeter();
    expect(greeter.greet('World')).toBe('Hello, World!');
  });

  it('should greet with default when no name given', () => {
    const greeter = new Greeter();
    expect(greeter.greet()).toBe('Hello, World!');
  });
});
