import { encryptApiKey, decryptApiKey, isEncryptionAvailable } from '../src/utils/encryption-utils';

// Mock electron module
jest.mock('electron', () => ({
	safeStorage: {
		isEncryptionAvailable: jest.fn(() => true),
		encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
		decryptString: jest.fn((buffer: Buffer) => {
			const str = buffer.toString();
			return str.replace('encrypted:', '');
		})
	}
}));

describe('Encryption Utils', () => {
	describe('encryptApiKey', () => {
		it('should encrypt API key when encryption is available', () => {
			const apiKey = 'test-api-key-12345';
			const encrypted = encryptApiKey(apiKey);

			expect(encrypted).toMatch(/^encrypted:/);
			expect(encrypted).not.toContain('test-api-key-12345');
		});

		it('should return plaintext when encryption is not available', () => {
			const { safeStorage } = require('electron');
			safeStorage.isEncryptionAvailable.mockReturnValueOnce(false);

			const apiKey = 'test-api-key-12345';
			const result = encryptApiKey(apiKey);

			expect(result).toBe(apiKey);
		});

		it('should handle empty string', () => {
			const result = encryptApiKey('');
			expect(result).toBe('');
		});
	});

	describe('decryptApiKey', () => {
		it('should decrypt encrypted API key', () => {
			const apiKey = 'test-api-key-12345';
			const encrypted = encryptApiKey(apiKey);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(apiKey);
		});

		it('should return plaintext if not encrypted format', () => {
			const plaintext = 'plain-api-key';
			const result = decryptApiKey(plaintext);

			expect(result).toBe(plaintext);
		});

		it('should handle empty string', () => {
			const result = decryptApiKey('');
			expect(result).toBe('');
		});
	});

	describe('round-trip encryption', () => {
		it('should successfully encrypt and decrypt', () => {
			const original = 'my-secret-api-key-abc123';
			const encrypted = encryptApiKey(original);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(original);
			expect(encrypted).not.toBe(original);
		});
	});

	describe('error handling', () => {
		it('should handle encryption errors and fallback to plaintext', () => {
			const { safeStorage } = require('electron');
			const originalEncrypt = safeStorage.encryptString;
			safeStorage.encryptString = jest.fn(() => {
				throw new Error('Encryption failed');
			});

			const apiKey = 'test-api-key-12345';
			const result = encryptApiKey(apiKey);

			expect(result).toBe(apiKey); // Should return plaintext on error
			safeStorage.encryptString = originalEncrypt; // Restore
		});

		it('should throw error when decryption fails', () => {
			const { safeStorage } = require('electron');
			const originalDecrypt = safeStorage.decryptString;
			safeStorage.decryptString = jest.fn(() => {
				throw new Error('Decryption failed');
			});

			const encrypted = 'encrypted:aW52YWxpZA=='; // Invalid encrypted data

			expect(() => decryptApiKey(encrypted)).toThrow('Failed to decrypt API key');
			safeStorage.decryptString = originalDecrypt; // Restore
		});
	});

	describe('isEncryptionAvailable', () => {
		it('should return true when encryption is available', () => {
			const { isEncryptionAvailable } = require('../src/utils/encryption-utils');
			const { safeStorage } = require('electron');

			safeStorage.isEncryptionAvailable.mockReturnValueOnce(true);
			expect(isEncryptionAvailable()).toBe(true);
		});

		it('should return false when encryption is not available', () => {
			const { isEncryptionAvailable } = require('../src/utils/encryption-utils');
			const { safeStorage } = require('electron');

			safeStorage.isEncryptionAvailable.mockReturnValueOnce(false);
			expect(isEncryptionAvailable()).toBe(false);
		});
	});
});
