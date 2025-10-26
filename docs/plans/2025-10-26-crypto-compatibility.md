# Cross-Environment Crypto Compatibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix crypto API compatibility so tests pass in Node.js environment while maintaining production behavior in Electron.

**Architecture:** Create crypto-adapter utility that detects environment and provides unified access to Web Crypto API (window.crypto in browser, crypto.webcrypto in Node.js).

**Tech Stack:** TypeScript, Jest, Node.js crypto.webcrypto, Web Crypto API

---

## Task 1: Create crypto-adapter utility with tests (TDD)

**Files:**
- Create: `tests/crypto-adapter.test.ts`
- Create: `src/utils/crypto-adapter.ts`

**Step 1: Write the failing test**

Create `tests/crypto-adapter.test.ts`:

```typescript
import { getCryptoRandomValues } from '../src/utils/crypto-adapter';

describe('crypto-adapter', () => {
	describe('getCryptoRandomValues', () => {
		it('should fill Uint8Array with random values', () => {
			const array = new Uint8Array(32);
			const result = getCryptoRandomValues(array);

			expect(result).toBe(array);
			expect(result.length).toBe(32);
			// Verify not all zeros (extremely unlikely with true random)
			const hasNonZero = Array.from(result).some(val => val !== 0);
			expect(hasNonZero).toBe(true);
		});

		it('should produce different values on subsequent calls', () => {
			const array1 = new Uint8Array(32);
			const array2 = new Uint8Array(32);

			getCryptoRandomValues(array1);
			getCryptoRandomValues(array2);

			// Arrays should be different (extremely unlikely to be identical)
			const identical = Array.from(array1).every((val, idx) => val === array2[idx]);
			expect(identical).toBe(false);
		});

		it('should preserve array type', () => {
			const uint8 = new Uint8Array(16);
			const uint16 = new Uint16Array(8);
			const uint32 = new Uint32Array(4);

			const result8 = getCryptoRandomValues(uint8);
			const result16 = getCryptoRandomValues(uint16);
			const result32 = getCryptoRandomValues(uint32);

			expect(result8).toBeInstanceOf(Uint8Array);
			expect(result16).toBeInstanceOf(Uint16Array);
			expect(result32).toBeInstanceOf(Uint32Array);
		});

		it('should work with different array lengths', () => {
			const small = new Uint8Array(8);
			const medium = new Uint8Array(32);
			const large = new Uint8Array(128);

			getCryptoRandomValues(small);
			getCryptoRandomValues(medium);
			getCryptoRandomValues(large);

			expect(small.every(val => val >= 0 && val <= 255)).toBe(true);
			expect(medium.every(val => val >= 0 && val <= 255)).toBe(true);
			expect(large.every(val => val >= 0 && val <= 255)).toBe(true);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- crypto-adapter.test.ts`

Expected: FAIL with "Cannot find module '../src/utils/crypto-adapter'"

**Step 3: Write minimal implementation**

Create `src/utils/crypto-adapter.ts`:

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
 * @returns The same array filled with random values
 */
export function getCryptoRandomValues<T extends ArrayBufferView>(array: T): T {
	return getCrypto().getRandomValues(array);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- crypto-adapter.test.ts`

Expected: PASS (all 4 tests passing)

**Step 5: Commit**

```bash
git add tests/crypto-adapter.test.ts src/utils/crypto-adapter.ts
git commit -m "feat: add cross-environment crypto adapter

- Create getCryptoRandomValues() utility
- Support both window.crypto (browser/Electron) and crypto.webcrypto (Node.js)
- Add comprehensive test coverage for adapter functionality"
```

---

## Task 2: Update auth-utils to use crypto-adapter

**Files:**
- Modify: `src/utils/auth-utils.ts:1-23`
- Test: `tests/main-migration.test.ts` (existing tests should pass)

**Step 1: Verify existing tests fail with current implementation**

Run: `npm test -- main-migration.test.ts`

Expected: FAIL with "ReferenceError: crypto is not defined"

**Step 2: Update auth-utils.ts to use crypto-adapter**

Modify `src/utils/auth-utils.ts`:

```typescript
/**
 * Utility functions for authentication and API key management
 */

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

/**
 * Validates API key strength
 * @param apiKey The API key to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateApiKey(apiKey: string): { isValid: boolean; error?: string } {
	if (!apiKey || apiKey.trim() === '') {
		return { isValid: false, error: 'API key cannot be empty' };
	}

	if (apiKey.length < 16) {
		return { isValid: false, error: 'API key must be at least 16 characters long' };
	}

	return { isValid: true };
}
```

**Step 3: Run existing migration tests to verify they pass**

Run: `npm test -- main-migration.test.ts`

Expected: PASS (all tests in main-migration.test.ts passing)

**Step 4: Run all tests to ensure no regressions**

Run: `npm test`

Expected: PASS (all 709+ tests passing, no failures)

**Step 5: Commit**

```bash
git add src/utils/auth-utils.ts
git commit -m "fix: use crypto-adapter in generateApiKey

- Replace direct crypto.getRandomValues with getCryptoRandomValues
- Fixes Node.js test environment compatibility
- Maintains production behavior in Electron"
```

---

## Task 3: Verify fix and run full test suite

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass (should be 713 tests: 709 existing + 4 new crypto-adapter tests)

**Step 2: Verify test coverage meets thresholds**

Run: `npm run test:coverage`

Expected:
- Lines: ≥97%
- Statements: ≥97%
- Branches: ≥92%
- Functions: ≥96%

Coverage should include new crypto-adapter.ts file.

**Step 3: Run type checking**

Run: `npm run build`

Expected: No TypeScript errors, build completes successfully

**Step 4: Document verification in commit message if needed**

If all checks pass, the implementation is complete. No additional commit needed unless documentation updates are required.

---

## Completion Checklist

- [ ] crypto-adapter.ts created with full test coverage
- [ ] auth-utils.ts updated to use crypto-adapter
- [ ] All existing tests pass (main-migration.test.ts)
- [ ] New crypto-adapter tests pass (4 tests)
- [ ] Full test suite passes (713 tests)
- [ ] Coverage thresholds met
- [ ] TypeScript build succeeds
- [ ] Two commits created with descriptive messages

## Expected Outcome

After completing all tasks:
1. Tests run successfully in Node.js environment (no crypto errors)
2. Production code unchanged in behavior (still uses window.crypto in Electron)
3. Clean abstraction for future crypto operations
4. Full test coverage maintained
5. Ready for code review and PR creation

## Notes for Engineer

- **Environment detection:** The adapter checks `typeof window` first (browser/Electron), then `typeof global` (Node.js)
- **Web Crypto API standard:** Both environments use the same API (getRandomValues), just accessed differently
- **Node.js requirement:** Requires Node.js 15+ for crypto.webcrypto support
- **Type safety:** TypeScript generic `<T extends ArrayBufferView>` preserves array type through the call
- **No mocking needed:** Tests use real crypto functions in Node.js via crypto.webcrypto
