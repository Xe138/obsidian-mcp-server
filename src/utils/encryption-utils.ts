import { safeStorage } from 'electron';

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

	// Check if encryption is available
	if (!safeStorage.isEncryptionAvailable()) {
		console.warn('Encryption not available, storing API key in plaintext');
		return apiKey;
	}

	try {
		const encrypted = safeStorage.encryptString(apiKey);
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

	try {
		const encryptedData = stored.substring(10); // Remove "encrypted:" prefix
		const buffer = Buffer.from(encryptedData, 'base64');
		return safeStorage.decryptString(buffer);
	} catch (error) {
		console.error('Failed to decrypt API key:', error);
		throw new Error('Failed to decrypt API key. You may need to regenerate it.');
	}
}

/**
 * Checks if encryption is available on the current platform
 * @returns true if safeStorage encryption is available
 */
export function isEncryptionAvailable(): boolean {
	return safeStorage.isEncryptionAvailable();
}
