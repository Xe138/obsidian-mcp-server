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
