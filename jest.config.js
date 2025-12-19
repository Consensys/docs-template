module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'plugins/**/*.js',
    'scripts/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // Note: remark v15 uses ES modules which Jest doesn't handle well
  // The remark plugin tests are skipped - plugins are tested via integration tests
  // when running npm run port:test
};

