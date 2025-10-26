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

		it('should return false when safeStorage is null', () => {
			// This tests the case where Electron is not available
			// We need to reload the module with electron unavailable
			jest.resetModules();

			jest.mock('electron', () => ({
				safeStorage: null
			}));

			const { isEncryptionAvailable } = require('../src/utils/encryption-utils');
			expect(isEncryptionAvailable()).toBe(false);

			// Restore original mock
			jest.resetModules();
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
		});

		it('should return false when isEncryptionAvailable method is missing', () => {
			jest.resetModules();

			jest.mock('electron', () => ({
				safeStorage: {
					// Missing isEncryptionAvailable method
					encryptString: jest.fn(),
					decryptString: jest.fn()
				}
			}));

			const { isEncryptionAvailable } = require('../src/utils/encryption-utils');
			expect(isEncryptionAvailable()).toBe(false);

			// Restore
			jest.resetModules();
		});
	});

	describe('Platform Fallback Scenarios', () => {
		beforeEach(() => {
			jest.resetModules();
		});

		afterEach(() => {
			jest.resetModules();
		});

		it('should handle electron module not being available', () => {
			// Mock require to throw when loading electron
			jest.mock('electron', () => {
				throw new Error('Electron not available');
			});

			// This should use the console.warn fallback
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			// Load module with electron unavailable
			const { encryptApiKey, isEncryptionAvailable } = require('../src/utils/encryption-utils');

			expect(isEncryptionAvailable()).toBe(false);

			const apiKey = 'test-key';
			const result = encryptApiKey(apiKey);

			// Should return plaintext when electron is unavailable
			expect(result).toBe(apiKey);

			consoleSpy.mockRestore();
		});

		it('should handle decryption when safeStorage is null', () => {
			jest.mock('electron', () => ({
				safeStorage: null
			}));

			const { decryptApiKey } = require('../src/utils/encryption-utils');

			const encrypted = 'encrypted:aW52YWxpZA==';

			expect(() => decryptApiKey(encrypted)).toThrow('Failed to decrypt API key');
		});

		it('should log warning when encryption not available on first load', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			jest.mock('electron', () => {
				throw new Error('Module not found');
			});

			// Require the module to trigger the warning
			require('../src/utils/encryption-utils');

			// Warning should be logged during module initialization
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Electron safeStorage not available')
			);

			consoleSpy.mockRestore();
		});

		it('should gracefully handle plaintext keys when encryption unavailable', () => {
			jest.mock('electron', () => ({
				safeStorage: null
			}));

			const { encryptApiKey, decryptApiKey } = require('../src/utils/encryption-utils');

			const apiKey = 'plain-api-key';

			// Encrypt should return plaintext
			const encrypted = encryptApiKey(apiKey);
			expect(encrypted).toBe(apiKey);

			// Decrypt plaintext should return as-is
			const decrypted = decryptApiKey(apiKey);
			expect(decrypted).toBe(apiKey);
		});

		it('should warn when falling back to plaintext storage', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			jest.mock('electron', () => ({
				safeStorage: {
					isEncryptionAvailable: jest.fn(() => false)
				}
			}));

			const { encryptApiKey } = require('../src/utils/encryption-utils');

			encryptApiKey('test-key');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Encryption not available')
			);

			consoleSpy.mockRestore();
		});
	});
});
