/**
 * Mock Electron API for testing
 * This provides minimal mocks for the Electron types used in tests
 */

export const safeStorage = {
	isEncryptionAvailable: jest.fn(() => true),
	encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
	decryptString: jest.fn((buffer: Buffer) => {
		const str = buffer.toString();
		return str.replace('encrypted:', '');
	})
};
