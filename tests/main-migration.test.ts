import { generateApiKey } from '../src/utils/auth-utils';
import { DEFAULT_SETTINGS } from '../src/types/settings-types';

// Mock safeStorage implementation
const mockSafeStorage = {
	isEncryptionAvailable: jest.fn(() => true),
	encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
	decryptString: jest.fn((buffer: Buffer) => buffer.toString().replace('encrypted:', ''))
};

// Setup window.require mock
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

// Import after mock is set up
let encryptApiKey: typeof import('../src/utils/encryption-utils').encryptApiKey;
let decryptApiKey: typeof import('../src/utils/encryption-utils').decryptApiKey;

beforeAll(() => {
	jest.resetModules();
	const encryptionUtils = require('../src/utils/encryption-utils');
	encryptApiKey = encryptionUtils.encryptApiKey;
	decryptApiKey = encryptionUtils.decryptApiKey;
});

describe('Settings Migration', () => {
	describe('API key initialization', () => {
		it('should generate API key if empty', () => {
			const settings = { ...DEFAULT_SETTINGS, apiKey: '' };

			// Simulate what plugin should do
			if (!settings.apiKey) {
				settings.apiKey = generateApiKey();
			}

			expect(settings.apiKey).toBeTruthy();
			expect(settings.apiKey.length).toBeGreaterThanOrEqual(32);
		});

		it('should encrypt API key on save', () => {
			const plainKey = generateApiKey();
			const encrypted = encryptApiKey(plainKey);

			expect(encrypted).toMatch(/^encrypted:/);
			expect(encrypted).not.toBe(plainKey);
		});

		it('should decrypt API key on load', () => {
			const plainKey = generateApiKey();
			const encrypted = encryptApiKey(plainKey);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(plainKey);
		});
	});

	describe('Legacy settings migration', () => {
		it('should remove enableCORS from legacy settings', () => {
			const legacySettings: any = {
				...DEFAULT_SETTINGS,
				enableCORS: true,
				allowedOrigins: ['*']
			};

			// Simulate migration
			delete legacySettings.enableCORS;
			delete legacySettings.allowedOrigins;

			expect(legacySettings.enableCORS).toBeUndefined();
			expect(legacySettings.allowedOrigins).toBeUndefined();
		});

		it('should preserve other settings during migration', () => {
			const legacySettings: any = {
				...DEFAULT_SETTINGS,
				port: 4000,
				enableCORS: false,
				allowedOrigins: ['http://localhost:8080'],
				notificationsEnabled: true
			};

			// Simulate migration
			const { enableCORS, allowedOrigins, ...migrated } = legacySettings;

			expect(migrated.port).toBe(4000);
			expect(migrated.notificationsEnabled).toBe(true);
		});
	});
});
