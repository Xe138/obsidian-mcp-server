import { NoteTools } from '../src/tools/note-tools';
import { createMockVaultAdapter, createMockFileManagerAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';
import { App, Vault, TFile, TFolder } from 'obsidian';

// Mock PathUtils since NoteTools uses it extensively
jest.mock('../src/utils/path-utils', () => ({
	PathUtils: {
		normalizePath: jest.fn((path: string) => path),
		isValidVaultPath: jest.fn(() => true),
		resolveFile: jest.fn(),
		fileExists: jest.fn(),
		folderExists: jest.fn(),
		pathExists: jest.fn(),
		getParentPath: jest.fn((path: string) => {
			const lastSlash = path.lastIndexOf('/');
			return lastSlash > 0 ? path.substring(0, lastSlash) : '';
		})
	}
}));

// Import the mocked PathUtils
import { PathUtils } from '../src/utils/path-utils';

describe('NoteTools', () => {
	let noteTools: NoteTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockFileManager: ReturnType<typeof createMockFileManagerAdapter>;
	let mockApp: App;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockFileManager = createMockFileManagerAdapter();
		mockApp = new App();
		noteTools = new NoteTools(mockVault, mockFileManager, mockApp);

		// Reset all mocks
		jest.clearAllMocks();
	});

	describe('readNote', () => {
		it('should read note content successfully', async () => {
			const mockFile = createMockTFile('test.md');
			const content = '# Test Note\n\nThis is test content.';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);

			const result = await noteTools.readNote('test.md');

			expect(result.isError).toBeUndefined();
			expect(result.content[0].text).toBe(content);
			expect(mockVault.read).toHaveBeenCalledWith(mockFile);
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.readNote('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.readNote('folder');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should handle read errors', async () => {
			const mockFile = createMockTFile('test.md');
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockRejectedValue(new Error('Read permission denied'));

			const result = await noteTools.readNote('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Read permission denied');
		});

		it('should parse frontmatter when requested', async () => {
			const mockFile = createMockTFile('test.md');
			const content = '---\ntitle: Test\ntags: [test, example]\n---\n\nContent here';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);

			const result = await noteTools.readNote('test.md', { parseFrontmatter: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.hasFrontmatter).toBe(true);
			expect(parsed.path).toBe('test.md');
			// frontmatter field is the raw YAML string
			expect(parsed.frontmatter).toBeDefined();
		});
	});

	describe('createNote', () => {
		it('should create note successfully', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});

			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('test.md', 'content');

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('test.md', 'content');
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.success).toBe(true);
			expect(parsed.path).toBe('test.md');
		});

		it('should return error if file exists and strategy is error', async () => {
			(PathUtils.fileExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.createNote('test.md', 'content', false, 'error');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('already exists');
		});

		it('should overwrite if strategy is overwrite', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.fileExists as jest.Mock).mockReturnValue(true);
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.delete = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(mockFile);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');

			const result = await noteTools.createNote('test.md', 'content', false, 'overwrite');

			expect(result.isError).toBeUndefined();
			expect(mockVault.delete).toHaveBeenCalledWith(mockFile);
			expect(mockVault.create).toHaveBeenCalled();
		});

		it('should rename if strategy is rename', async () => {
			const mockFile = createMockTFile('test 1.md');

			(PathUtils.fileExists as jest.Mock)
				.mockReturnValueOnce(true)  // Original exists
				.mockReturnValueOnce(false); // test 1.md doesn't exist
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('test.md', 'content', false, 'rename');

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('test 1.md', 'content');
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.renamed).toBe(true);
			expect(parsed.originalPath).toBe('test.md');
		});

		it('should create file with incremented counter when conflicts exist', async () => {
			const mockFile = createMockTFile('test 3.md');

			(PathUtils.fileExists as jest.Mock)
				.mockReturnValueOnce(true)   // Original test.md exists
				.mockReturnValueOnce(true)   // test 1.md exists
				.mockReturnValueOnce(true)   // test 2.md exists
				.mockReturnValueOnce(false); // test 3.md doesn't exist
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('test.md', 'content', false, 'rename');

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('test 3.md', 'content');
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.renamed).toBe(true);
			expect(parsed.originalPath).toBe('test.md');
			expect(parsed.path).toBe('test 3.md');
		});

		it('should return error if parent folder does not exist and createParents is false', async () => {
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('folder');
			(PathUtils.pathExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.createNote('folder/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder');
		});

		it('should create parent folders when createParents is true', async () => {
			const mockFile = createMockTFile('folder/file.md');

			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock)
				.mockReturnValueOnce('folder')  // getParentPath('folder/file.md') in createNote
				.mockReturnValueOnce('');        // getParentPath('folder') in createParentFolders - stops recursion
			(PathUtils.pathExists as jest.Mock)
				.mockReturnValueOnce(false)  // Check in createNote: parentPath exists?
				.mockReturnValueOnce(false); // Check in createParentFolders: folder exists?
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(mockFile);

			const result = await noteTools.createNote('folder/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledWith('folder');
			expect(mockVault.create).toHaveBeenCalledWith('folder/file.md', 'content');
		});

		it('should handle create errors', async () => {
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockVault.create = jest.fn().mockRejectedValue(new Error('Disk full'));

			const result = await noteTools.createNote('test.md', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Disk full');
		});

		it('should return error if parent path is a file', async () => {
			(PathUtils.fileExists as jest.Mock)
				.mockReturnValueOnce(false)  // test.md doesn't exist
				.mockReturnValueOnce(true);  // parent is a file
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('parent');

			const result = await noteTools.createNote('parent/test.md', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a folder');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.createNote('folder', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});
	});

	describe('updateNote', () => {
		it('should update note successfully', async () => {
			const mockFile = createMockTFile('test.md');
			const currentContent = 'old content';
			const newContent = 'new content';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(currentContent);
			mockVault.modify = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.updateNote('test.md', newContent);

			expect(result.isError).toBeUndefined();
			expect(mockVault.modify).toHaveBeenCalledWith(mockFile, newContent);
			expect(result.content[0].text).toContain('updated successfully');
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.updateNote('nonexistent.md', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.updateNote('folder', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should handle update errors', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue('old content');
			mockVault.modify = jest.fn().mockRejectedValue(new Error('File locked'));

			const result = await noteTools.updateNote('test.md', 'new content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('File locked');
		});

		it('should prevent waypoint modification', async () => {
			const mockFile = createMockTFile('test.md');
			const waypointContent = 'before\n%% Begin Waypoint %%\nwaypoint content\n%% End Waypoint %%\nafter';
			const newContent = 'before\nmodified waypoint\nafter';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(waypointContent);

			const result = await noteTools.updateNote('test.md', newContent);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Waypoint');
		});
	});

	describe('deleteNote', () => {
		it('should soft delete note successfully', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.trash = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.deleteNote('test.md', true, false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.trash).toHaveBeenCalledWith(mockFile, true);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.deleted).toBe(true);
			expect(parsed.soft).toBe(true);
		});

		it('should permanently delete note', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.delete = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.deleteNote('test.md', false, false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.delete).toHaveBeenCalledWith(mockFile);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.deleted).toBe(true);
			expect(parsed.soft).toBe(false);
		});

		it('should handle dry run', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);

			const result = await noteTools.deleteNote('test.md', true, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.deleted).toBe(false);
			expect(parsed.dryRun).toBe(true);
			expect(mockVault.trash).not.toHaveBeenCalled();
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.deleteNote('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.deleteNote('folder');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Path is a folder');
		});

		it('should handle delete errors', async () => {
			const mockFile = createMockTFile('test.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.trash = jest.fn().mockRejectedValue(new Error('Cannot delete'));

			const result = await noteTools.deleteNote('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Cannot delete');
		});

		it('should check version if ifMatch provided', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);

			// Wrong version
			const result = await noteTools.deleteNote('test.md', true, false, '1000-50');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Version mismatch');
			expect(mockVault.trash).not.toHaveBeenCalled();
		});
	});

	describe('renameFile', () => {
		it('should rename file successfully', async () => {
			const mockFile = createMockTFile('old.md');
			const renamedFile = createMockTFile('new.md');

			(PathUtils.resolveFile as jest.Mock)
				.mockReturnValueOnce(mockFile)   // Source file
				.mockReturnValueOnce(renamedFile); // After rename
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.pathExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockFileManager.renameFile = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.renameFile('old.md', 'new.md');

			expect(result.isError).toBeUndefined();
			expect(mockFileManager.renameFile).toHaveBeenCalledWith(mockFile, 'new.md');
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.success).toBe(true);
			expect(parsed.oldPath).toBe('old.md');
			expect(parsed.newPath).toBe('new.md');
		});

		it('should return error if source file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.renameFile('nonexistent.md', 'new.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if source path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.renameFile('folder', 'new.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should return error if destination exists', async () => {
			const mockFile = createMockTFile('old.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			(PathUtils.fileExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.renameFile('old.md', 'existing.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('already exists');
		});

		it('should return error if destination path is a folder', async () => {
			const mockFile = createMockTFile('old.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.renameFile('old.md', 'existing-folder');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should handle rename errors', async () => {
			const mockFile = createMockTFile('old.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.pathExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock).mockReturnValue('');
			mockFileManager.renameFile = jest.fn().mockRejectedValue(new Error('Name conflict'));

			const result = await noteTools.renameFile('old.md', 'new.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Name conflict');
		});

		it('should check version if ifMatch provided', async () => {
			const mockFile = createMockTFile('old.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			// Wrong version
			const result = await noteTools.renameFile('old.md', 'new.md', true, '1000-50');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Version mismatch');
			expect(mockFileManager.renameFile).not.toHaveBeenCalled();
		});

		it('should create parent folders if needed', async () => {
			const mockFile = createMockTFile('old.md');
			const renamedFile = createMockTFile('folder/new.md');

			(PathUtils.resolveFile as jest.Mock)
				.mockReturnValueOnce(mockFile)
				.mockReturnValueOnce(renamedFile);
			(PathUtils.fileExists as jest.Mock).mockReturnValue(false);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);
			(PathUtils.getParentPath as jest.Mock)
				.mockReturnValueOnce('folder')  // getParentPath('folder/new.md') in renameFile
				.mockReturnValueOnce('');        // getParentPath('folder') in createParentFolders
			(PathUtils.pathExists as jest.Mock)
				.mockReturnValueOnce(false)  // Check in renameFile: parentPath exists?
				.mockReturnValueOnce(false); // Check in createParentFolders: folder exists?
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockFileManager.renameFile = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.renameFile('old.md', 'folder/new.md');

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledWith('folder');
		});
	});

	describe('readExcalidraw', () => {
		it('should read Excalidraw file successfully', async () => {
			const mockFile = createMockTFile('drawing.md');
			// Excalidraw files must have the Drawing section with json code block
			const excalidrawContent = `# Text Elements
Some text

## Drawing
\`\`\`json
{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[{"id":"1","type":"rectangle"}],"appState":{"viewBackgroundColor":"#ffffff"},"files":{}}
\`\`\``;

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(excalidrawContent);

			const result = await noteTools.readExcalidraw('drawing.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.isExcalidraw).toBe(true);
		});

		it('should return error for non-Excalidraw files', async () => {
			const mockFile = createMockTFile('regular.md');
			const content = '# Regular Note\n\nNot an Excalidraw file';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);

			const result = await noteTools.readExcalidraw('regular.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.isExcalidraw).toBe(false);
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.readExcalidraw('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.readExcalidraw('folder');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should handle read errors', async () => {
			const mockFile = createMockTFile('drawing.md');

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockRejectedValue(new Error('Read error'));

			const result = await noteTools.readExcalidraw('drawing.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Read error');
		});
	});

	describe('updateFrontmatter', () => {
		it('should update frontmatter successfully', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});
			const content = '---\ntitle: Old\n---\n\nContent';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);
			mockVault.modify = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.updateFrontmatter('test.md', { title: 'New', author: 'Test' });

			expect(result.isError).toBeUndefined();
			expect(mockVault.modify).toHaveBeenCalled();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.success).toBe(true);
			expect(parsed.updatedFields).toContain('title');
			expect(parsed.updatedFields).toContain('author');
		});

		it('should remove frontmatter fields', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});
			const content = '---\ntitle: Test\nauthor: Me\n---\n\nContent';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);
			mockVault.modify = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.updateFrontmatter('test.md', undefined, ['author']);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.removedFields).toContain('author');
		});

		it('should return error if no operations provided', async () => {
			const result = await noteTools.updateFrontmatter('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('No operations provided');
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.updateFrontmatter('nonexistent.md', { title: 'Test' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.updateFrontmatter('folder', { title: 'Test' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});

		it('should check version if ifMatch provided', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);

			// Wrong version
			const result = await noteTools.updateFrontmatter('test.md', { title: 'Test' }, [], '1000-50');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Version mismatch');
			expect(mockVault.modify).not.toHaveBeenCalled();
		});

		it('should handle update errors', async () => {
			const mockFile = createMockTFile('test.md');
			const content = '---\ntitle: Test\n---\n\nContent';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);
			mockVault.modify = jest.fn().mockRejectedValue(new Error('Write error'));

			const result = await noteTools.updateFrontmatter('test.md', { title: 'New' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Write error');
		});
	});

	describe('updateSections', () => {
		it('should update sections successfully', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});
			const content = 'Line 1\nLine 2\nLine 3\nLine 4';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);
			mockVault.modify = jest.fn().mockResolvedValue(undefined);

			const result = await noteTools.updateSections('test.md', [
				{ startLine: 2, endLine: 3, content: 'New Line 2\nNew Line 3' }
			]);

			expect(result.isError).toBeUndefined();
			expect(mockVault.modify).toHaveBeenCalled();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.success).toBe(true);
			expect(parsed.sectionsUpdated).toBe(1);
		});

		it('should return error if no edits provided', async () => {
			const result = await noteTools.updateSections('test.md', []);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('No edits provided');
		});

		it('should return error for invalid line range', async () => {
			const mockFile = createMockTFile('test.md');
			const content = 'Line 1\nLine 2\nLine 3';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);

			const result = await noteTools.updateSections('test.md', [
				{ startLine: 1, endLine: 10, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid line range');
		});

		it('should check version if ifMatch provided', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 100
			});

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);

			// Wrong version
			const result = await noteTools.updateSections('test.md', [
				{ startLine: 1, endLine: 1, content: 'New' }
			], '1000-50');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Version mismatch');
			expect(mockVault.modify).not.toHaveBeenCalled();
		});

		it('should handle update errors', async () => {
			const mockFile = createMockTFile('test.md');
			const content = 'Line 1\nLine 2';

			(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue(content);
			mockVault.modify = jest.fn().mockRejectedValue(new Error('Update error'));

			const result = await noteTools.updateSections('test.md', [
				{ startLine: 1, endLine: 1, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Update error');
		});

		it('should return error if file not found', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(false);

			const result = await noteTools.updateSections('nonexistent.md', [
				{ startLine: 1, endLine: 1, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is a folder', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(null);
			(PathUtils.folderExists as jest.Mock).mockReturnValue(true);

			const result = await noteTools.updateSections('folder', [
				{ startLine: 1, endLine: 1, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a file');
		});
	});

	describe('path validation', () => {
		beforeEach(() => {
			(PathUtils.isValidVaultPath as jest.Mock).mockReturnValue(false);
		});

		it('should validate path in readNote', async () => {
			const result = await noteTools.readNote('../../../etc/passwd');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in createNote', async () => {
			const result = await noteTools.createNote('../bad.md', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in updateNote', async () => {
			const result = await noteTools.updateNote('/absolute/path.md', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in deleteNote', async () => {
			const result = await noteTools.deleteNote('bad//path.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate source path in renameFile', async () => {
			const result = await noteTools.renameFile('../bad.md', 'good.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate destination path in renameFile', async () => {
			(PathUtils.isValidVaultPath as jest.Mock)
				.mockReturnValueOnce(true)  // source is valid
				.mockReturnValueOnce(false); // destination is invalid

			const result = await noteTools.renameFile('good.md', '../bad.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in readExcalidraw', async () => {
			const result = await noteTools.readExcalidraw('../../bad.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in updateFrontmatter', async () => {
			const result = await noteTools.updateFrontmatter('../bad.md', { title: 'Test' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should validate path in updateSections', async () => {
			const result = await noteTools.updateSections('../bad.md', [
				{ startLine: 1, endLine: 1, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});
	});

	describe('empty path validation', () => {
		it('should reject empty path in readNote', async () => {
			const result = await noteTools.readNote('');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in createNote', async () => {
			const result = await noteTools.createNote('', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in updateNote', async () => {
			const result = await noteTools.updateNote('', 'content');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in deleteNote', async () => {
			const result = await noteTools.deleteNote('');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty source path in renameFile', async () => {
			const result = await noteTools.renameFile('', 'new.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty destination path in renameFile', async () => {
			(PathUtils.resolveFile as jest.Mock).mockReturnValue(createMockTFile('old.md'));

			const result = await noteTools.renameFile('old.md', '');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in readExcalidraw', async () => {
			const result = await noteTools.readExcalidraw('');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in updateFrontmatter', async () => {
			const result = await noteTools.updateFrontmatter('', { title: 'Test' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});

		it('should reject empty path in updateSections', async () => {
			const result = await noteTools.updateSections('', [
				{ startLine: 1, endLine: 1, content: 'New' }
			]);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('empty');
		});
	});
});