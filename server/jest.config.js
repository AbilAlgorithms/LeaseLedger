export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/models/**/*.js',
    'src/utils/**/*.js'
  ],
  coverageReporters: ['text', 'lcov', 'clover']
};
