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

		it('should handle invalid path', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.validateWikilinks('../invalid');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});
	});

	describe('resolveWikilink', () => {
		it('should return error if source file not found', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.resolveWikilink('nonexistent.md', 'target');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should resolve wikilink successfully', async () => {
			const sourceFile = createMockTFile('source.md');
			const targetFile = createMockTFile('target.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(sourceFile);
			mockMetadata.getFirstLinkpathDest = jest.fn().mockReturnValue(targetFile);

			const result = await vaultTools.resolveWikilink('source.md', 'target');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.resolved).toBe(true);
			expect(parsed.targetPath).toBe('target.md');
			expect(parsed.suggestions).toBeUndefined();
		});

		it('should provide suggestions for unresolved links', async () => {
			const sourceFile = createMockTFile('source.md');
			const similarFile = createMockTFile('target-similar.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(sourceFile);
			mockMetadata.getFirstLinkpathDest = jest.fn().mockReturnValue(null);
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([similarFile]);

			const result = await vaultTools.resolveWikilink('source.md', 'target');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.resolved).toBe(false);
			expect(parsed.suggestions).toBeDefined();
			expect(Array.isArray(parsed.suggestions)).toBe(true);
		});

		it('should handle errors gracefully', async () => {
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(sourceFile);
			mockMetadata.getFirstLinkpathDest = jest.fn().mockImplementation(() => {
				throw new Error('Cache error');
			});

			const result = await vaultTools.resolveWikilink('source.md', 'target');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('error');
		});

		it('should handle invalid source path', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.resolveWikilink('../invalid', 'target');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});
	});

	describe('getVaultInfo', () => {
		it('should return vault info with total notes and size', async () => {
			const mockFiles = [
				createMockTFile('note1.md', { size: 100, ctime: 1000, mtime: 2000 }),
				createMockTFile('note2.md', { size: 200, ctime: 1000, mtime: 2000 })
			];

			mockVault.getMarkdownFiles = jest.fn().mockReturnValue(mockFiles);
			mockVault.stat = jest.fn()
				.mockReturnValueOnce({ size: 100, ctime: 1000, mtime: 2000 })
				.mockReturnValueOnce({ size: 200, ctime: 1000, mtime: 2000 });

			const result = await vaultTools.getVaultInfo();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalNotes).toBe(2);
			expect(parsed.totalSize).toBe(300);
			expect(parsed.sizeFormatted).toBe('300 Bytes');
		});

		it('should handle empty vault', async () => {
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([]);

			const result = await vaultTools.getVaultInfo();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalNotes).toBe(0);
			expect(parsed.totalSize).toBe(0);
			expect(parsed.sizeFormatted).toBe('0 Bytes');
		});

		it('should handle files with missing stat info', async () => {
			const mockFiles = [
				createMockTFile('note1.md'),
				createMockTFile('note2.md')
			];

			mockVault.getMarkdownFiles = jest.fn().mockReturnValue(mockFiles);
			mockVault.stat = jest.fn()
				.mockReturnValueOnce(null)
				.mockReturnValueOnce({ size: 100, ctime: 1000, mtime: 2000 });

			const result = await vaultTools.getVaultInfo();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalNotes).toBe(2);
			expect(parsed.totalSize).toBe(100); // Only counts the file with valid stat
		});

		it('should handle errors gracefully', async () => {
			mockVault.getMarkdownFiles = jest.fn().mockImplementation(() => {
				throw new Error('Vault access error');
			});

			const result = await vaultTools.getVaultInfo();

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Get vault info error');
		});

		it('should format large file sizes correctly', async () => {
			const mockFiles = [
				createMockTFile('large.md', { size: 1024 * 1024 * 5, ctime: 1000, mtime: 2000 })
			];

			mockVault.getMarkdownFiles = jest.fn().mockReturnValue(mockFiles);
			mockVault.stat = jest.fn().mockReturnValue({ size: 1024 * 1024 * 5, ctime: 1000, mtime: 2000 });

			const result = await vaultTools.getVaultInfo();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.sizeFormatted).toContain('MB');
		});
	});

	describe('search', () => {
		it('should search for literal text', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue('Hello world\nThis is a test');

			const result = await vaultTools.search({ query: 'test' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalMatches).toBeGreaterThan(0);
			expect(parsed.matches[0].path).toBe('test.md');
		});

		it('should search with regex pattern', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue('test123\ntest456');

			const result = await vaultTools.search({ query: 'test\\d+', isRegex: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.isRegex).toBe(true);
			expect(parsed.totalMatches).toBeGreaterThan(0);
		});

		it('should handle invalid regex pattern', async () => {
			const result = await vaultTools.search({ query: '[invalid(regex', isRegex: true });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid regex pattern');
		});

		it('should filter by folder', async () => {
			const mockFile1 = createMockTFile('folder/test.md');
			const mockFile2 = createMockTFile('other/test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile1, mockFile2]);
			mockVault.read = jest.fn().mockResolvedValue('test content');

			const result = await vaultTools.search({ query: 'test', folder: 'folder' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.filesSearched).toBe(1);
		});

		it('should respect maxResults limit', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue('test test test test test');

			const result = await vaultTools.search({ query: 'test', maxResults: 2 });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalMatches).toBeLessThanOrEqual(2);
		});

		it('should handle file read errors gracefully', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockRejectedValue(new Error('Read error'));

			const result = await vaultTools.search({ query: 'test' });

			// Should not throw, just skip the file
			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalMatches).toBe(0);
		});

		it('should handle case sensitive search', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue('Test test TEST');

			const result = await vaultTools.search({ query: 'test', caseSensitive: true });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should only match lowercase 'test'
			expect(parsed.totalMatches).toBe(1);
		});

		it('should extract snippets correctly', async () => {
			const mockFile = createMockTFile('test.md');
			const longLine = 'a'.repeat(200) + 'target' + 'b'.repeat(200);
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue(longLine);

			const result = await vaultTools.search({ query: 'target', returnSnippets: true, snippetLength: 100 });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.matches[0].snippet.length).toBeLessThanOrEqual(100);
		});

		it('should handle zero-width regex matches', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([mockFile]);
			mockVault.read = jest.fn().mockResolvedValue('test');

			const result = await vaultTools.search({ query: '(?=test)', isRegex: true, maxResults: 10 });

			expect(result.isError).toBeUndefined();
			// Should handle zero-width matches without infinite loop
		});

		it('should handle general search errors', async () => {
			mockVault.getMarkdownFiles = jest.fn().mockImplementation(() => {
				throw new Error('Vault error');
			});

			const result = await vaultTools.search({ query: 'test' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Search error');
		});
	});

	describe('searchWaypoints', () => {
		it('should search for waypoints in vault', async () => {
			const mockFile = createMockTFile('test.md');
			mockApp.vault = {
				getMarkdownFiles: jest.fn().mockReturnValue([mockFile])
			} as any;

			// Mock SearchUtils
			const SearchUtils = require('../src/utils/search-utils').SearchUtils;
			SearchUtils.searchWaypoints = jest.fn().mockResolvedValue([
				{ path: 'test.md', waypointRange: { start: 0, end: 10 } }
			]);

			const result = await vaultTools.searchWaypoints();

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.totalWaypoints).toBeDefined();
			expect(parsed.filesSearched).toBeDefined();
		});

		it('should filter waypoints by folder', async () => {
			const mockFile1 = createMockTFile('folder1/test.md');
			const mockFile2 = createMockTFile('folder2/test.md');
			mockApp.vault = {
				getMarkdownFiles: jest.fn().mockReturnValue([mockFile1, mockFile2])
			} as any;

			const SearchUtils = require('../src/utils/search-utils').SearchUtils;
			SearchUtils.searchWaypoints = jest.fn().mockResolvedValue([]);

			const result = await vaultTools.searchWaypoints('folder1');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.filesSearched).toBe(1);
		});

		it('should handle search errors', async () => {
			const SearchUtils = require('../src/utils/search-utils').SearchUtils;
			SearchUtils.searchWaypoints = jest.fn().mockRejectedValue(new Error('Search failed'));

			const result = await vaultTools.searchWaypoints();

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Waypoint search error');
		});
	});

	describe('getFolderWaypoint', () => {
		it('should return error if file not found', async () => {
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			PathUtils.resolveFile = jest.fn().mockReturnValue(null);

			const result = await vaultTools.getFolderWaypoint('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should extract waypoint from file', async () => {
			const mockFile = createMockTFile('test.md');
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			const WaypointUtils = require('../src/utils/waypoint-utils').WaypointUtils;

			PathUtils.resolveFile = jest.fn().mockReturnValue(mockFile);
			mockApp.vault = {
				read: jest.fn().mockResolvedValue('%% Begin Waypoint %%\nContent\n%% End Waypoint %%')
			} as any;
			WaypointUtils.extractWaypointBlock = jest.fn().mockReturnValue({
				hasWaypoint: true,
				waypointRange: { start: 0, end: 10 },
				links: ['link1'],
				rawContent: 'Content'
			});

			const result = await vaultTools.getFolderWaypoint('test.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.hasWaypoint).toBe(true);
		});

		it('should handle errors', async () => {
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			PathUtils.resolveFile = jest.fn().mockImplementation(() => {
				throw new Error('File error');
			});

			const result = await vaultTools.getFolderWaypoint('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Get folder waypoint error');
		});
	});

	describe('isFolderNote', () => {
		it('should return error if file not found', async () => {
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			PathUtils.resolveFile = jest.fn().mockReturnValue(null);

			const result = await vaultTools.isFolderNote('nonexistent.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should detect folder notes', async () => {
			const mockFile = createMockTFile('test.md');
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			const WaypointUtils = require('../src/utils/waypoint-utils').WaypointUtils;

			PathUtils.resolveFile = jest.fn().mockReturnValue(mockFile);
			WaypointUtils.isFolderNote = jest.fn().mockResolvedValue({
				isFolderNote: true,
				reason: 'basename_match',
				folderPath: 'test'
			});

			const result = await vaultTools.isFolderNote('test.md');

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.isFolderNote).toBe(true);
		});

		it('should handle errors', async () => {
			const PathUtils = require('../src/utils/path-utils').PathUtils;
			PathUtils.resolveFile = jest.fn().mockImplementation(() => {
				throw new Error('File error');
			});

			const result = await vaultTools.isFolderNote('test.md');

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Is folder note error');
		});
	});

	describe('getBacklinks - unlinked mentions', () => {
		it('should find unlinked mentions', async () => {
			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(targetFile)
				.mockReturnValue(sourceFile);
			mockVault.read = jest.fn().mockResolvedValue('This mentions target in text');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([sourceFile]);
			mockMetadata.resolvedLinks = {};

			const result = await vaultTools.getBacklinks('target.md', true, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.backlinks.some((b: any) => b.type === 'unlinked')).toBe(true);
		});

		it('should not return unlinked mentions when includeUnlinked is false', async () => {
			const targetFile = createMockTFile('target.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(targetFile);
			mockMetadata.resolvedLinks = {};

			const result = await vaultTools.getBacklinks('target.md', false, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.backlinks.every((b: any) => b.type !== 'unlinked')).toBe(true);
		});

		it('should skip files that already have linked backlinks', async () => {
			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(targetFile)
				.mockReturnValue(sourceFile);
			mockVault.read = jest.fn().mockResolvedValue('This links to [[target]] and mentions target');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([sourceFile]);
			mockMetadata.resolvedLinks = {
				'source.md': { 'target.md': 1 }
			};
			mockMetadata.getFirstLinkpathDest = jest.fn().mockReturnValue(targetFile);

			const result = await vaultTools.getBacklinks('target.md', true, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should have linked mention but not duplicate unlinked
			expect(parsed.backlinks.filter((b: any) => b.sourcePath === 'source.md').length).toBe(1);
		});

		it('should skip target file itself in unlinked mentions', async () => {
			const targetFile = createMockTFile('target.md');

			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(targetFile);
			mockVault.read = jest.fn().mockResolvedValue('This file mentions target');
			mockVault.getMarkdownFiles = jest.fn().mockReturnValue([targetFile]);
			mockMetadata.resolvedLinks = {};

			const result = await vaultTools.getBacklinks('target.md', true, true);

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.backlinks.every((b: any) => b.sourcePath !== 'target.md')).toBe(true);
		});
	});

	describe('list - edge cases', () => {
		it('should handle invalid path in list', async () => {
			const result = await vaultTools.list({ path: '../invalid' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid path');
		});

		it('should handle non-existent folder', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await vaultTools.list({ path: 'nonexistent' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not found');
		});

		it('should handle path pointing to file instead of folder', async () => {
			const mockFile = createMockTFile('test.md');
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

			const result = await vaultTools.list({ path: 'test.md' });

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('not a folder');
		});

		it('should handle cursor not found in pagination', async () => {
			const mockFile = createMockTFile('test.md');
			const mockRoot = createMockTFolder('', [mockFile]);

			mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

			const result = await vaultTools.list({ cursor: 'nonexistent.md' });

			expect(result.isError).toBeUndefined();
			const parsed = JSON.parse(result.content[0].text);
			// Should return from beginning when cursor not found
			expect(parsed.items.length).toBeGreaterThan(0);
		});
	});
});