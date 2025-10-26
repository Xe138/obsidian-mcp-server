import { DEFAULT_SETTINGS, MCPPluginSettings } from '../src/types/settings-types';

describe('Settings Types', () => {
	describe('DEFAULT_SETTINGS', () => {
		it('should have authentication enabled by default', () => {
			expect(DEFAULT_SETTINGS.enableAuth).toBe(true);
		});

		it('should not have enableCORS field', () => {
			expect((DEFAULT_SETTINGS as any).enableCORS).toBeUndefined();
		});

		it('should not have allowedOrigins field', () => {
			expect((DEFAULT_SETTINGS as any).allowedOrigins).toBeUndefined();
		});

		it('should have empty apiKey by default', () => {
			expect(DEFAULT_SETTINGS.apiKey).toBe('');
		});

		it('should have autoStart disabled by default', () => {
			expect(DEFAULT_SETTINGS.autoStart).toBe(false);
		});

		it('should have valid port number', () => {
			expect(DEFAULT_SETTINGS.port).toBe(3000);
			expect(DEFAULT_SETTINGS.port).toBeGreaterThan(0);
			expect(DEFAULT_SETTINGS.port).toBeLessThan(65536);
		});
	});

	describe('MCPPluginSettings interface', () => {
		it('should require apiKey field', () => {
			const settings: MCPPluginSettings = {
				...DEFAULT_SETTINGS,
				apiKey: 'test-key'
			};
			expect(settings.apiKey).toBe('test-key');
		});

		it('should not allow enableCORS field', () => {
			// This is a compile-time check, but we verify runtime
			const settings: MCPPluginSettings = DEFAULT_SETTINGS;
			expect((settings as any).enableCORS).toBeUndefined();
		});
	});
});
