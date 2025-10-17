import { VaultTools } from '../src/tools/vault-tools';
import { App, TFile, TFolder } from 'obsidian';
import { FileMetadata, DirectoryMetadata } from '../src/types/mcp-types';

describe('VaultTools - list_notes sorting', () => {
	let app: App;
	let vaultTools: VaultTools;

	beforeEach(() => {
		// Mock App with vault
		app = {
			vault: {
				getAllLoadedFiles: jest.fn(),
			}
		} as any;

		vaultTools = new VaultTools(app);
	});

	describe('Case-insensitive alphabetical sorting', () => {
		it('should sort directories case-insensitively', async () => {
			// Create mock folders with mixed case names
			const folders = [
				createMockFolder('construction Game', 'construction Game'),
				createMockFolder('CTP Lancaster', 'CTP Lancaster'),
				createMockFolder('Archive', 'Archive'),
				createMockFolder('daily', 'daily'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(folders);

			const result = await vaultTools.listNotes();
			const items = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			// Extract directory names
			const dirNames = items
				.filter(item => item.kind === 'directory')
				.map(item => item.name);

			// Expected order (case-insensitive alphabetical)
			expect(dirNames).toEqual([
				'Archive',
				'construction Game',
				'CTP Lancaster',
				'daily'
			]);
		});

		it('should sort files case-insensitively', async () => {
			const files = [
				createMockFile('Zebra.md', 'Zebra.md'),
				createMockFile('apple.md', 'apple.md'),
				createMockFile('Banana.md', 'Banana.md'),
				createMockFile('cherry.md', 'cherry.md'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(files);

			const result = await vaultTools.listNotes();
			const items = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			const fileNames = items
				.filter(item => item.kind === 'file')
				.map(item => item.name);

			// Expected order (case-insensitive alphabetical)
			expect(fileNames).toEqual([
				'apple.md',
				'Banana.md',
				'cherry.md',
				'Zebra.md'
			]);
		});

		it('should place all directories before all files', async () => {
			const items = [
				createMockFile('zebra.md', 'zebra.md'),
				createMockFolder('Archive', 'Archive'),
				createMockFile('apple.md', 'apple.md'),
				createMockFolder('daily', 'daily'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(items);

			const result = await vaultTools.listNotes();
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			// First items should be directories
			expect(parsed[0].kind).toBe('directory');
			expect(parsed[1].kind).toBe('directory');
			// Last items should be files
			expect(parsed[2].kind).toBe('file');
			expect(parsed[3].kind).toBe('file');
		});
	});

	describe('Root path handling', () => {
		it('should list root when path is undefined', async () => {
			const items = [
				createMockFolder('folder1', 'folder1'),
				createMockFile('root-file.md', 'root-file.md'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(items);

			const result = await vaultTools.listNotes();
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should list root when path is empty string', async () => {
			const items = [
				createMockFolder('folder1', 'folder1'),
				createMockFile('root-file.md', 'root-file.md'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(items);

			const result = await vaultTools.listNotes('');
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should list root when path is dot', async () => {
			const items = [
				createMockFolder('folder1', 'folder1'),
				createMockFile('root-file.md', 'root-file.md'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(items);

			const result = await vaultTools.listNotes('.');
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should only return direct children of root', async () => {
			const items = [
				createMockFolder('folder1', 'folder1'),
				createMockFile('root-file.md', 'root-file.md'),
				// These should NOT be included (nested)
				createMockFile('nested.md', 'folder1/nested.md', 'folder1'),
			];

			(app.vault.getAllLoadedFiles as jest.Mock).mockReturnValue(items);

			const result = await vaultTools.listNotes();
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			// Should only have 2 items (folder1 and root-file.md)
			expect(parsed.length).toBe(2);
			expect(parsed.some(item => item.name === 'nested.md')).toBe(false);
		});
	});

	// Helper functions
	function createMockFolder(name: string, path: string, parentPath: string = ''): any {
		const folder = Object.create(TFolder.prototype);
		Object.assign(folder, {
			name,
			path,
			parent: parentPath ? { path: parentPath } : null,
			children: [],
			stat: {
				mtime: Date.now(),
				ctime: Date.now(),
				size: 0
			}
		});
		return folder;
	}

	function createMockFile(name: string, path: string, parentPath: string = ''): any {
		const file = Object.create(TFile.prototype);
		Object.assign(file, {
			name,
			path,
			basename: name.replace(/\.[^.]+$/, ''),
			extension: name.split('.').pop() || '',
			parent: parentPath ? { path: parentPath } : null,
			stat: {
				mtime: Date.now(),
				ctime: Date.now(),
				size: 1024
			}
		});
		return file;
	}
});
