// Define Electron SafeStorage interface
interface ElectronSafeStorage {
	isEncryptionAvailable(): boolean;
	encryptString(plainText: string): Buffer;
	decryptString(encrypted: Buffer): string;
}

// Safely import safeStorage - may not be available in all environments
let safeStorage: ElectronSafeStorage | null = null;
try {
	// Using require() is necessary for synchronous access to Electron's safeStorage API in Obsidian desktop plugins
	// ES6 dynamic imports would create race conditions as this module must be available synchronously
	// eslint-disable-next-line @typescript-eslint/no-var-requires -- Synchronous Electron API access required for Obsidian plugin
	const electron = require('electron') as typeof import('electron');
	safeStorage = electron.safeStorage || null;
} catch (error) {
	console.warn('Electron safeStorage not available, API keys will be stored in plaintext');
}

/**
 * Checks if encryption is available on the current platform
 * @returns true if safeStorage encryption is available
 */
export function isEncryptionAvailable(): boolean {
	return safeStorage !== null &&
	       typeof safeStorage.isEncryptionAvailable === 'function' &&
	       safeStorage.isEncryptionAvailable();
}

/**
 * Encrypts an API key using Electron's safeStorage API
 * Falls back to plaintext if encryption is not available (e.g., Linux without keyring)
 * @param apiKey The plaintext API key to encrypt
 * @returns Encrypted API key with "encrypted:" prefix, or plaintext if encryption unavailable
 */
export function encryptApiKey(apiKey: string): string {
	if (!apiKey) {
		return '';
	}

	// Check if safeStorage is available and encryption is enabled
	if (!isEncryptionAvailable()) {
		console.warn('Encryption not available, storing API key in plaintext');
		return apiKey;
	}

	try {
		const encrypted = safeStorage!.encryptString(apiKey);
		return `encrypted:${encrypted.toString('base64')}`;
	} catch (error) {
		console.error('Failed to encrypt API key, falling back to plaintext:', error);
		return apiKey;
	}
}

/**
 * Decrypts an API key encrypted with encryptApiKey
 * @param stored The stored API key (encrypted or plaintext)
 * @returns Decrypted API key
 */
export function decryptApiKey(stored: string): string {
	if (!stored) {
		return '';
	}

	// Check if this is an encrypted key
	if (!stored.startsWith('encrypted:')) {
		// Legacy plaintext key or fallback
		return stored;
	}

	// If safeStorage is not available, we can't decrypt
	if (!safeStorage) {
		console.error('Cannot decrypt API key: safeStorage not available');
		throw new Error('Failed to decrypt API key. You may need to regenerate it.');
	}

	try {
		const encryptedData = stored.substring(10); // Remove "encrypted:" prefix
		const buffer = Buffer.from(encryptedData, 'base64');
		return safeStorage.decryptString(buffer);
	} catch (error) {
		console.error('Failed to decrypt API key:', error);
		throw new Error('Failed to decrypt API key. You may need to regenerate it.');
	}
}
