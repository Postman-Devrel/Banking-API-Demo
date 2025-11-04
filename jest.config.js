module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@paralleldrive/cuid2$': '<rootDir>/tests/__mocks__/@paralleldrive/cuid2.js'
  }
};

