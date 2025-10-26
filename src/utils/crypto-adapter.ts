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
