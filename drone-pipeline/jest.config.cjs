// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  collectCoverage: false,
  verbose: true,
  testTimeout: 20000, // 20 seconds
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};