# Cross-Environment Crypto Compatibility Design

**Date:** 2025-10-26
**Status:** Approved
**Author:** Design session with user

## Problem Statement

The `generateApiKey()` function in `src/utils/auth-utils.ts` uses `crypto.getRandomValues()` which works in Electron/browser environments but fails in Node.js test environment with "ReferenceError: crypto is not defined". This causes test failures during CI/CD builds.

## Goals

1. Make code work cleanly in both browser/Electron and Node.js environments
2. Use only built-in APIs (no additional npm dependencies)
3. Maintain cryptographic security guarantees
4. Keep production runtime behavior unchanged
5. Enable tests to pass without mocking

## Constraints

- Must use only built-in APIs (no third-party packages)
- Must maintain existing API surface of `generateApiKey()`
- Must preserve cryptographic security in both environments
- Must work with current Node.js version in project

## Architecture

### Component Overview

The solution uses an abstraction layer pattern with environment detection:

1. **crypto-adapter.ts** - New utility that provides unified crypto access
2. **auth-utils.ts** - Modified to use the adapter
3. **crypto-adapter.test.ts** - New test file for adapter verification

### Design Decisions

**Why abstraction layer over other approaches:**
- **vs Runtime detection in auth-utils:** Separates concerns, makes crypto access reusable
- **vs Jest polyfill:** Makes production code environment-aware instead of test-specific workarounds
- **vs Dynamic require():** Cleaner than inline environment detection, easier to test

**Why Web Crypto API standard:**
- Node.js 15+ includes `crypto.webcrypto` implementing the same Web Crypto API as browsers
- Allows using identical API (`getRandomValues()`) in both environments
- Standards-based approach, future-proof

## Implementation

### File: `src/utils/crypto-adapter.ts` (new)

```typescript
/**
 * Cross-environment crypto adapter
 * Provides unified access to cryptographically secure random number generation
 * Works in both browser/Electron (window.crypto) and Node.js (crypto.webcrypto)
 */

/**
 * Gets the appropriate Crypto interface for the current environment
 * @returns Crypto interface with getRandomValues method
 * @throws Error if no crypto API is available
 */
function getCrypto(): Crypto {
	// Browser/Electron environment
	if (typeof window !== 'undefined' && window.crypto) {
		return window.crypto;
	}

	// Node.js environment (15+) - uses Web Crypto API standard
	if (typeof global !== 'undefined') {
		const nodeCrypto = require('crypto');
		if (nodeCrypto.webcrypto) {
			return nodeCrypto.webcrypto;
		}
	}

	throw new Error('No Web Crypto API available in this environment');
}

/**
 * Fills a typed array with cryptographically secure random values
 * @param array TypedArray to fill with random values
 */
export function getCryptoRandomValues<T extends ArrayBufferView>(array: T): T {
	return getCrypto().getRandomValues(array);
}
```

### File: `src/utils/auth-utils.ts` (modified)

```typescript
import { getCryptoRandomValues } from './crypto-adapter';

/**
 * Generates a cryptographically secure random API key
 * @param length Length of the API key (default: 32 characters)
 * @returns A random API key string
 */
export function generateApiKey(length: number = 32): string {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	const values = new Uint8Array(length);

	// Use cross-environment crypto adapter
	getCryptoRandomValues(values);

	let result = '';
	for (let i = 0; i < length; i++) {
		result += charset[values[i] % charset.length];
	}

	return result;
}

// validateApiKey() remains unchanged
```

### File: `tests/crypto-adapter.test.ts` (new)

Test coverage for the adapter:
- Verify `getCryptoRandomValues()` returns filled array with correct length
- Verify randomness (different calls produce different results)
- Verify it works in Node.js test environment
- Verify type preservation (Uint8Array in = Uint8Array out)

## Error Handling

### Scenarios Covered

1. **Missing crypto API** - Throws descriptive error if neither environment has crypto
2. **Node.js version incompatibility** - Error message guides developers to upgrade
3. **Type safety** - TypeScript ensures correct typed array usage

### Error Messages

- "No Web Crypto API available in this environment" - Clear indication of what's missing

## Testing Strategy

### Existing Tests
- `tests/main-migration.test.ts` - Will now pass without modification
- Uses real Node.js `crypto.webcrypto` instead of mocks
- No change to test assertions needed

### New Tests
- `tests/crypto-adapter.test.ts` - Verifies adapter functionality
- Tests environment detection logic
- Tests randomness properties
- Tests type preservation

### Coverage Impact
- New file adds to overall coverage
- No reduction in existing coverage
- All code paths in adapter are testable

## Production Behavior

### Obsidian/Electron Environment
- Always uses `window.crypto` (first check in getCrypto)
- Zero change to existing runtime behavior
- Same cryptographic guarantees as before

### Node.js Test Environment
- Uses `crypto.webcrypto` (Node.js 15+)
- Provides identical Web Crypto API
- Real cryptographic functions (not mocked)

## Migration Path

### Changes Required
1. Create `src/utils/crypto-adapter.ts`
2. Modify `src/utils/auth-utils.ts` to import and use adapter
3. Create `tests/crypto-adapter.test.ts`
4. Run tests to verify fix

### Backward Compatibility
- No breaking changes to public API
- `generateApiKey()` signature unchanged
- No settings or configuration changes needed

### Rollback Plan
- Single commit contains all changes
- Can revert commit if issues found
- Original implementation preserved in git history

## Benefits

1. **Clean separation of concerns** - Crypto access logic isolated
2. **Standards-based** - Uses Web Crypto API in both environments
3. **Reusable** - Other code can use crypto-adapter for crypto needs
4. **Type-safe** - TypeScript ensures correct usage
5. **Testable** - Each component can be tested independently
6. **No mocking needed** - Tests use real crypto functions

## Future Considerations

- If other utilities need crypto, they can import crypto-adapter
- Could extend adapter with other crypto operations (hashing, etc.)
- Could add feature detection for specific crypto capabilities
