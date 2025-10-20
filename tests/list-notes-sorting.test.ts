import { VaultTools } from '../src/tools/vault-tools';
import { createMockVaultAdapter, createMockMetadataCacheAdapter, createMockTFolder, createMockTFile } from './__mocks__/adapters';
import { TFile, TFolder } from 'obsidian';
import { FileMetadata, DirectoryMetadata } from '../src/types/mcp-types';

describe('VaultTools - list_notes sorting', () => {
	let vaultTools: VaultTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockMetadata: ReturnType<typeof createMockMetadataCacheAdapter>;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockMetadata = createMockMetadataCacheAdapter();

		vaultTools = new VaultTools(mockVault, mockMetadata);
	});

	describe('Case-insensitive alphabetical sorting', () => {
		it('should sort directories case-insensitively', async () => {
			// Create mock folders with mixed case names
			const folders = [
				createMockTFolder('construction Game'),
				createMockTFolder('CTP Lancaster'),
				createMockTFolder('Archive'),
				createMockTFolder('daily'),
			];

			const rootFolder = createMockTFolder('', folders);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

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
				createMockTFile('Zebra.md'),
				createMockTFile('apple.md'),
				createMockTFile('Banana.md'),
				createMockTFile('cherry.md'),
			];

			const rootFolder = createMockTFolder('', files);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

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
				createMockTFile('zebra.md'),
				createMockTFolder('Archive'),
				createMockTFile('apple.md'),
				createMockTFolder('daily'),
			];

			const rootFolder = createMockTFolder('', items);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

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
				createMockTFolder('folder1'),
				createMockTFile('root-file.md'),
			];

			const rootFolder = createMockTFolder('', items);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

			const result = await vaultTools.listNotes();
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should list root when path is empty string', async () => {
			const items = [
				createMockTFolder('folder1'),
				createMockTFile('root-file.md'),
			];

			const rootFolder = createMockTFolder('', items);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

			const result = await vaultTools.listNotes('');
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should list root when path is dot', async () => {
			const items = [
				createMockTFolder('folder1'),
				createMockTFile('root-file.md'),
			];

			const rootFolder = createMockTFolder('', items);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

			const result = await vaultTools.listNotes('.');
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			expect(parsed.length).toBe(2);
		});

		it('should only return direct children of root', async () => {
			const folder1 = createMockTFolder('folder1');
			const rootFile = createMockTFile('root-file.md');
			// Create nested file - this should NOT be included as it's in a subfolder
			const nestedFile = createMockTFile('folder1/nested.md');

			const items = [
				folder1,
				rootFile,
			];

			const rootFolder = createMockTFolder('', items);
			mockVault.getRoot = jest.fn().mockReturnValue(rootFolder);

			const result = await vaultTools.listNotes();
			const parsed = JSON.parse(result.content[0].text) as Array<FileMetadata | DirectoryMetadata>;

			// Should only have 2 items (folder1 and root-file.md)
			expect(parsed.length).toBe(2);
			expect(parsed.some(item => item.name === 'nested.md')).toBe(false);
		});
	});
});
