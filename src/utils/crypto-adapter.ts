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
		try {
			// Using require() is necessary for synchronous crypto access in Obsidian desktop plugins
			// ES6 dynamic imports would create race conditions as crypto must be available synchronously
			// eslint-disable-next-line @typescript-eslint/no-var-requires -- Synchronous Node.js crypto API access required
			const nodeCrypto = require('crypto') as typeof import('crypto');
			if (nodeCrypto?.webcrypto) {
				return nodeCrypto.webcrypto as unknown as Crypto;
			}
		} catch {
			// Crypto module not available or failed to load
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
