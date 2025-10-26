import { generateApiKey } from '../src/utils/auth-utils';
import { encryptApiKey, decryptApiKey } from '../src/utils/encryption-utils';
import { DEFAULT_SETTINGS } from '../src/types/settings-types';

// Mock electron
jest.mock('electron', () => ({
	safeStorage: {
		isEncryptionAvailable: jest.fn(() => true),
		encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
		decryptString: jest.fn((buffer: Buffer) => {
			const str = buffer.toString();
			return str.replace('encrypted:', '');
		})
	}
}));

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
