/**
 * Tests for VersionUtils
 */

import { TFile } from 'obsidian';
import { VersionUtils } from '../../src/utils/version-utils';

describe('VersionUtils', () => {
	let mockFile: TFile;

	beforeEach(() => {
		mockFile = new TFile('test.md');
		mockFile.stat = {
			ctime: 1234567890000,
			mtime: 1234567890000,
			size: 1024
		};
	});

	describe('generateVersionId', () => {
		it('should generate a version ID from file stats', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId).toBeDefined();
			expect(typeof versionId).toBe('string');
			expect(versionId.length).toBeGreaterThan(0);
		});

		it('should generate consistent version ID for same file stats', () => {
			const versionId1 = VersionUtils.generateVersionId(mockFile);
			const versionId2 = VersionUtils.generateVersionId(mockFile);

			expect(versionId1).toBe(versionId2);
		});

		it('should generate different version ID when mtime changes', () => {
			const versionId1 = VersionUtils.generateVersionId(mockFile);

			mockFile.stat.mtime = 1234567890001; // Different mtime

			const versionId2 = VersionUtils.generateVersionId(mockFile);

			expect(versionId1).not.toBe(versionId2);
		});

		it('should generate different version ID when size changes', () => {
			const versionId1 = VersionUtils.generateVersionId(mockFile);

			mockFile.stat.size = 2048; // Different size

			const versionId2 = VersionUtils.generateVersionId(mockFile);

			expect(versionId1).not.toBe(versionId2);
		});

		it('should generate URL-safe version ID', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			// Should not contain URL-unsafe characters
			expect(versionId).not.toContain('+');
			expect(versionId).not.toContain('/');
			expect(versionId).not.toContain('=');
		});

		it('should truncate version ID to 22 characters', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId.length).toBe(22);
		});

		it('should handle large file sizes', () => {
			mockFile.stat.size = 999999999999; // Very large file

			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId).toBeDefined();
			expect(versionId.length).toBe(22);
		});

		it('should handle zero size file', () => {
			mockFile.stat.size = 0;

			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId).toBeDefined();
			expect(versionId.length).toBe(22);
		});

		it('should handle very old timestamps', () => {
			mockFile.stat.mtime = 0;

			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId).toBeDefined();
			expect(versionId.length).toBe(22);
		});

		it('should handle future timestamps', () => {
			mockFile.stat.mtime = Date.now() + 10000000000; // Far future

			const versionId = VersionUtils.generateVersionId(mockFile);

			expect(versionId).toBeDefined();
			expect(versionId.length).toBe(22);
		});

		it('should generate different IDs for different files with different stats', () => {
			const file1 = new TFile('test1.md');
			file1.stat = {
				ctime: 1000,
				mtime: 1000,
				size: 100
			};

			const file2 = new TFile('test2.md');
			file2.stat = {
				ctime: 2000,
				mtime: 2000,
				size: 200
			};

			const versionId1 = VersionUtils.generateVersionId(file1);
			const versionId2 = VersionUtils.generateVersionId(file2);

			expect(versionId1).not.toBe(versionId2);
		});

		it('should generate same ID for files with same stats regardless of path', () => {
			const file1 = new TFile('test1.md');
			file1.stat = {
				ctime: 1000,
				mtime: 1000,
				size: 100
			};

			const file2 = new TFile('different/path/test2.md');
			file2.stat = {
				ctime: 2000, // Different ctime (not used)
				mtime: 1000, // Same mtime (used)
				size: 100    // Same size (used)
			};

			const versionId1 = VersionUtils.generateVersionId(file1);
			const versionId2 = VersionUtils.generateVersionId(file2);

			expect(versionId1).toBe(versionId2);
		});
	});

	describe('validateVersion', () => {
		it('should return true when version IDs match', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);
			const isValid = VersionUtils.validateVersion(mockFile, versionId);

			expect(isValid).toBe(true);
		});

		it('should return false when version IDs do not match', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			// Modify file stats
			mockFile.stat.mtime = 1234567890001;

			const isValid = VersionUtils.validateVersion(mockFile, versionId);

			expect(isValid).toBe(false);
		});

		it('should return false for invalid version ID', () => {
			const isValid = VersionUtils.validateVersion(mockFile, 'invalid-version-id');

			expect(isValid).toBe(false);
		});

		it('should return false for empty version ID', () => {
			const isValid = VersionUtils.validateVersion(mockFile, '');

			expect(isValid).toBe(false);
		});

		it('should detect file modification by mtime change', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			// Simulate file modification
			mockFile.stat.mtime += 1000;

			const isValid = VersionUtils.validateVersion(mockFile, versionId);

			expect(isValid).toBe(false);
		});

		it('should detect file modification by size change', () => {
			const versionId = VersionUtils.generateVersionId(mockFile);

			// Simulate file modification
			mockFile.stat.size += 100;

			const isValid = VersionUtils.validateVersion(mockFile, versionId);

			expect(isValid).toBe(false);
		});

		it('should validate correctly after multiple modifications', () => {
			const versionId1 = VersionUtils.generateVersionId(mockFile);

			// First modification
			mockFile.stat.mtime += 1000;
			const versionId2 = VersionUtils.generateVersionId(mockFile);

			// Second modification
			mockFile.stat.size += 100;
			const versionId3 = VersionUtils.generateVersionId(mockFile);

			expect(VersionUtils.validateVersion(mockFile, versionId1)).toBe(false);
			expect(VersionUtils.validateVersion(mockFile, versionId2)).toBe(false);
			expect(VersionUtils.validateVersion(mockFile, versionId3)).toBe(true);
		});
	});

	describe('versionMismatchError', () => {
		it('should generate error message with all details', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			expect(error).toBeDefined();
			expect(typeof error).toBe('string');
		});

		it('should include error type', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			expect(parsed.error).toContain('Version mismatch');
			expect(parsed.error).toContain('412');
		});

		it('should include file path', () => {
			const error = VersionUtils.versionMismatchError(
				'folder/test.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			expect(parsed.path).toBe('folder/test.md');
		});

		it('should include helpful message', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			expect(parsed.message).toBeDefined();
			expect(parsed.message).toContain('modified');
		});

		it('should include both version IDs', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-123',
				'new-version-456'
			);

			const parsed = JSON.parse(error);
			expect(parsed.providedVersion).toBe('old-version-123');
			expect(parsed.currentVersion).toBe('new-version-456');
		});

		it('should include troubleshooting steps', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			expect(parsed.troubleshooting).toBeDefined();
			expect(Array.isArray(parsed.troubleshooting)).toBe(true);
			expect(parsed.troubleshooting.length).toBeGreaterThan(0);
		});

		it('should return valid JSON', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			expect(() => JSON.parse(error)).not.toThrow();
		});

		it('should format JSON with indentation', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			// Should be formatted with 2-space indentation
			expect(error).toContain('\n');
			expect(error).toContain('  '); // 2-space indentation
		});

		it('should handle special characters in path', () => {
			const error = VersionUtils.versionMismatchError(
				'folder/file with spaces & special.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			expect(parsed.path).toBe('folder/file with spaces & special.md');
		});

		it('should provide actionable troubleshooting steps', () => {
			const error = VersionUtils.versionMismatchError(
				'test.md',
				'old-version-id',
				'new-version-id'
			);

			const parsed = JSON.parse(error);
			const troubleshootingText = parsed.troubleshooting.join(' ');

			expect(troubleshootingText).toContain('Re-read');
			expect(troubleshootingText).toContain('Merge');
			expect(troubleshootingText).toContain('Retry');
		});
	});

	describe('Integration - Full Workflow', () => {
		it('should support typical optimistic locking workflow', () => {
			// 1. Read file and get version
			const initialVersion = VersionUtils.generateVersionId(mockFile);

			// 2. Validate before write (should pass)
			expect(VersionUtils.validateVersion(mockFile, initialVersion)).toBe(true);

			// 3. Simulate another process modifying the file
			mockFile.stat.mtime += 1000;

			// 4. Try to write with old version (should fail)
			expect(VersionUtils.validateVersion(mockFile, initialVersion)).toBe(false);

			// 5. Get error message for user
			const newVersion = VersionUtils.generateVersionId(mockFile);
			const error = VersionUtils.versionMismatchError(
				mockFile.path,
				initialVersion,
				newVersion
			);

			expect(error).toContain('Version mismatch');

			// 6. Re-read file and get new version
			const updatedVersion = VersionUtils.generateVersionId(mockFile);

			// 7. Validate with new version (should pass)
			expect(VersionUtils.validateVersion(mockFile, updatedVersion)).toBe(true);
		});

		it('should handle concurrent modifications', () => {
			const version1 = VersionUtils.generateVersionId(mockFile);

			// Simulate modification 1
			mockFile.stat.mtime += 100;
			const version2 = VersionUtils.generateVersionId(mockFile);

			// Simulate modification 2
			mockFile.stat.mtime += 100;
			const version3 = VersionUtils.generateVersionId(mockFile);

			// Only the latest version should validate
			expect(VersionUtils.validateVersion(mockFile, version1)).toBe(false);
			expect(VersionUtils.validateVersion(mockFile, version2)).toBe(false);
			expect(VersionUtils.validateVersion(mockFile, version3)).toBe(true);
		});
	});
});
