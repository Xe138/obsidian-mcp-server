import { App, TFile, TFolder, Vault } from 'obsidian';
import { NoteTools } from '../src/tools/note-tools';
import { PathUtils } from '../src/utils/path-utils';

// Mock Obsidian API
jest.mock('obsidian');

describe('Enhanced Parent Folder Detection', () => {
	let app: jest.Mocked<App>;
	let vault: jest.Mocked<Vault>;
	let noteTools: NoteTools;

	beforeEach(() => {
		// Create mock vault
		vault = {
			getAbstractFileByPath: jest.fn(),
			create: jest.fn(),
			createFolder: jest.fn(),
			read: jest.fn(),
			modify: jest.fn(),
			delete: jest.fn(),
		} as any;

		// Create mock app
		app = {
			vault,
		} as any;

		noteTools = new NoteTools(app);
	});

	describe('Explicit parent folder detection', () => {
		test('should detect missing parent folder before write operation', async () => {
			// Setup: parent folder doesn't exist
			vault.getAbstractFileByPath.mockReturnValue(null);

			const result = await noteTools.createNote('missing-parent/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('missing-parent');
			expect(vault.create).not.toHaveBeenCalled();
		});

		test('should detect when parent path is a file, not a folder', async () => {
			const mockFile = { path: 'parent.md' } as TFile;
			
			// Setup: parent path exists but is a file
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'parent.md') return mockFile;
				return null;
			});

			const result = await noteTools.createNote('parent.md/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Path is not a folder');
			expect(result.content[0].text).toContain('parent.md');
			expect(vault.create).not.toHaveBeenCalled();
		});

		test('should succeed when parent folder exists', async () => {
			const mockFolder = { path: 'existing-folder' } as TFolder;
			const mockFile = { path: 'existing-folder/file.md' } as TFile;
			
			// Setup: parent folder exists
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'existing-folder') return mockFolder;
				if (path === 'existing-folder/file.md') return null; // file doesn't exist yet
				return null;
			});
			
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('existing-folder/file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(result.content[0].text).toContain('Note created successfully');
			expect(vault.create).toHaveBeenCalledWith('existing-folder/file.md', 'content');
		});

		test('should handle nested missing parents (a/b/c where b does not exist)', async () => {
			const mockFolderA = { path: 'a' } as TFolder;
			
			// Setup: only 'a' exists, 'a/b' does not exist
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'a') return mockFolderA;
				return null;
			});

			const result = await noteTools.createNote('a/b/c/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('a/b/c');
			expect(vault.create).not.toHaveBeenCalled();
		});
	});

	describe('createParents parameter', () => {
		test('should create single missing parent folder when createParents is true', async () => {
			const mockFolder = { path: 'new-folder' } as TFolder;
			const mockFile = { path: 'new-folder/file.md' } as TFile;
			
			// Setup: parent doesn't exist initially
			let folderCreated = false;
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'new-folder' && folderCreated) return mockFolder;
				return null;
			});
			
			vault.createFolder.mockImplementation(async (path: string) => {
				folderCreated = true;
				return mockFolder;
			});
			
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('new-folder/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(vault.createFolder).toHaveBeenCalledWith('new-folder');
			expect(vault.create).toHaveBeenCalledWith('new-folder/file.md', 'content');
			expect(result.content[0].text).toContain('Note created successfully');
		});

		test('should recursively create all missing parent folders', async () => {
			const createdFolders = new Set<string>();
			const mockFile = { path: 'a/b/c/file.md' } as TFile;
			
			// Setup: no folders exist initially
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (createdFolders.has(path)) {
					return { path } as TFolder;
				}
				return null;
			});
			
			vault.createFolder.mockImplementation(async (path: string) => {
				createdFolders.add(path);
				return { path } as TFolder;
			});
			
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/c/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(vault.createFolder).toHaveBeenCalledTimes(3);
			expect(vault.createFolder).toHaveBeenCalledWith('a');
			expect(vault.createFolder).toHaveBeenCalledWith('a/b');
			expect(vault.createFolder).toHaveBeenCalledWith('a/b/c');
			expect(vault.create).toHaveBeenCalledWith('a/b/c/file.md', 'content');
		});

		test('should not create folders when createParents is false (default)', async () => {
			// Setup: parent doesn't exist
			vault.getAbstractFileByPath.mockReturnValue(null);

			const result = await noteTools.createNote('missing/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(vault.createFolder).not.toHaveBeenCalled();
			expect(vault.create).not.toHaveBeenCalled();
		});

		test('should handle createFolder errors gracefully', async () => {
			// Setup: parent doesn't exist
			vault.getAbstractFileByPath.mockReturnValue(null);
			vault.createFolder.mockRejectedValue(new Error('Permission denied'));

			const result = await noteTools.createNote('new-folder/file.md', 'content', true);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Failed to create parent folders');
			expect(result.content[0].text).toContain('Permission denied');
			expect(vault.create).not.toHaveBeenCalled();
		});

		test('should skip creating folders that already exist', async () => {
			const mockFolderA = { path: 'a' } as TFolder;
			const mockFile = { path: 'a/b/file.md' } as TFile;
			let folderBCreated = false;
			
			// Setup: 'a' exists, 'a/b' does not
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'a') return mockFolderA;
				if (path === 'a/b' && folderBCreated) return { path: 'a/b' } as TFolder;
				return null;
			});
			
			vault.createFolder.mockImplementation(async (path: string) => {
				if (path === 'a/b') {
					folderBCreated = true;
					return { path: 'a/b' } as TFolder;
				}
				return null as any;
			});
			
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			// Should only create 'a/b', not 'a' (which already exists)
			expect(vault.createFolder).toHaveBeenCalledTimes(1);
			expect(vault.createFolder).toHaveBeenCalledWith('a/b');
		});
	});

	describe('Error message clarity', () => {
		test('should provide helpful error message with createParents suggestion', async () => {
			vault.getAbstractFileByPath.mockReturnValue(null);

			const result = await noteTools.createNote('folder/subfolder/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder does not exist');
			expect(result.content[0].text).toContain('folder/subfolder');
			expect(result.content[0].text).toContain('createParents: true');
			expect(result.content[0].text).toContain('Troubleshooting tips');
		});

		test('should provide clear error when parent is a file', async () => {
			const mockFile = { path: 'file.md' } as TFile;
			
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
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
			const mockFile = { path: 'file.md' } as TFile;
			
			vault.getAbstractFileByPath.mockReturnValue(null);
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(vault.create).toHaveBeenCalledWith('file.md', 'content');
		});

		test('should normalize paths before checking parent', async () => {
			const mockFolder = { path: 'folder' } as TFolder;
			const mockFile = { path: 'folder/file.md' } as TFile;
			
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (path === 'folder') return mockFolder;
				return null;
			});
			
			vault.create.mockResolvedValue(mockFile);

			// Test with various path formats
			const result = await noteTools.createNote('folder//file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(vault.create).toHaveBeenCalledWith('folder/file.md', 'content');
		});

		test('should handle deeply nested paths', async () => {
			const createdFolders = new Set<string>();
			const mockFile = { path: 'a/b/c/d/e/f/file.md' } as TFile;
			
			vault.getAbstractFileByPath.mockImplementation((path: string) => {
				if (createdFolders.has(path)) {
					return { path } as TFolder;
				}
				return null;
			});
			
			vault.createFolder.mockImplementation(async (path: string) => {
				createdFolders.add(path);
				return { path } as TFolder;
			});
			
			vault.create.mockResolvedValue(mockFile);

			const result = await noteTools.createNote('a/b/c/d/e/f/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(vault.createFolder).toHaveBeenCalledTimes(6);
		});
	});
});
