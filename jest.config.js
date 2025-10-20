module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts'
  },
  coverageThreshold: {
    global: {
      lines: 100,         // All testable lines must be covered (with istanbul ignore for intentional exclusions)
      statements: 99.7,   // Allow minor statement coverage gaps
      branches: 94,       // Branch coverage baseline
      functions: 99       // Function coverage baseline
    }
  }
};
