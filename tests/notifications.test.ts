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

		it('should not show notification when notifications disabled', () => {
			settings.notificationsEnabled = false;
			manager = new NotificationManager(app, settings);

			manager.showToolCall('read_note', { path: 'test.md' });

			expect(Notice).not.toHaveBeenCalled();
		});

		it('should use custom duration when provided', () => {
			manager.showToolCall('read_note', { path: 'test.md' }, 1000);

			expect(Notice).toHaveBeenCalledWith(
				expect.any(String),
				1000
			);
		});

		it('should log to console when enabled', () => {
			settings.logToConsole = true;
			manager = new NotificationManager(app, settings);

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			manager.showToolCall('read_note', { path: 'test.md' });

			expect(consoleSpy).toHaveBeenCalledWith(
				'[MCP] Tool call: read_note',
				{ path: 'test.md' }
			);

			consoleSpy.mockRestore();
		});

		it('should not log to console when disabled', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			manager.showToolCall('read_note', { path: 'test.md' });

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('updateSettings', () => {
		it('should update settings', () => {
			const newSettings: MCPPluginSettings = {
				...settings,
				notificationsEnabled: false
			};

			manager.updateSettings(newSettings);

			// After updating, notifications should be disabled
			manager.showToolCall('read_note', { path: 'test.md' });
			expect(Notice).not.toHaveBeenCalled();
		});

		it('should allow toggling showParameters', () => {
			manager.updateSettings({ ...settings, showParameters: false });

			manager.showToolCall('read_note', { path: 'test.md' });

			expect(Notice).toHaveBeenCalledWith(
				'📖 MCP Tool Called: read_note',
				3000
			);
		});
	});

	describe('History Management', () => {
		it('should add entry to history', () => {
			const entry = {
				timestamp: Date.now(),
				toolName: 'read_note',
				args: { path: 'test.md' },
				success: true,
				duration: 100
			};

			manager.addToHistory(entry);
			const history = manager.getHistory();

			expect(history).toHaveLength(1);
			expect(history[0]).toEqual(entry);
		});

		it('should add new entries to the beginning', () => {
			const entry1 = {
				timestamp: 1000,
				toolName: 'read_note',
				args: { path: 'test1.md' },
				success: true,
				duration: 100
			};

			const entry2 = {
				timestamp: 2000,
				toolName: 'read_note',
				args: { path: 'test2.md' },
				success: true,
				duration: 200
			};

			manager.addToHistory(entry1);
			manager.addToHistory(entry2);

			const history = manager.getHistory();
			expect(history[0]).toEqual(entry2);
			expect(history[1]).toEqual(entry1);
		});

		it('should limit history size to 100 entries', () => {
			// Add 110 entries
			for (let i = 0; i < 110; i++) {
				manager.addToHistory({
					timestamp: Date.now(),
					toolName: 'test_tool',
					args: {},
					success: true,
					duration: 100
				});
			}

			const history = manager.getHistory();
			expect(history).toHaveLength(100);
		});

		it('should keep most recent entries when trimming', () => {
			// Add 110 entries with unique timestamps
			for (let i = 0; i < 110; i++) {
				manager.addToHistory({
					timestamp: i,
					toolName: 'test_tool',
					args: { index: i },
					success: true,
					duration: 100
				});
			}

			const history = manager.getHistory();
			// Most recent entry should be index 109
			expect(history[0].args).toEqual({ index: 109 });
			// Oldest kept entry should be index 10
			expect(history[99].args).toEqual({ index: 10 });
		});

		it('should return copy of history array', () => {
			const entry = {
				timestamp: Date.now(),
				toolName: 'read_note',
				args: { path: 'test.md' },
				success: true,
				duration: 100
			};

			manager.addToHistory(entry);
			const history1 = manager.getHistory();
			const history2 = manager.getHistory();

			expect(history1).not.toBe(history2);
			expect(history1).toEqual(history2);
		});

		it('should add error entry with error message', () => {
			const entry = {
				timestamp: Date.now(),
				toolName: 'read_note',
				args: { path: 'test.md' },
				success: false,
				duration: 100,
				error: 'File not found'
			};

			manager.addToHistory(entry);
			const history = manager.getHistory();

			expect(history[0]).toHaveProperty('error', 'File not found');
		});
	});

	describe('clearHistory', () => {
		it('should clear all history entries', () => {
			manager.addToHistory({
				timestamp: Date.now(),
				toolName: 'read_note',
				args: { path: 'test.md' },
				success: true,
				duration: 100
			});

			expect(manager.getHistory()).toHaveLength(1);

			manager.clearHistory();

			expect(manager.getHistory()).toHaveLength(0);
		});

		it('should allow adding entries after clearing', () => {
			manager.addToHistory({
				timestamp: Date.now(),
				toolName: 'read_note',
				args: { path: 'test.md' },
				success: true,
				duration: 100
			});

			manager.clearHistory();

			manager.addToHistory({
				timestamp: Date.now(),
				toolName: 'create_note',
				args: { path: 'new.md' },
				success: true,
				duration: 150
			});

			const history = manager.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].toolName).toBe('create_note');
		});
	});

	describe('clearAll', () => {
		it('should exist as a method', () => {
			expect(manager.clearAll).toBeDefined();
			expect(typeof manager.clearAll).toBe('function');
		});

		it('should not throw when called', () => {
			expect(() => manager.clearAll()).not.toThrow();
		});

		// Note: clearAll doesn't actually do anything because Obsidian's Notice API
		// doesn't provide a way to programmatically dismiss notices
	});

	describe('Notification Queueing', () => {
		it('should have queueing mechanism', () => {
			// Queue multiple notifications
			manager.showToolCall('read_note', { path: 'test1.md' });
			manager.showToolCall('read_note', { path: 'test2.md' });
			manager.showToolCall('read_note', { path: 'test3.md' });

			// All should be queued (implementation uses async queue)
			// We can't easily test the timing without complex async mocking,
			// but we can verify the method executes without errors
			expect(Notice).toHaveBeenCalled();
		});

		it('should call showToolCall without throwing for multiple calls', () => {
			expect(() => {
				manager.showToolCall('read_note', { path: 'test1.md' });
				manager.showToolCall('create_note', { path: 'test2.md' });
				manager.showToolCall('update_note', { path: 'test3.md' });
			}).not.toThrow();
		});
	});
});
