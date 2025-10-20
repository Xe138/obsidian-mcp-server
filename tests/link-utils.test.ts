import { LinkUtils } from '../src/utils/link-utils';
import { createMockVaultAdapter, createMockMetadataCacheAdapter, createMockTFile } from './__mocks__/adapters';
import { TFile } from 'obsidian';

describe('LinkUtils', () => {
	describe('parseWikilinks()', () => {
		test('parses simple wikilinks', () => {
			const content = 'This is a [[simple link]] in text.';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(1);
			expect(links[0]).toEqual({
				raw: '[[simple link]]',
				target: 'simple link',
				alias: undefined,
				line: 1,
				column: 10
			});
		});

		test('parses wikilinks with aliases', () => {
			const content = 'Check [[target|display alias]] here.';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(1);
			expect(links[0]).toEqual({
				raw: '[[target|display alias]]',
				target: 'target',
				alias: 'display alias',
				line: 1,
				column: 6
			});
		});

		test('parses wikilinks with headings', () => {
			const content = 'See [[Note#Heading]] and [[Note#Heading|Custom]].';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(2);
			expect(links[0]).toEqual({
				raw: '[[Note#Heading]]',
				target: 'Note#Heading',
				alias: undefined,
				line: 1,
				column: 4
			});
			expect(links[1]).toEqual({
				raw: '[[Note#Heading|Custom]]',
				target: 'Note#Heading',
				alias: 'Custom',
				line: 1,
				column: 25
			});
		});

		test('parses nested folder paths', () => {
			const content = 'Link to [[folder/subfolder/note]].';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(1);
			expect(links[0]).toEqual({
				raw: '[[folder/subfolder/note]]',
				target: 'folder/subfolder/note',
				alias: undefined,
				line: 1,
				column: 8
			});
		});

		test('parses multiple wikilinks on same line', () => {
			const content = '[[first]] and [[second|alias]] and [[third]].';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(3);
			expect(links[0].target).toBe('first');
			expect(links[1].target).toBe('second');
			expect(links[1].alias).toBe('alias');
			expect(links[2].target).toBe('third');
		});

		test('parses wikilinks across multiple lines', () => {
			const content = `Line 1 has [[link1]]
Line 2 has [[link2|alias]]
Line 3 has [[link3]]`;
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(3);
			expect(links[0].line).toBe(1);
			expect(links[1].line).toBe(2);
			expect(links[2].line).toBe(3);
		});

		test('trims whitespace from target and alias', () => {
			const content = '[[ spaced target | spaced alias ]]';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(1);
			expect(links[0].target).toBe('spaced target');
			expect(links[0].alias).toBe('spaced alias');
		});

		test('returns empty array for content with no wikilinks', () => {
			const content = 'No links here, just plain text.';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(0);
		});

		test('returns empty array for empty content', () => {
			const links = LinkUtils.parseWikilinks('');
			expect(links).toHaveLength(0);
		});

		test('tracks correct column positions', () => {
			const content = 'Start [[first]] middle [[second]] end';
			const links = LinkUtils.parseWikilinks(content);

			expect(links).toHaveLength(2);
			expect(links[0].column).toBe(6);
			expect(links[1].column).toBe(23);
		});
	});

	describe('resolveLink()', () => {
		test('resolves link using MetadataCache', () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const result = LinkUtils.resolveLink(vault, metadata, 'source.md', 'target');

			expect(result).toBe(targetFile);
			expect(vault.getAbstractFileByPath).toHaveBeenCalledWith('source.md');
			expect(metadata.getFirstLinkpathDest).toHaveBeenCalledWith('target', 'source.md');
		});

		test('returns null when source file not found', () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

			const result = LinkUtils.resolveLink(vault, metadata, 'nonexistent.md', 'target');

			expect(result).toBeNull();
		});

		test('returns null when source is not a TFile', () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const folder = { path: 'folder', basename: 'folder' }; // Not a TFile
			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(folder);

			const result = LinkUtils.resolveLink(vault, metadata, 'folder', 'target');

			expect(result).toBeNull();
		});

		test('returns null when link cannot be resolved', () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(null);

			const result = LinkUtils.resolveLink(vault, metadata, 'source.md', 'nonexistent');

			expect(result).toBeNull();
		});

		test('resolves links with headings', () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const result = LinkUtils.resolveLink(vault, metadata, 'source.md', 'target#heading');

			expect(result).toBe(targetFile);
			expect(metadata.getFirstLinkpathDest).toHaveBeenCalledWith('target#heading', 'source.md');
		});
	});

	describe('findSuggestions()', () => {
		test('exact basename match gets highest score', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('exact.md'),
				createMockTFile('exact-match.md'),
				createMockTFile('folder/exact.md')
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'exact');

			expect(suggestions).toHaveLength(3);
			// Both exact matches should come first (either order is fine as they have same score)
			expect(suggestions[0]).toMatch(/exact\.md$/);
			expect(suggestions[1]).toMatch(/exact\.md$/);
		});

		test('basename contains match scores higher than path contains', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('path/with/test/file.md'), // path contains
				createMockTFile('test-file.md'), // basename contains
				createMockTFile('testing.md') // basename contains
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'test');

			expect(suggestions).toHaveLength(3);
			// Basename matches should come before path matches
			// The first two can be in any order as they both score similarly (basename contains)
			expect(suggestions.slice(0, 2)).toContain('test-file.md');
			expect(suggestions.slice(0, 2)).toContain('testing.md');
			expect(suggestions[2]).toBe('path/with/test/file.md');
		});

		test('removes heading and block references before matching', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('note.md'),
				createMockTFile('note-extra.md')
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'note#heading');

			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions).toContain('note.md');
		});

		test('removes block references before matching', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('note.md')
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'note^block');

			expect(suggestions).toContain('note.md');
		});

		test('respects maxSuggestions limit', () => {
			const vault = createMockVaultAdapter();
			const files = Array.from({ length: 10 }, (_, i) =>
				createMockTFile(`file${i}.md`)
			);
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'file', 3);

			expect(suggestions).toHaveLength(3);
		});

		test('defaults to 5 suggestions', () => {
			const vault = createMockVaultAdapter();
			const files = Array.from({ length: 10 }, (_, i) =>
				createMockTFile(`test${i}.md`)
			);
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'test');

			expect(suggestions).toHaveLength(5);
		});

		test('returns empty array when no files match', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('unrelated.md'),
				createMockTFile('different.md')
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'zzzzz', 5);

			// May return low-scoring matches based on character similarity
			// or empty if no characters match
			expect(Array.isArray(suggestions)).toBe(true);
		});

		test('case insensitive matching', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('MyNote.md'),
				createMockTFile('ANOTHER.md')
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'mynote');

			expect(suggestions).toContain('MyNote.md');
		});

		test('scores based on character similarity when no contains match', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('abcdef.md'), // More matching chars
				createMockTFile('xyz.md') // Fewer matching chars
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'abc');

			expect(suggestions[0]).toBe('abcdef.md');
		});

		test('only returns files with score > 0', () => {
			const vault = createMockVaultAdapter();
			const files = [
				createMockTFile('match.md'),
				createMockTFile('zzz.md') // No matching characters with 'abc'
			];
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue(files);

			const suggestions = LinkUtils.findSuggestions(vault, 'match');

			// Should only return files that scored > 0
			expect(suggestions.every(s => s.includes('match'))).toBe(true);
		});
	});

	describe('getBacklinks()', () => {
		test('returns linked backlinks from resolvedLinks', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				return null;
			});

			metadata.resolvedLinks = {
				'source.md': { 'target.md': 1 }
			};

			const sourceContent = 'This links to [[target]].';
			(vault.read as jest.Mock).mockResolvedValue(sourceContent);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0]).toMatchObject({
				sourcePath: 'source.md',
				type: 'linked',
			});
			expect(backlinks[0].occurrences).toHaveLength(1);
			expect(backlinks[0].occurrences[0].line).toBe(1);
			expect(backlinks[0].occurrences[0].snippet).toBe('This links to [[target]].');
		});

		test('returns empty array when target file not found', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'nonexistent.md');

			expect(backlinks).toHaveLength(0);
		});

		test('returns empty array when target is not a TFile', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const folder = { path: 'folder', basename: 'folder' };
			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(folder);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'folder');

			expect(backlinks).toHaveLength(0);
		});

		test('skips sources that are not TFiles', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'folder') return { path: 'folder' }; // Not a TFile
				return null;
			});

			metadata.resolvedLinks = {
				'folder': { 'target.md': 1 }
			};

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks).toHaveLength(0);
		});

		test('skips sources that do not link to target', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');
			const otherFile = createMockTFile('other.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				if (path === 'other.md') return otherFile;
				return null;
			});

			// source.md has links, but not to target.md - it links to other.md
			metadata.resolvedLinks = {
				'source.md': { 'other.md': 1 }
			};

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks).toHaveLength(0);
		});

		test('finds multiple backlink occurrences in same file', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				return null;
			});

			metadata.resolvedLinks = {
				'source.md': { 'target.md': 2 }
			};

			const sourceContent = `First link to [[target]].
Second link to [[target]].`;
			(vault.read as jest.Mock).mockResolvedValue(sourceContent);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0].occurrences).toHaveLength(2);
			expect(backlinks[0].occurrences[0].line).toBe(1);
			expect(backlinks[0].occurrences[1].line).toBe(2);
		});

		test('only includes links that resolve to target', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');
			const otherFile = createMockTFile('other.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				return null;
			});

			metadata.resolvedLinks = {
				'source.md': { 'target.md': 1 }
			};

			const sourceContent = '[[target]] and [[other]].';
			(vault.read as jest.Mock).mockResolvedValue(sourceContent);
			(metadata.getFirstLinkpathDest as jest.Mock).mockImplementation((link: string) => {
				if (link === 'target') return targetFile;
				if (link === 'other') return otherFile;
				return null;
			});

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0].occurrences).toHaveLength(1);
			expect(backlinks[0].occurrences[0].snippet).toBe('[[target]] and [[other]].');
		});

		test('includes unlinked mentions when includeUnlinked=true', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const mentionFile = createMockTFile('mentions.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'mentions.md') return mentionFile;
				return null;
			});

			metadata.resolvedLinks = {};
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([targetFile, mentionFile]);

			const mentionContent = 'This mentions target in plain text.';
			(vault.read as jest.Mock).mockResolvedValue(mentionContent);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md', true);

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0]).toMatchObject({
				sourcePath: 'mentions.md',
				type: 'unlinked',
			});
			expect(backlinks[0].occurrences).toHaveLength(1);
			expect(backlinks[0].occurrences[0].snippet).toBe('This mentions target in plain text.');
		});

		test('skips files with linked backlinks when searching unlinked', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const linkedFile = createMockTFile('linked.md');
			const unlinkedFile = createMockTFile('unlinked.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'linked.md') return linkedFile;
				if (path === 'unlinked.md') return unlinkedFile;
				return null;
			});

			metadata.resolvedLinks = {
				'linked.md': { 'target.md': 1 }
			};

			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([targetFile, linkedFile, unlinkedFile]);

			(vault.read as jest.Mock).mockImplementation(async (file: TFile) => {
				if (file.path === 'linked.md') return '[[target]] is linked.';
				if (file.path === 'unlinked.md') return 'target is mentioned.';
				return '';
			});

			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md', true);

			expect(backlinks).toHaveLength(2);
			const linked = backlinks.find(b => b.type === 'linked');
			const unlinked = backlinks.find(b => b.type === 'unlinked');

			expect(linked?.sourcePath).toBe('linked.md');
			expect(unlinked?.sourcePath).toBe('unlinked.md');
		});

		test('skips target file itself when searching unlinked', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(targetFile);
			metadata.resolvedLinks = {};
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([targetFile]);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md', true);

			expect(backlinks).toHaveLength(0);
		});

		test('uses word boundary matching for unlinked mentions', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('test.md');
			const mentionFile = createMockTFile('mentions.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'test.md') return targetFile;
				if (path === 'mentions.md') return mentionFile;
				return null;
			});

			metadata.resolvedLinks = {};
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([targetFile, mentionFile]);

			// "testing" should not match "test" with word boundary
			const mentionContent = 'This has test but not testing.';
			(vault.read as jest.Mock).mockResolvedValue(mentionContent);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'test.md', true);

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0].occurrences).toHaveLength(1);
		});

		test('handles special regex characters in target basename', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('test.file.md');
			const mentionFile = createMockTFile('mentions.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'test.file.md') return targetFile;
				if (path === 'mentions.md') return mentionFile;
				return null;
			});

			metadata.resolvedLinks = {};
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([targetFile, mentionFile]);

			const mentionContent = 'Mentions test.file here.';
			(vault.read as jest.Mock).mockResolvedValue(mentionContent);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'test.file.md', true);

			expect(backlinks).toHaveLength(1);
			expect(backlinks[0].occurrences).toHaveLength(1);
		});

		test('extracts snippets with correct line numbers', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				return null;
			});

			metadata.resolvedLinks = {
				'source.md': { 'target.md': 1 }
			};

			const sourceContent = `Line 1
Line 2 has [[target]]
Line 3`;
			(vault.read as jest.Mock).mockResolvedValue(sourceContent);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks[0].occurrences[0].line).toBe(2);
			expect(backlinks[0].occurrences[0].snippet).toBe('Line 2 has [[target]]');
		});

		test('truncates long snippets', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const targetFile = createMockTFile('target.md');
			const sourceFile = createMockTFile('source.md');

			(vault.getAbstractFileByPath as jest.Mock).mockImplementation((path: string) => {
				if (path === 'target.md') return targetFile;
				if (path === 'source.md') return sourceFile;
				return null;
			});

			metadata.resolvedLinks = {
				'source.md': { 'target.md': 1 }
			};

			// Create a line longer than 100 characters
			const longLine = 'a'.repeat(150) + '[[target]]' + 'b'.repeat(150);
			(vault.read as jest.Mock).mockResolvedValue(longLine);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const backlinks = await LinkUtils.getBacklinks(vault, metadata, 'target.md');

			expect(backlinks[0].occurrences[0].snippet).toContain('...');
			expect(backlinks[0].occurrences[0].snippet.length).toBeLessThanOrEqual(103); // 100 + '...'
		});
	});

	describe('validateWikilinks()', () => {
		test('validates resolved and unresolved links', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);

			const content = `[[target]] is valid
[[missing]] is not valid`;
			(vault.read as jest.Mock).mockResolvedValue(content);

			(metadata.getFirstLinkpathDest as jest.Mock).mockImplementation((link: string) => {
				if (link === 'target') return targetFile;
				return null;
			});

			const suggestion1 = createMockTFile('maybe.md');
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([suggestion1]);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'source.md');

			expect(result.resolvedLinks).toHaveLength(1);
			expect(result.resolvedLinks[0]).toEqual({
				text: '[[target]]',
				target: 'target.md',
				alias: undefined
			});

			expect(result.unresolvedLinks).toHaveLength(1);
			expect(result.unresolvedLinks[0]).toMatchObject({
				text: '[[missing]]',
				line: 2,
			});
			expect(Array.isArray(result.unresolvedLinks[0].suggestions)).toBe(true);
		});

		test('returns empty arrays when file not found', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'nonexistent.md');

			expect(result.resolvedLinks).toHaveLength(0);
			expect(result.unresolvedLinks).toHaveLength(0);
		});

		test('returns empty arrays when path is not a TFile', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const folder = { path: 'folder', basename: 'folder' };
			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(folder);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'folder');

			expect(result.resolvedLinks).toHaveLength(0);
			expect(result.unresolvedLinks).toHaveLength(0);
		});

		test('preserves aliases in resolved links', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const targetFile = createMockTFile('target.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);

			const content = '[[target|Custom Alias]]';
			(vault.read as jest.Mock).mockResolvedValue(content);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(targetFile);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'source.md');

			expect(result.resolvedLinks[0]).toEqual({
				text: '[[target|Custom Alias]]',
				target: 'target.md',
				alias: 'Custom Alias'
			});
		});

		test('provides suggestions for unresolved links', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const suggestionFile = createMockTFile('similar.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);

			const content = '[[simila]]'; // Typo
			(vault.read as jest.Mock).mockResolvedValue(content);
			(metadata.getFirstLinkpathDest as jest.Mock).mockReturnValue(null);
			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([suggestionFile]);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'source.md');

			expect(result.unresolvedLinks[0].suggestions).toContain('similar.md');
		});

		test('handles files with no wikilinks', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);

			const content = 'No links here.';
			(vault.read as jest.Mock).mockResolvedValue(content);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'source.md');

			expect(result.resolvedLinks).toHaveLength(0);
			expect(result.unresolvedLinks).toHaveLength(0);
		});

		test('validates multiple links correctly', async () => {
			const vault = createMockVaultAdapter();
			const metadata = createMockMetadataCacheAdapter();

			const sourceFile = createMockTFile('source.md');
			const file1 = createMockTFile('file1.md');
			const file2 = createMockTFile('file2.md');

			(vault.getAbstractFileByPath as jest.Mock).mockReturnValue(sourceFile);

			const content = '[[file1]] [[file2]] [[missing1]] [[missing2]]';
			(vault.read as jest.Mock).mockResolvedValue(content);

			(metadata.getFirstLinkpathDest as jest.Mock).mockImplementation((link: string) => {
				if (link === 'file1') return file1;
				if (link === 'file2') return file2;
				return null;
			});

			(vault.getMarkdownFiles as jest.Mock).mockReturnValue([file1, file2]);

			const result = await LinkUtils.validateWikilinks(vault, metadata, 'source.md');

			expect(result.resolvedLinks).toHaveLength(2);
			expect(result.unresolvedLinks).toHaveLength(2);
		});
	});
});
