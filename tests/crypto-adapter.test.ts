import { getCryptoRandomValues } from '../src/utils/crypto-adapter';

describe('crypto-adapter', () => {
	describe('getCryptoRandomValues', () => {
		it('should use window.crypto in browser environment', () => {
			// Save reference to global
			const globalRef = global as any;
			const originalWindow = globalRef.window;

			try {
				// Mock browser environment with window.crypto
				const mockGetRandomValues = jest.fn((array: any) => {
					// Fill with mock random values
					for (let i = 0; i < array.length; i++) {
						array[i] = Math.floor(Math.random() * 256);
					}
					return array;
				});

				globalRef.window = {
					crypto: {
						getRandomValues: mockGetRandomValues
					}
				};

				// Clear module cache to force re-evaluation
				jest.resetModules();

				// Re-import the function
				const { getCryptoRandomValues: reloadedGetCryptoRandomValues } = require('../src/utils/crypto-adapter');

				// Should use window.crypto
				const array = new Uint8Array(32);
				const result = reloadedGetCryptoRandomValues(array);

				expect(result).toBe(array);
				expect(mockGetRandomValues).toHaveBeenCalledWith(array);
			} finally {
				// Restore original window
				globalRef.window = originalWindow;

				// Clear module cache again to restore normal state
				jest.resetModules();
			}
		});

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

		it('should use Node.js crypto.webcrypto when window.crypto is not available', () => {
			// Save references to global object and original values
			const globalRef = global as any;
			const originalWindow = globalRef.window;
			const originalCrypto = originalWindow?.crypto;

			try {
				// Mock window without crypto to force Node.js crypto path
				globalRef.window = { ...originalWindow };
				delete globalRef.window.crypto;

				// Clear module cache to force re-evaluation
				jest.resetModules();

				// Re-import the function
				const { getCryptoRandomValues: reloadedGetCryptoRandomValues } = require('../src/utils/crypto-adapter');

				// Should work using Node.js crypto.webcrypto
				const array = new Uint8Array(32);
				const result = reloadedGetCryptoRandomValues(array);

				expect(result).toBe(array);
				expect(result.length).toBe(32);
				// Verify not all zeros
				const hasNonZero = Array.from(result).some(val => val !== 0);
				expect(hasNonZero).toBe(true);
			} finally {
				// Restore original values
				globalRef.window = originalWindow;
				if (originalWindow && originalCrypto) {
					originalWindow.crypto = originalCrypto;
				}

				// Clear module cache again to restore normal state
				jest.resetModules();
			}
		});

		it('should throw error when no crypto API is available', () => {
			// Save references to global object and original values
			const globalRef = global as any;
			const originalWindow = globalRef.window;
			const originalGlobal = globalRef.global;
			const originalGlobalThisCrypto = globalThis.crypto;

			try {
				// Remove window.crypto, global access, and globalThis.crypto
				delete globalRef.window;
				delete globalRef.global;
				// In modern Node.js, globalThis.crypto is always available, so we must mock it too
				Object.defineProperty(globalThis, 'crypto', {
					value: undefined,
					writable: true,
					configurable: true
				});

				// Clear module cache to force re-evaluation
				jest.resetModules();

				// Re-import the function
				const { getCryptoRandomValues: reloadedGetCryptoRandomValues } = require('../src/utils/crypto-adapter');

				// Verify error is thrown
				const array = new Uint8Array(32);
				expect(() => reloadedGetCryptoRandomValues(array)).toThrow('No Web Crypto API available in this environment');
			} finally {
				// Restore original values
				globalRef.window = originalWindow;
				globalRef.global = originalGlobal;
				// Restore globalThis.crypto
				Object.defineProperty(globalThis, 'crypto', {
					value: originalGlobalThisCrypto,
					writable: true,
					configurable: true
				});

				// Clear module cache again to restore normal state
				jest.resetModules();
			}
		});
	});
});
