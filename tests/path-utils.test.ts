/**
 * Unit tests for PathUtils
 */

import { PathUtils } from '../src/utils/path-utils';
import { App, TFile, TFolder } from 'obsidian';

describe('PathUtils', () => {
	describe('normalizePath', () => {
		test('should strip leading slashes', () => {
			expect(PathUtils.normalizePath('/folder/note.md')).toBe('folder/note.md');
			expect(PathUtils.normalizePath('//folder/note.md')).toBe('folder/note.md');
		});

		test('should strip trailing slashes', () => {
			expect(PathUtils.normalizePath('folder/note.md/')).toBe('folder/note.md');
			expect(PathUtils.normalizePath('folder/note.md//')).toBe('folder/note.md');
		});

		test('should convert backslashes to forward slashes', () => {
			expect(PathUtils.normalizePath('folder\\note.md')).toBe('folder/note.md');
			expect(PathUtils.normalizePath('folder\\subfolder\\note.md')).toBe('folder/subfolder/note.md');
		});

		test('should handle multiple consecutive slashes', () => {
			expect(PathUtils.normalizePath('folder//subfolder///note.md')).toBe('folder/subfolder/note.md');
		});

		test('should handle Windows drive letters', () => {
			expect(PathUtils.normalizePath('C:/folder/note.md')).toBe('C:/folder/note.md');
		});

		test('should handle empty strings', () => {
			expect(PathUtils.normalizePath('')).toBe('');
		});

		test('should handle simple filenames', () => {
			expect(PathUtils.normalizePath('note.md')).toBe('note.md');
		});

		test('should handle complex paths', () => {
			expect(PathUtils.normalizePath('/folder/subfolder/note.md/')).toBe('folder/subfolder/note.md');
			expect(PathUtils.normalizePath('\\folder\\subfolder\\note.md\\')).toBe('folder/subfolder/note.md');
		});
	});

	describe('isValidVaultPath', () => {
		test('should accept valid paths', () => {
			expect(PathUtils.isValidVaultPath('note.md')).toBe(true);
			expect(PathUtils.isValidVaultPath('folder/note.md')).toBe(true);
			expect(PathUtils.isValidVaultPath('folder/subfolder/note.md')).toBe(true);
		});

		test('should reject empty paths', () => {
			expect(PathUtils.isValidVaultPath('')).toBe(false);
			expect(PathUtils.isValidVaultPath('   ')).toBe(false);
		});

		test('should reject paths with invalid characters', () => {
			expect(PathUtils.isValidVaultPath('note<test>.md')).toBe(false);
			expect(PathUtils.isValidVaultPath('note:test.md')).toBe(false);
			expect(PathUtils.isValidVaultPath('note|test.md')).toBe(false);
			expect(PathUtils.isValidVaultPath('note?test.md')).toBe(false);
			expect(PathUtils.isValidVaultPath('note*test.md')).toBe(false);
		});

		test('should reject parent directory traversal', () => {
			expect(PathUtils.isValidVaultPath('../note.md')).toBe(false);
			expect(PathUtils.isValidVaultPath('folder/../note.md')).toBe(false);
		});

		test('should accept paths after normalization', () => {
			// These should be valid after normalization
			expect(PathUtils.isValidVaultPath('/folder/note.md')).toBe(true);
			expect(PathUtils.isValidVaultPath('folder/note.md/')).toBe(true);
		});
	});

	describe('ensureMarkdownExtension', () => {
		test('should add .md extension if missing', () => {
			expect(PathUtils.ensureMarkdownExtension('note')).toBe('note.md');
			expect(PathUtils.ensureMarkdownExtension('folder/note')).toBe('folder/note.md');
		});

		test('should not add .md if already present', () => {
			expect(PathUtils.ensureMarkdownExtension('note.md')).toBe('note.md');
			expect(PathUtils.ensureMarkdownExtension('folder/note.md')).toBe('folder/note.md');
		});

		test('should normalize path before adding extension', () => {
			expect(PathUtils.ensureMarkdownExtension('/folder/note/')).toBe('folder/note.md');
		});
	});

	describe('getParentPath', () => {
		test('should return parent folder path', () => {
			expect(PathUtils.getParentPath('folder/note.md')).toBe('folder');
			expect(PathUtils.getParentPath('folder/subfolder/note.md')).toBe('folder/subfolder');
		});

		test('should return empty string for root-level files', () => {
			expect(PathUtils.getParentPath('note.md')).toBe('');
		});

		test('should normalize path first', () => {
			expect(PathUtils.getParentPath('/folder/note.md/')).toBe('folder');
		});
	});

	describe('getBasename', () => {
		test('should return filename without path', () => {
			expect(PathUtils.getBasename('folder/note.md')).toBe('note.md');
			expect(PathUtils.getBasename('folder/subfolder/note.md')).toBe('note.md');
		});

		test('should return the filename for root-level files', () => {
			expect(PathUtils.getBasename('note.md')).toBe('note.md');
		});

		test('should normalize path first', () => {
			expect(PathUtils.getBasename('/folder/note.md/')).toBe('note.md');
		});
	});

	describe('joinPath', () => {
		test('should join path segments', () => {
			expect(PathUtils.joinPath('folder', 'note.md')).toBe('folder/note.md');
			expect(PathUtils.joinPath('folder', 'subfolder', 'note.md')).toBe('folder/subfolder/note.md');
		});

		test('should handle empty segments', () => {
			expect(PathUtils.joinPath('folder', '', 'note.md')).toBe('folder/note.md');
			expect(PathUtils.joinPath('', 'folder', 'note.md')).toBe('folder/note.md');
		});

		test('should normalize each segment', () => {
			expect(PathUtils.joinPath('/folder/', '/subfolder/', '/note.md/')).toBe('folder/subfolder/note.md');
		});

		test('should handle single segment', () => {
			expect(PathUtils.joinPath('note.md')).toBe('note.md');
		});
	});
});

/**
 * Integration tests for PathUtils with Obsidian App
 */
describe('PathUtils - Integration with Obsidian', () => {
	let mockApp: App;

	beforeEach(() => {
		mockApp = new App();
		// Clear any previous mock files
		(mockApp.vault as any)._clearMockFiles();
	});

	describe('resolveVaultPath', () => {
		test('should return null for invalid paths', () => {
			expect(PathUtils.resolveVaultPath(mockApp, '../note.md')).toBe(null);
			expect(PathUtils.resolveVaultPath(mockApp, '')).toBe(null);
		});

		test('should normalize path before resolving', () => {
			(mockApp.vault as any)._addMockFile('folder/note.md', false);
			
			const result = PathUtils.resolveVaultPath(mockApp, '/folder/note.md/');
			expect(result).not.toBe(null);
			expect(result?.path).toBe('folder/note.md');
		});

		test('should return file when it exists', () => {
			(mockApp.vault as any)._addMockFile('note.md', false);
			
			const result = PathUtils.resolveVaultPath(mockApp, 'note.md');
			expect(result).toBeInstanceOf(TFile);
			expect(result?.path).toBe('note.md');
		});

		test('should return folder when it exists', () => {
			(mockApp.vault as any)._addMockFile('folder', true);
			
			const result = PathUtils.resolveVaultPath(mockApp, 'folder');
			expect(result).toBeInstanceOf(TFolder);
			expect(result?.path).toBe('folder');
		});
	});

	describe('fileExists', () => {
		test('should return true if file exists', () => {
			(mockApp.vault as any)._addMockFile('note.md', false);
			expect(PathUtils.fileExists(mockApp, 'note.md')).toBe(true);
		});

		test('should return false if file does not exist', () => {
			expect(PathUtils.fileExists(mockApp, 'note.md')).toBe(false);
		});

		test('should return false if path is a folder', () => {
			(mockApp.vault as any)._addMockFile('folder', true);
			expect(PathUtils.fileExists(mockApp, 'folder')).toBe(false);
		});
	});

	describe('folderExists', () => {
		test('should return true if folder exists', () => {
			(mockApp.vault as any)._addMockFile('folder', true);
			expect(PathUtils.folderExists(mockApp, 'folder')).toBe(true);
		});

		test('should return false if folder does not exist', () => {
			expect(PathUtils.folderExists(mockApp, 'folder')).toBe(false);
		});

		test('should return false if path is a file', () => {
			(mockApp.vault as any)._addMockFile('note.md', false);
			expect(PathUtils.folderExists(mockApp, 'note.md')).toBe(false);
		});
	});

	describe('getPathType', () => {
		test('should return "file" for files', () => {
			(mockApp.vault as any)._addMockFile('note.md', false);
			expect(PathUtils.getPathType(mockApp, 'note.md')).toBe('file');
		});

		test('should return "folder" for folders', () => {
			(mockApp.vault as any)._addMockFile('folder', true);
			expect(PathUtils.getPathType(mockApp, 'folder')).toBe('folder');
		});

		test('should return null for non-existent paths', () => {
			expect(PathUtils.getPathType(mockApp, 'nonexistent')).toBe(null);
		});
	});
});

/**
 * Test cases for cross-platform path handling
 */
describe('PathUtils - Cross-platform', () => {
	describe('Windows paths', () => {
		test('should handle backslashes', () => {
			expect(PathUtils.normalizePath('folder\\subfolder\\note.md')).toBe('folder/subfolder/note.md');
		});

		test('should handle mixed slashes', () => {
			expect(PathUtils.normalizePath('folder\\subfolder/note.md')).toBe('folder/subfolder/note.md');
		});
	});

	describe('macOS/Linux paths', () => {
		test('should preserve forward slashes', () => {
			expect(PathUtils.normalizePath('folder/subfolder/note.md')).toBe('folder/subfolder/note.md');
		});

		test('should handle leading slashes', () => {
			expect(PathUtils.normalizePath('/folder/note.md')).toBe('folder/note.md');
		});
	});
});
