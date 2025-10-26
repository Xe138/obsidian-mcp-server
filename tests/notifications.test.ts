import { App, Notice } from 'obsidian';
import { NotificationManager } from '../src/ui/notifications';
import { MCPPluginSettings } from '../src/types/settings-types';

// Mock Notice constructor
jest.mock('obsidian', () => {
	const actualObsidian = jest.requireActual('obsidian');
	return {
		...actualObsidian,
		Notice: jest.fn()
	};
});

describe('NotificationManager', () => {
	let app: App;
	let settings: MCPPluginSettings;
	let manager: NotificationManager;

	beforeEach(() => {
		jest.clearAllMocks();
		app = {} as App;
		settings = {
			port: 3000,
			autoStart: false,
			apiKey: 'test-key',
			notificationsEnabled: true,
			showParameters: true,
			notificationDuration: 3000,
			logToConsole: false
		};
		manager = new NotificationManager(app, settings);
	});

	describe('showToolCall', () => {
		it('should format message with MCP Tool Called label and newline when parameters shown', () => {
			manager.showToolCall('read_note', { path: 'daily/2025-01-15.md' });

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('📖 MCP Tool Called: read_note\npath: "daily/2025-01-15.md"'),
				3000
			);
		});

		it('should format message without newline when parameters hidden', () => {
			settings.showParameters = false;
			manager = new NotificationManager(app, settings);

			manager.showToolCall('read_note', { path: 'daily/2025-01-15.md' });

			expect(Notice).toHaveBeenCalledWith(
				'📖 MCP Tool Called: read_note',
				3000
			);
		});

		it('should format multiple parameters correctly', () => {
			manager.showToolCall('search', {
				query: 'test query',
				folder: 'notes',
				recursive: true
			});

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('🔍 MCP Tool Called: search\nquery: "test query", folder: "notes", recursive: true'),
				3000
			);
		});

		it('should handle empty arguments object', () => {
			manager.showToolCall('get_vault_info', {});

			expect(Notice).toHaveBeenCalledWith(
				'ℹ️ MCP Tool Called: get_vault_info',
				3000
			);
		});

		it('should handle null arguments', () => {
			manager.showToolCall('get_vault_info', null);

			expect(Notice).toHaveBeenCalledWith(
				'ℹ️ MCP Tool Called: get_vault_info',
				3000
			);
		});

		it('should handle undefined arguments', () => {
			manager.showToolCall('get_vault_info', undefined);

			expect(Notice).toHaveBeenCalledWith(
				'ℹ️ MCP Tool Called: get_vault_info',
				3000
			);
		});

		it('should use fallback icon for unknown tool', () => {
			manager.showToolCall('unknown_tool', { path: 'test.md' });

			expect(Notice).toHaveBeenCalledWith(
				expect.stringContaining('🔧 MCP Tool Called: unknown_tool\npath: "test.md"'),
				3000
			);
		});

		it('should use JSON fallback for arguments with no known keys', () => {
			manager.showToolCall('custom_tool', {
				customKey: 'value',
				anotherKey: 123
			});

			expect(Notice).toHaveBeenCalledWith(
				'🔧 MCP Tool Called: custom_tool\n{"customKey":"value","anotherKey":123}',
				3000
			);
		});

		it('should truncate path when exceeds 30 characters', () => {
			const longPath = 'very/long/path/to/my/notes/folder/file.md';
			manager.showToolCall('read_note', { path: longPath });

			expect(Notice).toHaveBeenCalledWith(
				'📖 MCP Tool Called: read_note\npath: "very/long/path/to/my/notes/..."',
				3000
			);
		});

		it('should truncate JSON fallback when exceeds 50 characters', () => {
			const longJson = {
				veryLongKeyName: 'very long value that exceeds the character limit',
				anotherKey: 'more data'
			};
			manager.showToolCall('custom_tool', longJson);

			const call = (Notice as jest.Mock).mock.calls[0][0];
			const lines = call.split('\n');
			expect(lines[0]).toBe('🔧 MCP Tool Called: custom_tool');
			expect(lines[1].length).toBeLessThanOrEqual(50);
			expect(lines[1]).toMatch(/\.\.\.$/);
		});
	});
});
