# Tests

This directory contains unit and integration tests for the Obsidian MCP Server plugin.

## Current Status

The test files are currently documentation of expected behavior. To actually run these tests, you need to set up a testing framework.

## Setting Up Jest (Recommended)

1. Install Jest and related dependencies:
```bash
npm install --save-dev jest @types/jest ts-jest
```

2. Create a `jest.config.js` file in the project root:
```javascript
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
};
```

3. Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

4. Run tests:
```bash
npm test
```

## Test Files

### `path-utils.test.ts`

Tests for the `PathUtils` class, covering:
- Path normalization (cross-platform)
- Path validation
- File/folder resolution
- Path manipulation utilities

**Key Test Categories:**
- **normalizePath**: Tests for handling leading/trailing slashes, backslashes, drive letters
- **isValidVaultPath**: Tests for path validation rules
- **Cross-platform**: Tests for Windows, macOS, and Linux path handling

## Mocking Obsidian API

Since these tests run outside of Obsidian, you'll need to mock the Obsidian API:

```typescript
// Example mock setup
jest.mock('obsidian', () => ({
  App: jest.fn(),
  TFile: jest.fn(),
  TFolder: jest.fn(),
  TAbstractFile: jest.fn(),
  // ... other Obsidian types
}));
```

## Running Tests Without Jest

If you prefer not to set up Jest, you can:

1. Use the test files as documentation of expected behavior
2. Manually test the functionality through the MCP server
3. Use TypeScript's type checking to catch errors: `npm run build`

## Future Improvements

- [ ] Set up Jest testing framework
- [ ] Add integration tests with mock Obsidian vault
- [ ] Add tests for error-messages.ts
- [ ] Add tests for tool implementations
- [ ] Add tests for MCP server endpoints
- [ ] Set up CI/CD with automated testing
- [ ] Add code coverage reporting

## Test Coverage Goals

- **PathUtils**: 100% coverage (critical for cross-platform support)
- **ErrorMessages**: 100% coverage (important for user experience)
- **Tool implementations**: 80%+ coverage
- **Server/middleware**: 70%+ coverage

## Writing New Tests

When adding new features, please:

1. Write tests first (TDD approach recommended)
2. Test both success and error cases
3. Test edge cases and boundary conditions
4. Test cross-platform compatibility where relevant
5. Add descriptive test names that explain the expected behavior

Example test structure:
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    test('should handle error case', () => {
      expect(() => method(null)).toThrow();
    });
  });
});
```
