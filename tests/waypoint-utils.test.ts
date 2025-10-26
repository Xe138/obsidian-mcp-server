import { WaypointUtils, WaypointBlock, FolderNoteInfo } from '../src/utils/waypoint-utils';
import { createMockVaultAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';
import { IVaultAdapter } from '../src/adapters/interfaces';
import { TFile } from 'obsidian';

describe('WaypointUtils', () => {
	describe('extractWaypointBlock()', () => {
		test('extracts valid waypoint with links', () => {
			const content = `# Folder Index
%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
- [[Subfolder/Note 3]]
%% End Waypoint %%

More content`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.waypointRange).toEqual({ start: 2, end: 6 });
			expect(result.links).toEqual(['Note 1', 'Note 2', 'Subfolder/Note 3']);
			expect(result.rawContent).toBe('- [[Note 1]]\n- [[Note 2]]\n- [[Subfolder/Note 3]]');
		});

		test('extracts waypoint with no links', () => {
			const content = `%% Begin Waypoint %%
Empty waypoint
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.waypointRange).toEqual({ start: 1, end: 3 });
			expect(result.links).toEqual([]);
			expect(result.rawContent).toBe('Empty waypoint');
		});

		test('extracts waypoint with links with aliases', () => {
			const content = `%% Begin Waypoint %%
- [[Note|Alias]]
- [[Another Note#Section|Custom Text]]
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.links).toEqual(['Note|Alias', 'Another Note#Section|Custom Text']);
		});

		test('extracts empty waypoint', () => {
			const content = `%% Begin Waypoint %%
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.waypointRange).toEqual({ start: 1, end: 2 });
			expect(result.links).toEqual([]);
			expect(result.rawContent).toBe('');
		});

		test('returns false for content without waypoint', () => {
			const content = `# Regular Note
Just some content
- No waypoint here`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(false);
			expect(result.waypointRange).toBeUndefined();
			expect(result.links).toBeUndefined();
			expect(result.rawContent).toBeUndefined();
		});

		test('returns false for unclosed waypoint', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
Missing end marker`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(false);
		});

		test('handles waypoint with multiple links on same line', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]], [[Note 2]], [[Note 3]]
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.links).toEqual(['Note 1', 'Note 2', 'Note 3']);
		});

		test('handles waypoint at start of file', () => {
			const content = `%% Begin Waypoint %%
- [[Link]]
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.waypointRange).toEqual({ start: 1, end: 3 });
		});

		test('handles waypoint at end of file', () => {
			const content = `Some content
%% Begin Waypoint %%
- [[Link]]
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.waypointRange).toEqual({ start: 2, end: 4 });
		});

		test('only extracts first waypoint if multiple exist', () => {
			const content = `%% Begin Waypoint %%
- [[First]]
%% End Waypoint %%

%% Begin Waypoint %%
- [[Second]]
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(true);
			expect(result.links).toEqual(['First']);
		});

		test('handles content with only start marker', () => {
			const content = `%% Begin Waypoint %%
Content without end`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(false);
		});

		test('handles content with only end marker', () => {
			const content = `Content without start
%% End Waypoint %%`;

			const result = WaypointUtils.extractWaypointBlock(content);

			expect(result.hasWaypoint).toBe(false);
		});

		test('handles empty string', () => {
			const result = WaypointUtils.extractWaypointBlock('');

			expect(result.hasWaypoint).toBe(false);
		});
	});

	describe('hasWaypointMarker()', () => {
		test('returns true when both markers present', () => {
			const content = `%% Begin Waypoint %%
Content
%% End Waypoint %%`;

			expect(WaypointUtils.hasWaypointMarker(content)).toBe(true);
		});

		test('returns false when only start marker present', () => {
			const content = `%% Begin Waypoint %%
Content without end`;

			expect(WaypointUtils.hasWaypointMarker(content)).toBe(false);
		});

		test('returns false when only end marker present', () => {
			const content = `Content without start
%% End Waypoint %%`;

			expect(WaypointUtils.hasWaypointMarker(content)).toBe(false);
		});

		test('returns false when no markers present', () => {
			const content = 'Regular content with no markers';

			expect(WaypointUtils.hasWaypointMarker(content)).toBe(false);
		});

		test('returns true even if markers are reversed', () => {
			const content = `%% End Waypoint %%
%% Begin Waypoint %%`;

			// This tests the regex logic - both patterns exist somewhere
			expect(WaypointUtils.hasWaypointMarker(content)).toBe(true);
		});

		test('handles empty string', () => {
			expect(WaypointUtils.hasWaypointMarker('')).toBe(false);
		});
	});

	describe('isFolderNote()', () => {
		let mockVault: IVaultAdapter;

		beforeEach(() => {
			mockVault = createMockVaultAdapter();
		});

		test('detects folder note by basename match', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Projects.md');
			file.basename = 'Projects';
			file.parent = folder;

			(mockVault.read as jest.Mock).mockResolvedValue('Regular content without waypoint');

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(true);
			expect(result.reason).toBe('basename_match');
			expect(result.folderPath).toBe('Projects');
		});

		test('detects folder note by waypoint marker', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Index.md');
			file.basename = 'Index';
			file.parent = folder;

			const content = `# Project Index
%% Begin Waypoint %%
- [[Project 1]]
%% End Waypoint %%`;

			(mockVault.read as jest.Mock).mockResolvedValue(content);

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(true);
			expect(result.reason).toBe('waypoint_marker');
			expect(result.folderPath).toBe('Projects');
		});

		test('detects folder note by both basename and waypoint', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Projects.md');
			file.basename = 'Projects';
			file.parent = folder;

			const content = `%% Begin Waypoint %%
- [[Project 1]]
%% End Waypoint %%`;

			(mockVault.read as jest.Mock).mockResolvedValue(content);

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(true);
			expect(result.reason).toBe('both');
			expect(result.folderPath).toBe('Projects');
		});

		test('detects non-folder note', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Regular Note.md');
			file.basename = 'Regular Note';
			file.parent = folder;

			(mockVault.read as jest.Mock).mockResolvedValue('Regular content without waypoint');

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(false);
			expect(result.reason).toBe('none');
			expect(result.folderPath).toBe('Projects');
		});

		test('handles file in root directory', async () => {
			const file = createMockTFile('RootNote.md');
			file.basename = 'RootNote';
			file.parent = null;

			(mockVault.read as jest.Mock).mockResolvedValue('Content');

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(false);
			expect(result.reason).toBe('none');
			expect(result.folderPath).toBeUndefined();
		});

		test('handles file read error - basename match still works', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Projects.md');
			file.basename = 'Projects';
			file.parent = folder;

			(mockVault.read as jest.Mock).mockRejectedValue(new Error('Read failed'));

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(true);
			expect(result.reason).toBe('basename_match');

		});

		test('handles file read error - waypoint cannot be detected', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Index.md');
			file.basename = 'Index';
			file.parent = folder;

			(mockVault.read as jest.Mock).mockRejectedValue(new Error('Read failed'));

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(false);
			expect(result.reason).toBe('none');

		});

		test('handles unclosed waypoint as no waypoint', async () => {
			const folder = createMockTFolder('Projects');
			const file = createMockTFile('Projects/Index.md');
			file.basename = 'Index';
			file.parent = folder;

			const content = `%% Begin Waypoint %%
Missing end marker`;

			(mockVault.read as jest.Mock).mockResolvedValue(content);

			const result = await WaypointUtils.isFolderNote(mockVault, file);

			expect(result.isFolderNote).toBe(false);
			expect(result.reason).toBe('none');
		});
	});

	describe('wouldAffectWaypoint()', () => {
		test('returns false when no waypoint in original content', () => {
			const content = 'Regular content';
			const newContent = 'Updated content';

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(false);
			expect(result.waypointRange).toBeUndefined();
		});

		test('detects waypoint removal', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;
			const newContent = 'Waypoint removed';

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(true);
			expect(result.waypointRange).toEqual({ start: 1, end: 3 });
		});

		test('detects waypoint content change', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;
			const newContent = `%% Begin Waypoint %%
- [[Note 2]]
%% End Waypoint %%`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(true);
			expect(result.waypointRange).toEqual({ start: 1, end: 3 });
		});

		test('allows waypoint to be moved (content unchanged)', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;
			const newContent = `# Added heading

%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(false);
		});

		test('detects waypoint content change with added link', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;
			const newContent = `%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
%% End Waypoint %%`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(true);
		});

		test('allows waypoint when only surrounding content changes', () => {
			const content = `# Heading
%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%
Footer`;
			const newContent = `# Different Heading
%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%
Different Footer`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(false);
		});

		test('detects waypoint content change with whitespace differences', () => {
			const content = `%% Begin Waypoint %%
- [[Note 1]]
%% End Waypoint %%`;
			const newContent = `%% Begin Waypoint %%
-  [[Note 1]]
%% End Waypoint %%`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(true);
		});

		test('returns false when waypoint stays identical', () => {
			const content = `# Heading
%% Begin Waypoint %%
- [[Note 1]]
- [[Note 2]]
%% End Waypoint %%
Content`;
			const newContent = content;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(false);
		});

		test('handles empty waypoint blocks', () => {
			const content = `%% Begin Waypoint %%
%% End Waypoint %%`;
			const newContent = `%% Begin Waypoint %%
%% End Waypoint %%`;

			const result = WaypointUtils.wouldAffectWaypoint(content, newContent);

			expect(result.affected).toBe(false);
		});
	});

	describe('getParentFolderPath()', () => {
		test('extracts parent folder from nested path', () => {
			expect(WaypointUtils.getParentFolderPath('folder/subfolder/file.md')).toBe('folder/subfolder');
		});

		test('extracts parent folder from single level path', () => {
			expect(WaypointUtils.getParentFolderPath('folder/file.md')).toBe('folder');
		});

		test('returns null for root level file', () => {
			expect(WaypointUtils.getParentFolderPath('file.md')).toBe(null);
		});

		test('handles path with multiple slashes', () => {
			expect(WaypointUtils.getParentFolderPath('a/b/c/d/file.md')).toBe('a/b/c/d');
		});

		test('handles empty string', () => {
			expect(WaypointUtils.getParentFolderPath('')).toBe(null);
		});

		test('handles path ending with slash', () => {
			expect(WaypointUtils.getParentFolderPath('folder/subfolder/')).toBe('folder/subfolder');
		});
	});

	describe('getBasename()', () => {
		test('extracts basename from file with extension', () => {
			expect(WaypointUtils.getBasename('file.md')).toBe('file');
		});

		test('extracts basename from nested path', () => {
			expect(WaypointUtils.getBasename('folder/subfolder/file.md')).toBe('file');
		});

		test('handles file with multiple dots', () => {
			expect(WaypointUtils.getBasename('file.test.md')).toBe('file.test');
		});

		test('handles file without extension', () => {
			expect(WaypointUtils.getBasename('folder/file')).toBe('file');
		});

		test('returns entire name when no extension or path', () => {
			expect(WaypointUtils.getBasename('filename')).toBe('filename');
		});

		test('handles empty string', () => {
			expect(WaypointUtils.getBasename('')).toBe('');
		});

		test('handles path with only extension', () => {
			expect(WaypointUtils.getBasename('.md')).toBe('');
		});

		test('handles deeply nested path', () => {
			expect(WaypointUtils.getBasename('a/b/c/d/e/file.md')).toBe('file');
		});

		test('handles hidden file (starts with dot)', () => {
			expect(WaypointUtils.getBasename('.gitignore')).toBe('');
		});

		test('handles hidden file with extension', () => {
			expect(WaypointUtils.getBasename('.config.json')).toBe('.config');
		});
	});
});
