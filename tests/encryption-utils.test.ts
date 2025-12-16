// Mock safeStorage implementation
const mockSafeStorage = {
	isEncryptionAvailable: jest.fn(() => true),
	encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
	decryptString: jest.fn((buffer: Buffer) => buffer.toString().replace('encrypted:', ''))
};

// Setup window.require mock before importing the module
const mockWindowRequire = jest.fn((module: string) => {
	if (module === 'electron') {
		return { safeStorage: mockSafeStorage };
	}
	throw new Error(`Module not found: ${module}`);
});

// Create mock window object for Node environment
const mockWindow: Window & { require?: unknown } = {
	require: mockWindowRequire
} as unknown as Window & { require?: unknown };

// Store original global window
const originalWindow = (globalThis as unknown as { window?: unknown }).window;

// Set up window.require before tests run
beforeAll(() => {
	(globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;
});

// Clean up after all tests
afterAll(() => {
	if (originalWindow === undefined) {
		delete (globalThis as unknown as { window?: unknown }).window;
	} else {
		(globalThis as unknown as { window: typeof originalWindow }).window = originalWindow;
	}
});

// Import after mock is set up - use require to ensure module loads after mock
let encryptApiKey: typeof import('../src/utils/encryption-utils').encryptApiKey;
let decryptApiKey: typeof import('../src/utils/encryption-utils').decryptApiKey;
let isEncryptionAvailable: typeof import('../src/utils/encryption-utils').isEncryptionAvailable;

beforeAll(() => {
	// Reset modules to ensure fresh load with mock
	jest.resetModules();
	const encryptionUtils = require('../src/utils/encryption-utils');
	encryptApiKey = encryptionUtils.encryptApiKey;
	decryptApiKey = encryptionUtils.decryptApiKey;
	isEncryptionAvailable = encryptionUtils.isEncryptionAvailable;
});

describe('Encryption Utils', () => {
	beforeEach(() => {
		// Reset mock implementations before each test
		mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
		mockSafeStorage.encryptString.mockImplementation((data: string) => Buffer.from(`encrypted:${data}`));
		mockSafeStorage.decryptString.mockImplementation((buffer: Buffer) => buffer.toString().replace('encrypted:', ''));
		mockWindowRequire.mockClear();
	});

	describe('encryptApiKey', () => {
		it('should encrypt API key when encryption is available', () => {
			const apiKey = 'test-api-key-12345';
			const encrypted = encryptApiKey(apiKey);

			expect(encrypted).toMatch(/^encrypted:/);
			expect(encrypted).not.toContain('test-api-key-12345');
		});

		it('should return plaintext when encryption is not available', () => {
			// Need to reload module with different mock behavior
			jest.resetModules();
			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => false),
				encryptString: jest.fn(),
				decryptString: jest.fn()
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { encryptApiKey: encrypt } = require('../src/utils/encryption-utils');
			const apiKey = 'test-api-key-12345';
			const result = encrypt(apiKey);

			expect(result).toBe(apiKey);

			// Restore original mock
			mockWindow.require = mockWindowRequire;
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
			// Reload module with error-throwing mock
			jest.resetModules();
			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => true),
				encryptString: jest.fn(() => {
					throw new Error('Encryption failed');
				}),
				decryptString: jest.fn()
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { encryptApiKey: encrypt } = require('../src/utils/encryption-utils');
			const apiKey = 'test-api-key-12345';
			const result = encrypt(apiKey);

			expect(result).toBe(apiKey); // Should return plaintext on error

			// Restore original mock
			mockWindow.require = mockWindowRequire;
		});

		it('should throw error when decryption fails', () => {
			// Reload module with error-throwing mock
			jest.resetModules();
			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => true),
				encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
				decryptString: jest.fn(() => {
					throw new Error('Decryption failed');
				})
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { decryptApiKey: decrypt } = require('../src/utils/encryption-utils');
			const encrypted = 'encrypted:aW52YWxpZA=='; // Invalid encrypted data

			expect(() => decrypt(encrypted)).toThrow('Failed to decrypt API key');

			// Restore original mock
			mockWindow.require = mockWindowRequire;
		});
	});

	describe('isEncryptionAvailable', () => {
		it('should return true when encryption is available', () => {
			jest.resetModules();
			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => true),
				encryptString: jest.fn(),
				decryptString: jest.fn()
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { isEncryptionAvailable: checkAvail } = require('../src/utils/encryption-utils');
			expect(checkAvail()).toBe(true);

			// Restore
			mockWindow.require = mockWindowRequire;
		});

		it('should return false when encryption is not available', () => {
			jest.resetModules();
			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => false),
				encryptString: jest.fn(),
				decryptString: jest.fn()
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { isEncryptionAvailable: checkAvail } = require('../src/utils/encryption-utils');
			expect(checkAvail()).toBe(false);

			// Restore
			mockWindow.require = mockWindowRequire;
		});

		it('should return false when safeStorage is null', () => {
			jest.resetModules();
			mockWindow.require = jest.fn(() => ({ safeStorage: null }));

			const { isEncryptionAvailable: checkAvail } = require('../src/utils/encryption-utils');
			expect(checkAvail()).toBe(false);

			// Restore original mock
			mockWindow.require = mockWindowRequire;
		});

		it('should return false when isEncryptionAvailable method is missing', () => {
			jest.resetModules();
			const mockStorage = {
				// Missing isEncryptionAvailable method
				encryptString: jest.fn(),
				decryptString: jest.fn()
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { isEncryptionAvailable: checkAvail } = require('../src/utils/encryption-utils');
			expect(checkAvail()).toBe(false);

			// Restore
			mockWindow.require = mockWindowRequire;
		});
	});

	describe('Platform Fallback Scenarios', () => {
		beforeEach(() => {
			jest.resetModules();
		});

		afterEach(() => {
			// Restore mock after each test
			mockWindow.require = mockWindowRequire;
		});

		it('should handle electron module not being available', () => {
			// Mock require to throw when loading electron
			mockWindow.require = jest.fn(() => {
				throw new Error('Electron not available');
			});

			// This should use the console.warn fallback
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			// Load module with electron unavailable
			const { encryptApiKey: encrypt, isEncryptionAvailable: checkAvail } = require('../src/utils/encryption-utils');

			expect(checkAvail()).toBe(false);

			const apiKey = 'test-key';
			const result = encrypt(apiKey);

			// Should return plaintext when electron is unavailable
			expect(result).toBe(apiKey);

			consoleSpy.mockRestore();
		});

		it('should handle decryption when safeStorage is null', () => {
			mockWindow.require = jest.fn(() => ({ safeStorage: null }));

			const { decryptApiKey: decrypt } = require('../src/utils/encryption-utils');

			const encrypted = 'encrypted:aW52YWxpZA==';

			expect(() => decrypt(encrypted)).toThrow('Failed to decrypt API key');
		});

		it('should log warning when encryption not available on first load', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			mockWindow.require = jest.fn(() => {
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
			mockWindow.require = jest.fn(() => ({ safeStorage: null }));

			const { encryptApiKey: encrypt, decryptApiKey: decrypt } = require('../src/utils/encryption-utils');

			const apiKey = 'plain-api-key';

			// Encrypt should return plaintext
			const encrypted = encrypt(apiKey);
			expect(encrypted).toBe(apiKey);

			// Decrypt plaintext should return as-is
			const decrypted = decrypt(apiKey);
			expect(decrypted).toBe(apiKey);
		});

		it('should warn when falling back to plaintext storage', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const mockStorage = {
				isEncryptionAvailable: jest.fn(() => false)
			};
			mockWindow.require = jest.fn(() => ({ safeStorage: mockStorage }));

			const { encryptApiKey: encrypt } = require('../src/utils/encryption-utils');

			encrypt('test-key');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Encryption not available')
			);

			consoleSpy.mockRestore();
		});
	});
});
