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
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 }
  },
  moduleNameMapper: {
    '^@paralleldrive/cuid2$': '<rootDir>/tests/__mocks__/@paralleldrive/cuid2.js'
  }
};
