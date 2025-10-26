import { SearchUtils, SearchOptions } from '../src/utils/search-utils';
import { createMockVaultAdapter, createMockTFile } from './__mocks__/adapters';
import { IVaultAdapter } from '../src/adapters/interfaces';

describe('SearchUtils', () => {
	describe('search()', () => {
		describe('basic literal search', () => {
			it('should find matches in file content', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note1.md'),
						createMockTFile('note2.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce('This is a test note\nwith test content')
						.mockResolvedValueOnce('Another note without the word')
				});

				const options: SearchOptions = {
					query: 'test',
					isRegex: false,
					caseSensitive: false
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches.length).toBeGreaterThan(0);
				expect(result.stats.filesSearched).toBe(2);
				expect(result.stats.filesWithMatches).toBe(1);
				expect(result.stats.totalMatches).toBe(2); // 2 matches in first file
			});

			it('should escape special regex characters in literal search', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('Cost is $5.00 or [maybe] (more)')
				});

				const options: SearchOptions = {
					query: '$5.00',
					isRegex: false
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(1);
				expect(result.matches[0].snippet).toContain('$5.00');
			});
		});

		describe('regex search', () => {
			it('should support regex patterns', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('test123\ntest456\nabc789')
				});

				const options: SearchOptions = {
					query: 'test\\d+',
					isRegex: true
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(2);
				expect(result.matches[0].snippet).toContain('test123');
				expect(result.matches[1].snippet).toContain('test456');
			});

			it('should support case-sensitive regex search', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('Test TEST test')
				});

				const options: SearchOptions = {
					query: 'test',
					isRegex: true,
					caseSensitive: true
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(1);
				expect(result.matches[0].snippet).toBe('Test TEST test');
			});

			it('should throw error for invalid regex pattern', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([])
				});

				const options: SearchOptions = {
					query: '[invalid(',
					isRegex: true
				};

				await expect(SearchUtils.search(mockVault, options)).rejects.toThrow('Invalid regex pattern');
			});

			it('should handle zero-width regex matches without infinite loop', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('abc')
				});

				const options: SearchOptions = {
					query: '\\b', // Zero-width word boundary
					isRegex: true,
					maxResults: 10
				};

				const result = await SearchUtils.search(mockVault, options);

				// Should not hang, should return matches
				expect(result.matches.length).toBeGreaterThan(0);
				expect(result.matches.length).toBeLessThanOrEqual(10);
			});
		});

		describe('case sensitivity', () => {
			it('should be case insensitive by default', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('Test TEST tEsT')
				});

				const options: SearchOptions = {
					query: 'test',
					caseSensitive: false
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(3);
			});

			it('should support case sensitive search', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('Test TEST test')
				});

				const options: SearchOptions = {
					query: 'test',
					caseSensitive: true
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(1);
				expect(result.matches[0].snippet).toBe('Test TEST test');
			});
		});

		describe('folder filtering', () => {
			it('should filter files by folder path', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder/note1.md'),
						createMockTFile('folder/subfolder/note2.md'),
						createMockTFile('other/note3.md')
					]),
					read: jest.fn().mockResolvedValue('test content')
				});

				const options: SearchOptions = {
					query: 'test',
					folder: 'folder'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(2);
				expect(mockVault.read).toHaveBeenCalledTimes(2);
			});

			it('should handle folder path with trailing slash', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder/note1.md'),
						createMockTFile('other/note2.md')
					]),
					read: jest.fn().mockResolvedValue('test')
				});

				const options: SearchOptions = {
					query: 'test',
					folder: 'folder/'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(1);
			});

			it('should match exact folder path', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder.md'), // This has path equal to "folder"
						createMockTFile('folder/note.md')
					]),
					read: jest.fn().mockResolvedValue('test')
				});

				const options: SearchOptions = {
					query: 'test',
					folder: 'folder.md'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(1);
			});
		});

		describe('glob filtering', () => {
			it('should filter files by include patterns', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('test.md'),
						createMockTFile('note.md'),
						createMockTFile('testing.md')
					]),
					read: jest.fn().mockResolvedValue('content')
				});

				const options: SearchOptions = {
					query: 'content',
					includes: ['test*.md']
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(2); // test.md and testing.md
			});

			it('should filter files by exclude patterns', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md'),
						createMockTFile('draft.md'),
						createMockTFile('published.md')
					]),
					read: jest.fn().mockResolvedValue('content')
				});

				const options: SearchOptions = {
					query: 'content',
					excludes: ['draft*.md']
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(2); // note.md and published.md
			});

			it('should combine includes and excludes', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('docs/draft.md'),
						createMockTFile('docs/final.md'),
						createMockTFile('notes/test.md')
					]),
					read: jest.fn().mockResolvedValue('content')
				});

				const options: SearchOptions = {
					query: 'content',
					includes: ['docs/*.md'],
					excludes: ['**/draft*.md']
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(1); // Only docs/final.md
			});
		});

		describe('snippet extraction', () => {
			it('should return snippets by default', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('This is a test')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches[0].snippet).toBe('This is a test');
				expect(result.matches[0].matchRanges).toEqual([{ start: 10, end: 14 }]);
			});

			it('should truncate long lines to snippet length', async () => {
				const longLine = 'a'.repeat(200) + 'test' + 'b'.repeat(200);
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(longLine)
				});

				const options: SearchOptions = {
					query: 'test',
					snippetLength: 100
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches[0].snippet.length).toBe(100);
				expect(result.matches[0].snippet).toContain('test');
			});

			it('should center match in snippet when possible', async () => {
				const longLine = 'a'.repeat(100) + 'test' + 'b'.repeat(100);
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(longLine)
				});

				const options: SearchOptions = {
					query: 'test',
					snippetLength: 50
				};

				const result = await SearchUtils.search(mockVault, options);

				const snippet = result.matches[0].snippet;
				expect(snippet.length).toBe(50);
				expect(snippet).toContain('test');
				// Match should be roughly centered
				const matchStart = result.matches[0].matchRanges[0].start;
				expect(matchStart).toBeGreaterThan(15);
				expect(matchStart).toBeLessThan(35);
			});

			it('should adjust snippet when match is at end of line', async () => {
				const longLine = 'a'.repeat(200) + 'test';
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(longLine)
				});

				const options: SearchOptions = {
					query: 'test',
					snippetLength: 100
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches[0].snippet.length).toBe(100);
				expect(result.matches[0].snippet).toContain('test');
				// Should show end of line
				expect(result.matches[0].snippet.endsWith('test')).toBe(true);
			});

			it('should disable snippets when returnSnippets is false', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('This is a test line')
				});

				const options: SearchOptions = {
					query: 'test',
					returnSnippets: false
				};

				const result = await SearchUtils.search(mockVault, options);

				// Still returns the full line as snippet when returnSnippets is false
				expect(result.matches[0].snippet).toBe('This is a test line');
			});
		});

		describe('filename matching', () => {
			it('should search in filenames', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('test-note.md'),
						createMockTFile('another.md')
					]),
					read: jest.fn().mockResolvedValue('no match')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				const filenameMatches = result.matches.filter(m => m.line === 0);
				expect(filenameMatches).toHaveLength(1);
				expect(filenameMatches[0].path).toBe('test-note.md');
				expect(filenameMatches[0].snippet).toBe('test-note');
				expect(filenameMatches[0].column).toBe(1); // 1-indexed
			});

			it('should mark filename matches with line 0', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('testing.md')
					]),
					read: jest.fn().mockResolvedValue('content')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				const filenameMatch = result.matches.find(m => m.line === 0);
				expect(filenameMatch).toBeDefined();
				expect(filenameMatch!.line).toBe(0);
			});

			it('should handle zero-width matches in filenames', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('test-note.md')
					]),
					read: jest.fn().mockResolvedValue('content')
				});

				const options: SearchOptions = {
					query: '\\b',
					isRegex: true,
					maxResults: 5
				};

				const result = await SearchUtils.search(mockVault, options);

				const filenameMatches = result.matches.filter(m => m.line === 0);
				expect(filenameMatches.length).toBeGreaterThan(0);
			});
		});

		describe('maxResults limiting', () => {
			it('should limit total matches to maxResults', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note1.md'),
						createMockTFile('note2.md'),
						createMockTFile('note3.md')
					]),
					read: jest.fn().mockResolvedValue('test test test test test')
				});

				const options: SearchOptions = {
					query: 'test',
					maxResults: 5
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches.length).toBeLessThanOrEqual(5);
			});

			it('should stop searching files once maxResults is reached', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note1.md'),
						createMockTFile('note2.md'),
						createMockTFile('note3.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce('test test test')
						.mockResolvedValueOnce('test test test')
						.mockResolvedValueOnce('test test test')
				});

				const options: SearchOptions = {
					query: 'test',
					maxResults: 3
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches).toHaveLength(3);
				// Should have stopped after first file
				expect(mockVault.read).toHaveBeenCalledTimes(1);
			});

			it('should respect default maxResults of 100', async () => {
				const content = 'test '.repeat(200); // 200 matches
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const options: SearchOptions = {
					query: 'test'
					// maxResults defaults to 100
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.matches.length).toBeLessThanOrEqual(100);
			});

			it('should stop processing lines within file when maxMatches reached', async () => {
				// Create a file with many lines, each containing matches
				const lines = Array(50).fill('test test test').join('\n');
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(lines)
				});

				const options: SearchOptions = {
					query: 'test',
					maxResults: 5
				};

				const result = await SearchUtils.search(mockVault, options);

				// Should have stopped processing lines early
				expect(result.matches.length).toBe(5);
			});
		});

		describe('line and column tracking', () => {
			it('should track line numbers (1-indexed)', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('line 1\nline 2 test\nline 3')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				const contentMatch = result.matches.find(m => m.line > 0);
				expect(contentMatch!.line).toBe(2);
			});

			it('should track column positions (1-indexed)', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('prefix test suffix')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				const contentMatch = result.matches.find(m => m.line > 0);
				expect(contentMatch!.column).toBe(8); // 1-indexed, 'test' starts at position 7 (0-indexed)
			});

			it('should find multiple matches on same line', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('test and test and test')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				const contentMatches = result.matches.filter(m => m.line > 0);
				expect(contentMatches.length).toBe(3);
				expect(contentMatches[0].column).toBe(1);
				expect(contentMatches[1].column).toBe(10);
				expect(contentMatches[2].column).toBe(19);
			});
		});

		describe('error handling', () => {
			it('should skip files that cannot be read', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('good.md'),
						createMockTFile('bad.md'),
						createMockTFile('good2.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce('test content')
						.mockRejectedValueOnce(new Error('Permission denied'))
						.mockResolvedValueOnce('test content')
				});

	
				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(3);
				expect(result.stats.filesWithMatches).toBe(2); // Only good files

				});
		});

		describe('statistics', () => {
			it('should track files searched', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note1.md'),
						createMockTFile('note2.md'),
						createMockTFile('note3.md')
					]),
					read: jest.fn().mockResolvedValue('some content')
				});

				const options: SearchOptions = {
					query: 'nonexistent'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesSearched).toBe(3);
			});

			it('should track files with matches', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('match1.md'),
						createMockTFile('nomatch.md'),
						createMockTFile('match2.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce('test test')
						.mockResolvedValueOnce('nothing here')
						.mockResolvedValueOnce('test')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.filesWithMatches).toBe(2);
			});

			it('should track total matches', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue('test test test')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				expect(result.stats.totalMatches).toBe(3);
			});

			it('should count file only once even with multiple matches', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('test-file.md')
					]),
					read: jest.fn().mockResolvedValue('test test test')
				});

				const options: SearchOptions = {
					query: 'test'
				};

				const result = await SearchUtils.search(mockVault, options);

				// File has matches in filename AND content
				expect(result.stats.totalMatches).toBeGreaterThan(1);
				// But only counted once in filesWithMatches
				expect(result.stats.filesWithMatches).toBe(1);
			});
		});
	});

	describe('searchWaypoints()', () => {
		describe('finding waypoint blocks', () => {
			it('should find waypoint markers', async () => {
				const content = `# Folder
%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder/folder.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(1);
				expect(result[0].path).toBe('folder/folder.md');
				expect(result[0].line).toBe(2); // Line where waypoint starts (1-indexed)
			});

			it('should extract waypoint content', async () => {
				const content = `# Folder
%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].content).toBe('- [[Note 1]]\n- [[Note 2]]');
			});

			it('should extract links from waypoint content', async () => {
				const content = `%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
- [[Folder/Subfolder]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].links).toEqual([
					'Note 1',
					'Note 2',
					'Folder/Subfolder'
				]);
			});

			it('should track waypoint range', async () => {
				const content = `Line 1
Line 2
%% Begin Waypoint %%
Content
More content
%% End Waypoint %%
Line 7`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].waypointRange).toEqual({
					start: 3, // Line after "Begin Waypoint" (1-indexed)
					end: 6    // Line of "End Waypoint" (1-indexed)
				});
			});

			it('should find multiple waypoints in same file', async () => {
				const content = `%% Begin Waypoint %%
- [[A]]
%% End Waypoint %%

Other content

%% Begin Waypoint %%
- [[B]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(2);
				expect(result[0].links).toEqual(['A']);
				expect(result[1].links).toEqual(['B']);
			});

			it('should handle empty waypoints', async () => {
				const content = `%% Begin Waypoint %%
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(1);
				expect(result[0].content).toBe('');
				expect(result[0].links).toEqual([]);
			});

			it('should ignore unclosed waypoints', async () => {
				const content = `%% Begin Waypoint %%
- [[Note]]
No closing marker`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(0);
			});

			it('should handle waypoint without begin marker', async () => {
				const content = `Some content
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(0);
			});
		});

		describe('folder filtering', () => {
			it('should filter by folder path', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder1/note.md'),
						createMockTFile('folder2/note.md')
					]),
					read: jest.fn().mockResolvedValue(`%% Begin Waypoint %%
- [[Test]]
%% End Waypoint %%`)
				});

				const result = await SearchUtils.searchWaypoints(mockVault, 'folder1');

				expect(result).toHaveLength(1);
				expect(result[0].path).toBe('folder1/note.md');
			});

			it('should handle folder path with trailing slash', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('folder/note.md'),
						createMockTFile('other/note.md')
					]),
					read: jest.fn().mockResolvedValue(`%% Begin Waypoint %%
- [[Test]]
%% End Waypoint %%`)
				});

				const result = await SearchUtils.searchWaypoints(mockVault, 'folder/');

				expect(result).toHaveLength(1);
				expect(result[0].path).toBe('folder/note.md');
			});

			it('should search all files when no folder specified', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('a/note.md'),
						createMockTFile('b/note.md'),
						createMockTFile('c/note.md')
					]),
					read: jest.fn().mockResolvedValue(`%% Begin Waypoint %%
[[Test]]
%% End Waypoint %%`)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(3);
			});
		});

		describe('link extraction', () => {
			it('should extract multiple links', async () => {
				const content = `%% Begin Waypoint %%
- [[Link 1]]
- [[Link 2]]
- [[Link 3]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].links).toEqual(['Link 1', 'Link 2', 'Link 3']);
			});

			it('should handle links without list markers', async () => {
				const content = `%% Begin Waypoint %%
[[Link 1]] [[Link 2]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].links).toEqual(['Link 1', 'Link 2']);
			});

			it('should handle links with aliases', async () => {
				const content = `%% Begin Waypoint %%
- [[Note|Alias]]
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				// Should extract the full link text including alias
				expect(result[0].links).toEqual(['Note|Alias']);
			});

			it('should handle waypoints with no links', async () => {
				const content = `%% Begin Waypoint %%
Just some text
%% End Waypoint %%`;

				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note.md')
					]),
					read: jest.fn().mockResolvedValue(content)
				});

				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result[0].links).toEqual([]);
			});
		});

		describe('error handling', () => {
			it('should skip files that cannot be read', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('good.md'),
						createMockTFile('bad.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce(`%% Begin Waypoint %%
[[Test]]
%% End Waypoint %%`)
						.mockRejectedValueOnce(new Error('Read error'))
				});

	
				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(1);
				expect(result[0].path).toBe('good.md');

				});

			it('should continue searching after encountering errors', async () => {
				const mockVault = createMockVaultAdapter({
					getMarkdownFiles: jest.fn().mockReturnValue([
						createMockTFile('note1.md'),
						createMockTFile('note2.md'),
						createMockTFile('note3.md')
					]),
					read: jest.fn()
						.mockResolvedValueOnce(`%% Begin Waypoint %%
[[A]]
%% End Waypoint %%`)
						.mockRejectedValueOnce(new Error('Error'))
						.mockResolvedValueOnce(`%% Begin Waypoint %%
[[B]]
%% End Waypoint %%`)
				});

	
				const result = await SearchUtils.searchWaypoints(mockVault);

				expect(result).toHaveLength(2);
				expect(result[0].links).toEqual(['A']);
				expect(result[1].links).toEqual(['B']);

				});
		});
	});
});
