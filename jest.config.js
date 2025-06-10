export default {
  // Test environment
  testEnvironment: 'node',
  
  // Transform settings to handle CommonJS in ES module project
  transform: {},
  extensionsToTreatAsEsm: [],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/*.test.js'
  ],
  
  // Coverage settings
  collectCoverage: false,
  
  // Module path mapping for your drone-pipeline
  moduleNameMapping: {
    '^./drone-pipeline/(.*)$': '<rootDir>/drone-pipeline/$1'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true
};
