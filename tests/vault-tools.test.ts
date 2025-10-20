import { VaultTools } from '../src/tools/vault-tools';
import { createMockVaultAdapter, createMockMetadataCacheAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';
import { TFile, TFolder, App } from 'obsidian';

describe('VaultTools', () => {
	let vaultTools: VaultTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockMetadata: ReturnType<typeof createMockMetadataCacheAdapter>;
	let mockApp: App;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockMetadata = createMockMetadataCacheAdapter();
		mockApp = {} as App; // Minimal mock for methods not yet migrated

		vaultTools = new VaultTools(mockVault, mockMetadata, mockApp);
	});

	describe('listNotes', () => {
		it('should list files and folders in root directory', async () => {
			const mockFiles = [
				createMockTFile('note1.md'),
				createMockTFile('note2.md')
			];
			const mockFolders = [
				createMockTFolder('folder1')
			];
			const mockRoot = createMockTFolder('', [...mockFiles, ...mockFolders]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.listNotes();

			expect(result.isError).toBeUndefined();
			expect(mockVault.getRoot).toHaveBeenCalled();

			const parsed = JSON.parse(result.content[0].text);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed.length).toBe(3);

			// Directories should come first
			expect(parsed[0].kind).toBe('directory');
			expect(parsed[0].name).toBe('folder1');

			// Then files
			expect(parsed[1].kind).toBe('file');
			expect(parsed[2].kind).toBe('file');
		});

		it('should list files in a specific folder', async () => {
			const mockFiles = [
				createMockTFile('folder1/file1.md'),
				createMockTFile('folder1/file2.md')
			];
			const mockFolder = createMockTFolder('folder1', mockFiles);

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFolder);

			const result = await vaultTools.listNotes('folder1');

			expect(result.isError).toBeUndefined();
			expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('folder1');

			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.length).toBe(2);
		});

		it('should return error if folder not found', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.listNotes('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return error if path is not a folder', async () => {
			const mockFile = createMockTFile('note.md');
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

			const result = await vaultTools.listNotes('note.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a folder');
		});

		it('should skip vault root itself in children', async () => {
			const rootChild = createMockTFolder('');
			const normalFolder = createMockTFolder('folder1');
			const mockRoot = createMockTFolder('', [rootChild, normalFolder]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.listNotes();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should only have folder1, not the root child
			expect(parsed.length).toBe(1);
			expect(parsed[0].name).toBe('folder1');
		});

		it('should handle empty directory', async () => {
			const mockRoot = createMockTFolder('', []);
			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.listNotes();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.length).toBe(0);
		});

		it('should normalize path variants to root', async () => {
			const mockRoot = createMockTFolder('', []);
			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			// Test empty string
			await vaultTools.listNotes('');
			expect(mockVault.getRoot).toHaveBeenCalled();
			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			// Test dot
			await vaultTools.listNotes('.');
			expect(mockVault.getRoot).toHaveBeenCalled();
		});
	});

	describe('stat', () => {
		it('should return file statistics', async () => {
			const mockFile = createMockTFile('test.md', {
				ctime: 1000,
				mtime: 2000,
				size: 500
			});

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

			const result = await vaultTools.stat('test.md');

			expect(result.isError).toBeUndefined();
			expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('test.md');

			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(true);
			expect(parsed.kind).toBe('file');
			expect(parsed.metadata.size).toBe(500);
			expect(parsed.metadata.modified).toBe(2000);
			expect(parsed.metadata.created).toBe(1000);
		});

		it('should return folder statistics', async () => {
			const mockFolder = createMockTFolder('folder1', [
				createMockTFile('folder1/file1.md'),
				createMockTFile('folder1/file2.md')
			]);

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFolder);

			const result = await vaultTools.stat('folder1');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(true);
			expect(parsed.kind).toBe('directory');
			expect(parsed.metadata.childrenCount).toBe(2);
		});

		it('should return exists: false if path not found', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.stat('nonexistent.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(false);
		});

		it('should return error for invalid path', async () => {
			const result = await vaultTools.stat('../invalid/path');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});
	});

	describe('exists', () => {
		it('should return true for existing file', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

			const result = await vaultTools.exists('test.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(true);
			expect(parsed.kind).toBe('file');
		});

		it('should return true for existing folder', async () => {
			const mockFolder = createMockTFolder('folder1');
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFolder);

			const result = await vaultTools.exists('folder1');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(true);
			expect(parsed.kind).toBe('directory');
		});

		it('should return false if file does not exist', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.exists('nonexistent.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.exists).toBe(false);
		});

		it('should return error for invalid path', async () => {
			const result = await vaultTools.exists('../invalid');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});
	});

	describe('list (enhanced)', () => {
		it('should list items non-recursively by default', async () => {
			const mockFiles = [
				createMockTFile('file1.md'),
				createMockTFile('file2.md')
			];
			const mockFolder = createMockTFolder('subfolder', [
				createMockTFile('subfolder/nested.md')
			]);
			const mockRoot = createMockTFolder('', [...mockFiles, mockFolder]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ recursive: false });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should include 2 files and 1 folder, but not the nested file
			expect(parsed.items.length).toBe(3);
			expect(parsed.items.some((item: any) => item.path === 'subfolder/nested.md')).toBe(false);
		});

		it('should list items recursively when requested', async () => {
			const nestedFile = createMockTFile('subfolder/nested.md');
			const mockFolder = createMockTFolder('subfolder', [nestedFile]);
			const mockRoot = createMockTFolder('', [mockFolder]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ recursive: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should include folder and nested file
			expect(parsed.items.length).toBe(2);
			expect(parsed.items.some((item: any) => item.path === 'subfolder/nested.md')).toBe(true);
		});

		it('should filter by "files" only', async () => {
			const mockFile = createMockTFile('file.md');
			const mockFolder = createMockTFolder('folder');
			const mockRoot = createMockTFolder('', [mockFile, mockFolder]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ only: 'files' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items.length).toBe(1);
			expect(parsed.items[0].kind).toBe('file');
		});

		it('should filter by "directories" only', async () => {
			const mockFile = createMockTFile('file.md');
			const mockFolder = createMockTFolder('folder');
			const mockRoot = createMockTFolder('', [mockFile, mockFolder]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ only: 'directories' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items.length).toBe(1);
			expect(parsed.items[0].kind).toBe('directory');
		});

		it('should apply pagination with limit', async () => {
			const mockFiles = [
				createMockTFile('file1.md'),
				createMockTFile('file2.md'),
				createMockTFile('file3.md')
			];
			const mockRoot = createMockTFolder('', mockFiles);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ limit: 2 });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items.length).toBe(2);
			expect(parsed.hasMore).toBe(true);
			expect(parsed.nextCursor).toBeDefined();
			expect(parsed.totalCount).toBe(3);
		});

		it('should handle cursor-based pagination', async () => {
			const mockFiles = [
				createMockTFile('file1.md'),
				createMockTFile('file2.md'),
				createMockTFile('file3.md')
			];
			const mockRoot = createMockTFolder('', mockFiles);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ limit: 2, cursor: 'file1.md' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should start after file1.md
			expect(parsed.items[0].path).toBe('file2.md');
		});

		it('should include frontmatter summary when requested', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);
			const mockCache = {
				frontmatter: {
					title: 'Test Note',
					tags: ['tag1', 'tag2']
				}
			};

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);
			mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items[0].frontmatterSummary).toBeDefined();
			expect(parsed.items[0].frontmatterSummary.title).toBe('Test Note');
			expect(parsed.items[0].frontmatterSummary.tags).toEqual(['tag1', 'tag2']);
		});

		it('should handle string tags and convert to array', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);
			const mockCache = {
				frontmatter: {
					tags: 'single-tag'
				}
			};

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);
			mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items[0].frontmatterSummary.tags).toEqual(['single-tag']);
		});

		it('should handle string aliases and convert to array', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);
			const mockCache = {
				frontmatter: {
					aliases: 'single-alias'
				}
			};

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);
			mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items[0].frontmatterSummary.aliases).toEqual(['single-alias']);
		});

		it('should handle frontmatter extraction error gracefully', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);
			mockMetadata.getFileCache = jest.fn().mockImplementation(() => {
				throw new Error('Cache error');
			});

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			// Should still succeed without frontmatter
			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items[0].frontmatterSummary).toBeUndefined();
		});

		it('should include custom frontmatter fields', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);
			const mockCache = {
				frontmatter: {
					title: 'Test',
					customField: 'custom value',
					anotherField: 123
				}
			};

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);
			mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items[0].frontmatterSummary.customField).toBe('custom value');
			expect(parsed.items[0].frontmatterSummary.anotherField).toBe(123);
		});

		it('should not include frontmatter for non-markdown files', async () => {
			const mockFile = Object.create(TFile.prototype);
			Object.assign(mockFile, {
				path: 'image.png',
				basename: 'image',
				extension: 'png',
				name: 'image.png',
				stat: { ctime: Date.now(), mtime: Date.now(), size: 100 },
				vault: {} as any,
				parent: null
			});
			const mockRoot = createMockTFolder('', [mockFile]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ withFrontmatterSummary: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.items.length).toBe(1);
			expect(parsed.items[0].frontmatterSummary).toBeUndefined();
		});
	});

	describe('getBacklinks', () => {
		it('should return error if file not found', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.getBacklinks('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should return backlinks with snippets when includeSnippets is true', async () => {
			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(targetFile)
				.mockReturnValue(sourceFile);
			mockVault.read = jest.fn().mockResolvedValue('This links to [[target]]');
			mockMetadata.resolvedLinks = {
				'source.md': {
					'target.md': 1
				}
			};
			mockMetadata.getFirstLinkpathDest = jest.fn().mockReturnValue(targetFile);

			const result = await vaultTools.getBacklinks('target.md', false, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.backlinks).toBeDefined();
			expect(parsed.backlinks.length).toBeGreaterThan(0);
			expect(parsed.backlinks[0].occurrences[0].snippet).toBeTruthy();
		});

		it('should return backlinks without snippets when includeSnippets is false', async () => {
			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(targetFile)
				.mockReturnValue(sourceFile);
			mockVault.read = jest.fn().mockResolvedValue('This links to [[target]]');
			mockMetadata.resolvedLinks = {
				'source.md': {
					'target.md': 1
				}
			};
			mockMetadata.getFirstLinkpathDest = jest.fn().mockReturnValue(targetFile);

			const result = await vaultTools.getBacklinks('target.md', false, false);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.backlinks).toBeDefined();
			expect(parsed.backlinks.length).toBeGreaterThan(0);
			expect(parsed.backlinks[0].occurrences[0].snippet).toBe('');
		});

		it('should handle read errors gracefully', async () => {
			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(targetFile)
				.mockReturnValue(sourceFile);
			mockVault.read = jest.fn().mockRejectedValue(new Error('Permission denied'));
			mockMetadata.resolvedLinks = {
				'source.md': {
					'target.md': 1
				}
			};

			const result = await vaultTools.getBacklinks('target.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('error');
		});
	});

	describe('validateWikilinks', () => {
		it('should return error if file not found', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.validateWikilinks('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should handle read errors gracefully', async () => {
			const mockFile = createMockTFile('test.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockRejectedValue(new Error('Read error'));

			const result = await vaultTools.validateWikilinks('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('error');
		});

		it('should validate wikilinks successfully', async () => {
			const mockFile = createMockTFile('test.md');
			const linkedFile = createMockTFile('linked.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
			mockVault.read = jest.fn().mockResolvedValue('This is a [[linked]] note and a [[broken]] link.');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([linkedFile]);
			mockMetadata.getFirstLinkpathDest = jest.fn()
				.mockReturnValueOnce(linkedFile)
				.mockReturnValueOnce(null);

			const result = await vaultTools.validateWikilinks('test.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.path).toBe('test.md');
			expect(parsed.totalLinks).toBe(2);
			expect(parsed.resolvedLinks.length).toBe(1);
			expect(parsed.unresolvedLinks.length).toBe(1);
		});
	});
});