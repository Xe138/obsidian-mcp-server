import { App } from 'obsidian';
import { NoteTools } from '../src/tools/note-tools';
import { createMockVaultAdapter, createMockFileManagerAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';

// Mock Obsidian API
jest.mock('obsidian');

describe('Enhanced Parent Folder Detection', () => {
	let noteTools: NoteTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockFileManager: ReturnType<typeof createMockFileManagerAdapter>;
	let mockApp: App;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockFileManager = createMockFileManagerAdapter();

		// Create a minimal mock App that supports PathUtils
		// Use a getter to ensure it always uses the current mock
		mockApp = {
			vault: {
				get getAbstractFileByPath() {
					return mockVault.getAbstractFileByPath;
				}
			}
		} as any;

		noteTools = new NoteTools(mockVault, mockFileManager, mockApp);
	});

	describe('Explicit parent folder detection', () => {
		test('should detect missing parent folder before write operation', async () => {
			// Setup: parent folder doesn't exist
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await noteTools.createNote('missing-parent/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('missing-parent');
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		test('should detect when parent path is a file, not a folder', async () => {
			// Create a proper TFile instance
			const mockFile = createMockTFile('parent.md');

			// Setup: parent path exists but is a file
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'parent.md') return mockFile;
				return null;
			});

			const result = await noteTools.createNote('parent.md/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Path is not a folder');
			expect(result.content[0].text).toContain('parent.md');
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		test('should succeed when parent folder exists', async () => {
			const mockFolder = createMockTFolder('existing-folder');
			const mockFile = createMockTFile('existing-folder/file.md');

			// Setup: parent folder exists
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'existing-folder') return mockFolder;
				if (path === 'existing-folder/file.md') return null; // file doesn't exist yet
				return null;
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('existing-folder/file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(JSON.parse(result.content[0].text).success).toBe(true);
			expect(mockVault.create).toHaveBeenCalledWith('existing-folder/file.md', 'content');
		});

		test('should handle nested missing parents (a/b/c where b does not exist)', async () => {
			const mockFolderA = createMockTFolder('a');

			// Setup: only 'a' exists, 'a/b' does not exist
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'a') return mockFolderA;
				return null;
			});

			const result = await noteTools.createNote('a/b/c/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('a/b/c');
			expect(mockVault.create).not.toHaveBeenCalled();
		});
	});

	describe('createParents parameter', () => {
		test('should create single missing parent folder when createParents is true', async () => {
			const mockFolder = createMockTFolder('new-folder');
			const mockFile = createMockTFile('new-folder/file.md');

			// Setup: parent doesn't exist initially
			let folderCreated = false;
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'new-folder' && folderCreated) return mockFolder;
				return null;
			});

			mockVault.createFolder = jest.fn().mockImplementation(async (path: string) => {
				folderCreated = true;
				return mockFolder;
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('new-folder/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledWith('new-folder');
			expect(mockVault.create).toHaveBeenCalledWith('new-folder/file.md', 'content');
			expect(JSON.parse(result.content[0].text).success).toBe(true);
		});

		test('should recursively create all missing parent folders', async () => {
			const createdFolders = new Set<string>();
			const mockFile = createMockTFile('a/b/c/file.md');

			// Setup: no folders exist initially
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (createdFolders.has(path)) {
					return createMockTFolder(path);
				}
				return null;
			});

			mockVault.createFolder = jest.fn().mockImplementation(async (path: string) => {
				createdFolders.add(path);
				return createMockTFolder(path);
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/c/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledTimes(3);
			expect(mockVault.createFolder).toHaveBeenCalledWith('a');
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b');
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b/c');
			expect(mockVault.create).toHaveBeenCalledWith('a/b/c/file.md', 'content');
		});

		test('should not create folders when createParents is false (default)', async () => {
			// Setup: parent doesn't exist
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await noteTools.createNote('missing/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(mockVault.createFolder).not.toHaveBeenCalled();
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		test('should handle createFolder errors gracefully', async () => {
			// Setup: parent doesn't exist
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.createFolder = jest.fn().mockRejectedValue(new Error('Permission denied'));

			const result = await noteTools.createNote('new-folder/file.md', 'content', true);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Failed to create parent folders');
			expect(result.content[0].text).toContain('Permission denied');
			expect(mockVault.create).not.toHaveBeenCalled();
		});

		test('should skip creating folders that already exist', async () => {
			const mockFolderA = createMockTFolder('a');
			const mockFile = createMockTFile('a/b/file.md');
			let folderBCreated = false;

			// Setup: 'a' exists, 'a/b' does not
			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'a') return mockFolderA;
				if (path === 'a/b' && folderBCreated) return createMockTFolder('a/b');
				return null;
			});

			mockVault.createFolder = jest.fn().mockImplementation(async (path: string) => {
				if (path === 'a/b') {
					folderBCreated = true;
					return createMockTFolder('a/b');
				}
				return null as any;
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			// Should only create 'a/b', not 'a' (which already exists)
			expect(mockVault.createFolder).toHaveBeenCalledTimes(1);
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b');
		});
	});

	describe('Error message clarity', () => {
		test('should provide helpful error message with createParents suggestion', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await noteTools.createNote('folder/subfolder/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('folder/subfolder');
			expect(result.content[0].text).toContain('createParents: true');
			expect(result.content[0].text).toContain('Troubleshooting tips');
		});

		test('should provide clear error when parent is a file', async () => {
			// Create a proper TFile instance
			const mockFile = createMockTFile('file.md');

			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'file.md') return mockFile;
				return null;
			});

			const result = await noteTools.createNote('file.md/nested.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Path is not a folder');
			expect(result.content[0].text).toContain('file.md');
		});
	});

	describe('Edge cases', () => {
		test('should handle file in root directory (no parent path)', async () => {
			const mockFile = createMockTFile('file.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('file.md', 'content');
		});

		test('should normalize paths before checking parent', async () => {
			const mockFolder = createMockTFolder('folder');
			const mockFile = createMockTFile('folder/file.md');

			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (path === 'folder') return mockFolder;
				return null;
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			// Test with various path formats
			const result = await noteTools.createNote('folder//file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('folder/file.md', 'content');
		});

		test('should handle deeply nested paths', async () => {
			const createdFolders = new Set<string>();
			const mockFile = createMockTFile('a/b/c/d/e/f/file.md');

			mockVault.getAbstractFileByPath = jest.fn().mockImplementation((path: string) => {
				if (createdFolders.has(path)) {
					return createMockTFolder(path);
				}
				return null;
			});

			mockVault.createFolder = jest.fn().mockImplementation(async (path: string) => {
				createdFolders.add(path);
				return createMockTFolder(path);
			});

			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/c/d/e/f/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledTimes(6);
		});
	});
});
