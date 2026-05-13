module.exports = {
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/stdd/templates/starters/',
    '/existing-project/',
    '/js-starter-test/',
    '/my-awesome-app/',
    '/py-starter-test/',
    '/ts-starter-test/',
    '/go-starter-test/',
    '/rust-starter-test/',
    '/stdd-integrated-test/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/stdd/templates/starters',
  ],
  verbose: true,
};
