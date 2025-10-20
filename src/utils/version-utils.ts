import { TFile } from 'obsidian';
import * as crypto from 'crypto';

/**
 * Version control utilities for concurrency management
 * Implements ETag-based optimistic locking for write operations
 */
export class VersionUtils {
	/**
	 * Generate a version ID (ETag) for a file based on its modification time and size
	 * Format: base64(sha256(mtime + size))
	 */
	static generateVersionId(file: TFile): string {
		const data = `${file.stat.mtime}-${file.stat.size}`;
		const hash = crypto.createHash('sha256').update(data).digest('base64');
		// Use URL-safe base64 and truncate to reasonable length
		return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 22);
	}

	/**
	 * Validate that the provided version ID matches the current file version
	 * Returns true if versions match (safe to proceed with write)
	 * Returns false if versions don't match (conflict detected)
	 */
	static validateVersion(file: TFile, providedVersionId: string): boolean {
		const currentVersionId = this.generateVersionId(file);
		return currentVersionId === providedVersionId;
	}

	/**
	 * Create a version mismatch error message
	 */
	static versionMismatchError(path: string, providedVersion: string, currentVersion: string): string {
		return JSON.stringify({
			error: 'Version mismatch (412 Precondition Failed)',
			path,
			message: 'The file has been modified since you last read it. Please re-read the file and try again.',
			providedVersion,
			currentVersion,
			troubleshooting: [
				'Re-read the file to get the latest versionId',
				'Merge your changes with the current content',
				'Retry the operation with the new versionId'
			]
		}, null, 2);
	}
}
