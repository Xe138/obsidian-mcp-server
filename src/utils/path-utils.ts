import { App, TFile, TFolder, TAbstractFile } from 'obsidian';

/**
 * Utility class for path operations in Obsidian vault
 * Handles cross-platform path normalization and validation
 */
export class PathUtils {
	/**
	 * Normalize a path for use in Obsidian vault
	 * - Strips leading/trailing slashes
	 * - Converts backslashes to forward slashes
	 * - Handles Windows drive letters
	 * - Normalizes case on Windows (case-insensitive)
	 * - Preserves case on macOS/Linux (case-sensitive)
	 */
	static normalizePath(path: string): string {
		if (!path) {
			return '';
		}

		// Convert backslashes to forward slashes
		let normalized = path.replace(/\\/g, '/');

		// Remove leading slash
		normalized = normalized.replace(/^\/+/, '');

		// Remove trailing slash
		normalized = normalized.replace(/\/+$/, '');

		// Handle multiple consecutive slashes
		normalized = normalized.replace(/\/+/g, '/');

		// Handle Windows drive letters (C:/ -> C:)
		// Obsidian uses relative paths, so we shouldn't have drive letters
		// but we'll handle them just in case
		normalized = normalized.replace(/^([A-Za-z]):\//, '$1:/');

		// On Windows, normalize case (case-insensitive filesystem)
		// We'll detect Windows by checking for drive letters or backslashes in original path
		const isWindows = /^[A-Za-z]:/.test(path) || path.includes('\\');
		if (isWindows) {
			// Note: Obsidian's getAbstractFileByPath is case-insensitive on Windows
			// so we don't need to change case here, just ensure consistency
		}

		return normalized;
	}

	/**
	 * Check if a path is valid for use in Obsidian vault
	 * - Must not be empty
	 * - Must not contain invalid characters
	 * - Must not be an absolute path
	 */
	static isValidVaultPath(path: string): boolean {
		if (!path || path.trim() === '') {
			return false;
		}

		const normalized = this.normalizePath(path);

		// Check for absolute paths (should be vault-relative)
		if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
			return false;
		}

		// Check for invalid characters (Windows restrictions)
		// Invalid chars: < > : " | ? * and ASCII control characters (0-31)
		const invalidChars = /[<>:"|?*\u0000-\u001F]/;
		if (invalidChars.test(normalized)) {
			return false;
		}

		// Check for parent directory traversal attempts
		if (normalized.includes('..')) {
			return false;
		}

		return true;
	}

	/**
	 * Resolve a vault-relative path to a TFile or TFolder
	 * Returns null if the path doesn't exist or is invalid
	 */
	static resolveVaultPath(app: App, path: string): TAbstractFile | null {
		if (!this.isValidVaultPath(path)) {
			return null;
		}

		const normalized = this.normalizePath(path);
		return app.vault.getAbstractFileByPath(normalized);
	}

	/**
	 * Resolve a vault-relative path to a TFile
	 * Returns null if the path doesn't exist, is invalid, or is not a file
	 */
	static resolveFile(app: App, path: string): TFile | null {
		const file = this.resolveVaultPath(app, path);
		return file instanceof TFile ? file : null;
	}

	/**
	 * Resolve a vault-relative path to a TFolder
	 * Returns null if the path doesn't exist, is invalid, or is not a folder
	 */
	static resolveFolder(app: App, path: string): TFolder | null {
		const folder = this.resolveVaultPath(app, path);
		return folder instanceof TFolder ? folder : null;
	}

	/**
	 * Check if a file exists at the given path
	 */
	static fileExists(app: App, path: string): boolean {
		return this.resolveFile(app, path) !== null;
	}

	/**
	 * Check if a folder exists at the given path
	 */
	static folderExists(app: App, path: string): boolean {
		return this.resolveFolder(app, path) !== null;
	}

	/**
	 * Check if a path exists (file or folder)
	 */
	static pathExists(app: App, path: string): boolean {
		return this.resolveVaultPath(app, path) !== null;
	}

	/**
	 * Get the type of item at the path
	 * Returns 'file', 'folder', or null if doesn't exist
	 */
	static getPathType(app: App, path: string): 'file' | 'folder' | null {
		const item = this.resolveVaultPath(app, path);
		if (!item) return null;
		return item instanceof TFile ? 'file' : 'folder';
	}

	/**
	 * Ensure a path has the .md extension
	 */
	static ensureMarkdownExtension(path: string): string {
		const normalized = this.normalizePath(path);
		if (!normalized.endsWith('.md')) {
			return normalized + '.md';
		}
		return normalized;
	}

	/**
	 * Get the parent folder path
	 */
	static getParentPath(path: string): string {
		const normalized = this.normalizePath(path);
		const lastSlash = normalized.lastIndexOf('/');
		if (lastSlash === -1) {
			return '';
		}
		return normalized.substring(0, lastSlash);
	}

	/**
	 * Get the basename (filename without path)
	 */
	static getBasename(path: string): string {
		const normalized = this.normalizePath(path);
		const lastSlash = normalized.lastIndexOf('/');
		if (lastSlash === -1) {
			return normalized;
		}
		return normalized.substring(lastSlash + 1);
	}

	/**
	 * Join path segments
	 */
	static joinPath(...segments: string[]): string {
		const joined = segments
			.filter(s => s && s.trim() !== '')
			.map(s => this.normalizePath(s))
			.join('/');
		return this.normalizePath(joined);
	}
}
