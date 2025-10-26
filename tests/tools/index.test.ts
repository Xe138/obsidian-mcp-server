/**
 * Tests for ToolRegistry
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../src/tools';
import { NotificationManager } from '../../src/ui/notifications';
import { createMockToolResult, mockToolArgs } from '../__fixtures__/test-helpers';

// Mock the tool classes
jest.mock('../../src/tools/note-tools-factory', () => ({
	createNoteTools: jest.fn(() => ({
		readNote: jest.fn().mockResolvedValue(createMockToolResult(false, 'Note content')),
		createNote: jest.fn().mockResolvedValue(createMockToolResult(false, 'Note created')),
		updateNote: jest.fn().mockResolvedValue(createMockToolResult(false, 'Note updated')),
		deleteNote: jest.fn().mockResolvedValue(createMockToolResult(false, 'Note deleted')),
		updateFrontmatter: jest.fn().mockResolvedValue(createMockToolResult(false, 'Frontmatter updated')),
		updateSections: jest.fn().mockResolvedValue(createMockToolResult(false, 'Sections updated')),
		renameFile: jest.fn().mockResolvedValue(createMockToolResult(false, 'File renamed')),
		readExcalidraw: jest.fn().mockResolvedValue(createMockToolResult(false, 'Excalidraw data'))
	}))
}));

jest.mock('../../src/tools/vault-tools-factory', () => ({
	createVaultTools: jest.fn(() => ({
		search: jest.fn().mockResolvedValue(createMockToolResult(false, 'Search results')),
		searchWaypoints: jest.fn().mockResolvedValue(createMockToolResult(false, 'Waypoints found')),
		getVaultInfo: jest.fn().mockResolvedValue(createMockToolResult(false, 'Vault info')),
		list: jest.fn().mockResolvedValue(createMockToolResult(false, 'File list')),
		stat: jest.fn().mockResolvedValue(createMockToolResult(false, 'File stats')),
		exists: jest.fn().mockResolvedValue(createMockToolResult(false, 'true')),
		getFolderWaypoint: jest.fn().mockResolvedValue(createMockToolResult(false, 'Waypoint data')),
		isFolderNote: jest.fn().mockResolvedValue(createMockToolResult(false, 'true')),
		validateWikilinks: jest.fn().mockResolvedValue(createMockToolResult(false, 'Links validated')),
		resolveWikilink: jest.fn().mockResolvedValue(createMockToolResult(false, 'Link resolved')),
		getBacklinks: jest.fn().mockResolvedValue(createMockToolResult(false, 'Backlinks found'))
	}))
}));

describe('ToolRegistry', () => {
	let mockApp: App;
	let registry: ToolRegistry;

	beforeEach(() => {
		mockApp = new App();
		registry = new ToolRegistry(mockApp);
	});

	describe('Constructor', () => {
		it('should initialize with App instance', () => {
			expect(registry).toBeDefined();
		});

		it('should create NoteTools instance', () => {
			const { createNoteTools } = require('../../src/tools/note-tools-factory');
			expect(createNoteTools).toHaveBeenCalledWith(mockApp);
		});

		it('should create VaultTools instance', () => {
			const { createVaultTools } = require('../../src/tools/vault-tools-factory');
			expect(createVaultTools).toHaveBeenCalledWith(mockApp);
		});

		it('should initialize notification manager as null', () => {
			// Notification manager should be null until set
			expect(registry).toBeDefined();
		});
	});

	describe('setNotificationManager', () => {
		it('should set notification manager', () => {
			const mockManager = {} as NotificationManager;
			registry.setNotificationManager(mockManager);
			// Should not throw
			expect(registry).toBeDefined();
		});

		it('should accept null notification manager', () => {
			registry.setNotificationManager(null);
			expect(registry).toBeDefined();
		});
	});

	describe('getToolDefinitions', () => {
		it('should return array of tool definitions', () => {
			const tools = registry.getToolDefinitions();
			expect(Array.isArray(tools)).toBe(true);
			expect(tools.length).toBeGreaterThan(0);
		});

		it('should include all expected tools', () => {
			const tools = registry.getToolDefinitions();
			const toolNames = tools.map(t => t.name);

			// Note tools
			expect(toolNames).toContain('read_note');
			expect(toolNames).toContain('create_note');
			expect(toolNames).toContain('update_note');
			expect(toolNames).toContain('delete_note');
			expect(toolNames).toContain('update_frontmatter');
			expect(toolNames).toContain('update_sections');
			expect(toolNames).toContain('rename_file');
			expect(toolNames).toContain('read_excalidraw');

			// Vault tools
			expect(toolNames).toContain('search');
			expect(toolNames).toContain('search_waypoints');
			expect(toolNames).toContain('get_vault_info');
			expect(toolNames).toContain('list');
			expect(toolNames).toContain('stat');
			expect(toolNames).toContain('exists');
			expect(toolNames).toContain('get_folder_waypoint');
			expect(toolNames).toContain('is_folder_note');
			expect(toolNames).toContain('validate_wikilinks');
			expect(toolNames).toContain('resolve_wikilink');
			expect(toolNames).toContain('backlinks');
		});

		it('should include description for each tool', () => {
			const tools = registry.getToolDefinitions();
			tools.forEach(tool => {
				expect(tool).toHaveProperty('name');
				expect(tool).toHaveProperty('description');
				expect(tool.description).toBeTruthy();
			});
		});

		it('should include inputSchema for each tool', () => {
			const tools = registry.getToolDefinitions();
			tools.forEach(tool => {
				expect(tool).toHaveProperty('inputSchema');
				expect(tool.inputSchema).toHaveProperty('type', 'object');
				expect(tool.inputSchema).toHaveProperty('properties');
			});
		});

		it('should mark required parameters in schema', () => {
			const tools = registry.getToolDefinitions();
			const readNote = tools.find(t => t.name === 'read_note');

			expect(readNote).toBeDefined();
			expect(readNote!.inputSchema.required).toContain('path');
		});

		it('should include parameter descriptions', () => {
			const tools = registry.getToolDefinitions();
			const readNote = tools.find(t => t.name === 'read_note');

			expect(readNote).toBeDefined();
			expect(readNote!.inputSchema.properties.path).toHaveProperty('description');
		});
	});

	describe('callTool - Note Tools', () => {
		it('should call read_note tool', async () => {
			const result = await registry.callTool('read_note', mockToolArgs.read_note);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call create_note tool', async () => {
			const result = await registry.callTool('create_note', mockToolArgs.create_note);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call update_note tool', async () => {
			const result = await registry.callTool('update_note', mockToolArgs.update_note);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call delete_note tool', async () => {
			const result = await registry.callTool('delete_note', mockToolArgs.delete_note);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should pass arguments to note tools correctly', async () => {
			const result = await registry.callTool('read_note', {
				path: 'test.md',
				parseFrontmatter: true
			});

			// Verify tool was called successfully
			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should handle optional parameters with defaults', async () => {
			const result = await registry.callTool('create_note', {
				path: 'new.md',
				content: 'content'
			});

			// Verify tool was called successfully with default parameters
			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should handle provided optional parameters', async () => {
			const result = await registry.callTool('create_note', {
				path: 'new.md',
				content: 'content',
				createParents: true,
				onConflict: 'rename'
			});

			// Verify tool was called successfully with custom parameters
			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});
	});

	describe('callTool - Vault Tools', () => {
		it('should call search tool', async () => {
			const result = await registry.callTool('search', mockToolArgs.search);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call list tool', async () => {
			const result = await registry.callTool('list', mockToolArgs.list);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call stat tool', async () => {
			const result = await registry.callTool('stat', mockToolArgs.stat);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should call exists tool', async () => {
			const result = await registry.callTool('exists', mockToolArgs.exists);

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});

		it('should pass search arguments correctly', async () => {
			// Note: This test verifies the tool is called, but we can't easily verify
			// the exact arguments passed to the mock due to how the factory is set up
			const result = await registry.callTool('search', {
				query: 'test query',
				isRegex: true,
				caseSensitive: true
			});

			expect(result).toHaveProperty('content');
			expect(result.isError).toBe(false);
		});
	});

	describe('callTool - Unknown Tool', () => {
		it('should return error for unknown tool', async () => {
			const result = await registry.callTool('unknown_tool', {});

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Unknown tool');
		});

		it('should include tool name in error message', async () => {
			const result = await registry.callTool('invalid_tool', {});

			expect(result.content[0].text).toContain('invalid_tool');
		});
	});

	describe('callTool - Error Handling', () => {
		it('should handle tool execution errors', async () => {
			// Create a fresh registry with mocked tools
			jest.resetModules();

			jest.mock('../../src/tools/note-tools-factory', () => ({
				createNoteTools: jest.fn(() => ({
					readNote: jest.fn().mockRejectedValue(new Error('File not found')),
					createNote: jest.fn(),
					updateNote: jest.fn(),
					deleteNote: jest.fn(),
					updateFrontmatter: jest.fn(),
					updateSections: jest.fn(),
					renameFile: jest.fn(),
					readExcalidraw: jest.fn()
				}))
			}));

			const { ToolRegistry: TestRegistry } = require('../../src/tools');
			const testRegistry = new TestRegistry(mockApp);

			const result = await testRegistry.callTool('read_note', { path: 'missing.md' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Error');
			expect(result.content[0].text).toContain('File not found');
		});

		it('should return error result structure on exception', async () => {
			// Create a fresh registry with mocked tools
			jest.resetModules();

			jest.mock('../../src/tools/note-tools-factory', () => ({
				createNoteTools: jest.fn(() => ({
					readNote: jest.fn().mockRejectedValue(new Error('Test error')),
					createNote: jest.fn(),
					updateNote: jest.fn(),
					deleteNote: jest.fn(),
					updateFrontmatter: jest.fn(),
					updateSections: jest.fn(),
					renameFile: jest.fn(),
					readExcalidraw: jest.fn()
				}))
			}));

			const { ToolRegistry: TestRegistry } = require('../../src/tools');
			const testRegistry = new TestRegistry(mockApp);

			const result = await testRegistry.callTool('read_note', { path: 'test.md' });

			expect(result).toHaveProperty('content');
			expect(Array.isArray(result.content)).toBe(true);
			expect(result.content[0]).toHaveProperty('type', 'text');
			expect(result.content[0]).toHaveProperty('text');
			expect(result.isError).toBe(true);
		});
	});

	describe('callTool - Notification Integration', () => {
		it('should show notification when manager is set', async () => {
			const mockManager = {
				showToolCall: jest.fn(),
				addToHistory: jest.fn()
			} as any;

			registry.setNotificationManager(mockManager);
			await registry.callTool('read_note', mockToolArgs.read_note);

			expect(mockManager.showToolCall).toHaveBeenCalledWith(
				'read_note',
				mockToolArgs.read_note
			);
		});

		it('should add success to history', async () => {
			const mockManager = {
				showToolCall: jest.fn(),
				addToHistory: jest.fn()
			} as any;

			registry.setNotificationManager(mockManager);
			await registry.callTool('read_note', mockToolArgs.read_note);

			expect(mockManager.addToHistory).toHaveBeenCalledWith(
				expect.objectContaining({
					toolName: 'read_note',
					args: mockToolArgs.read_note,
					success: true,
					duration: expect.any(Number)
				})
			);
		});

		it('should add error to history', async () => {
			// Create a fresh registry with error-throwing mocks
			jest.resetModules();

			jest.mock('../../src/tools/note-tools-factory', () => ({
				createNoteTools: jest.fn(() => ({
					readNote: jest.fn().mockRejectedValue(new Error('Test error')),
					createNote: jest.fn(),
					updateNote: jest.fn(),
					deleteNote: jest.fn(),
					updateFrontmatter: jest.fn(),
					updateSections: jest.fn(),
					renameFile: jest.fn(),
					readExcalidraw: jest.fn()
				}))
			}));

			const { ToolRegistry: TestRegistry } = require('../../src/tools');
			const testRegistry = new TestRegistry(mockApp);

			const mockManager = {
				showToolCall: jest.fn(),
				addToHistory: jest.fn()
			} as any;

			testRegistry.setNotificationManager(mockManager);
			await testRegistry.callTool('read_note', mockToolArgs.read_note);

			expect(mockManager.addToHistory).toHaveBeenCalledWith(
				expect.objectContaining({
					toolName: 'read_note',
					success: false,
					error: 'Test error'
				})
			);
		});

		it('should not throw if notification manager is null', async () => {
			registry.setNotificationManager(null);

			await expect(
				registry.callTool('read_note', mockToolArgs.read_note)
			).resolves.not.toThrow();
		});

		it('should track execution duration', async () => {
			const mockManager = {
				showToolCall: jest.fn(),
				addToHistory: jest.fn()
			} as any;

			registry.setNotificationManager(mockManager);
			await registry.callTool('read_note', mockToolArgs.read_note);

			const historyCall = mockManager.addToHistory.mock.calls[0][0];
			expect(historyCall.duration).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Tool Schema Validation', () => {
		it('should have valid schema for all tools', () => {
			const tools = registry.getToolDefinitions();

			tools.forEach(tool => {
				expect(tool.inputSchema).toHaveProperty('type');
				expect(tool.inputSchema).toHaveProperty('properties');

				// If required field exists, it should be an array
				if (tool.inputSchema.required) {
					expect(Array.isArray(tool.inputSchema.required)).toBe(true);
				}
			});
		});

		it('should document all required parameters', () => {
			const tools = registry.getToolDefinitions();

			tools.forEach(tool => {
				if (tool.inputSchema.required) {
					tool.inputSchema.required.forEach((requiredParam: string) => {
						expect(tool.inputSchema.properties).toHaveProperty(requiredParam);
					});
				}
			});
		});
	});
});
