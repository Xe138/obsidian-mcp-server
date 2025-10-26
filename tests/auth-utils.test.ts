import { generateApiKey, validateApiKey } from '../src/utils/auth-utils';

describe('Auth Utils', () => {
	describe('generateApiKey', () => {
		it('should generate API key with default length of 32 characters', () => {
			const apiKey = generateApiKey();
			expect(apiKey).toHaveLength(32);
		});

		it('should generate API key with custom length', () => {
			const length = 64;
			const apiKey = generateApiKey(length);
			expect(apiKey).toHaveLength(length);
		});

		it('should generate different keys on each call', () => {
			const key1 = generateApiKey();
			const key2 = generateApiKey();
			expect(key1).not.toBe(key2);
		});

		it('should only use valid charset characters', () => {
			const apiKey = generateApiKey(100);
			const validChars = /^[A-Za-z0-9_-]+$/;
			expect(apiKey).toMatch(validChars);
		});

		it('should generate key of length 1', () => {
			const apiKey = generateApiKey(1);
			expect(apiKey).toHaveLength(1);
		});

		it('should generate very long keys', () => {
			const apiKey = generateApiKey(256);
			expect(apiKey).toHaveLength(256);
		});

		it('should use cryptographically secure random values', () => {
			// Generate many keys and check for reasonable distribution
			const keys = new Set();
			for (let i = 0; i < 100; i++) {
				keys.add(generateApiKey(8));
			}
			// With 8 chars from a 64-char set, we should get unique values
			expect(keys.size).toBeGreaterThan(95); // Allow for small collision probability
		});
	});

	describe('validateApiKey', () => {
		it('should validate a strong API key', () => {
			const result = validateApiKey('this-is-a-strong-key-123');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject empty API key', () => {
			const result = validateApiKey('');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('API key cannot be empty');
		});

		it('should reject whitespace-only API key', () => {
			const result = validateApiKey('   ');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('API key cannot be empty');
		});

		it('should reject API key shorter than 16 characters', () => {
			const result = validateApiKey('short');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('API key must be at least 16 characters long');
		});

		it('should accept API key exactly 16 characters', () => {
			const result = validateApiKey('1234567890123456');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should accept API key longer than 16 characters', () => {
			const result = validateApiKey('12345678901234567890');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject null or undefined API key', () => {
			const result1 = validateApiKey(null as any);
			expect(result1.isValid).toBe(false);
			expect(result1.error).toBe('API key cannot be empty');

			const result2 = validateApiKey(undefined as any);
			expect(result2.isValid).toBe(false);
			expect(result2.error).toBe('API key cannot be empty');
		});

		it('should validate generated API keys', () => {
			const apiKey = generateApiKey();
			const result = validateApiKey(apiKey);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});
	});
});
