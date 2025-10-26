import { getCryptoRandomValues } from '../src/utils/crypto-adapter';

describe('crypto-adapter', () => {
	describe('getCryptoRandomValues', () => {
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
	});
});
