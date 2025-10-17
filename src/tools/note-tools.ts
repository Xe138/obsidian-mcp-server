import { App, TFile } from 'obsidian';
import { CallToolResult } from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';

export class NoteTools {
	constructor(private app: App) {}

	async readNote(path: string): Promise<CallToolResult> {
		// Validate path
		if (!path || path.trim() === '') {
			return {
				content: [{ type: "text", text: ErrorMessages.emptyPath() }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Resolve file using path utilities
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
			// Check if it's a folder instead
			if (PathUtils.folderExists(this.app, path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.notAFile(path) }],
					isError: true
				};
			}
			
			return {
				content: [{ type: "text", text: ErrorMessages.fileNotFound(path) }],
				isError: true
			};
		}

		try {
			const content = await this.app.vault.read(file);
			return {
				content: [{ type: "text", text: content }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('read note', path, (error as Error).message) }],
				isError: true
			};
		}
	}

	async createNote(path: string, content: string, createParents: boolean = false): Promise<CallToolResult> {
		// Validate path
		if (!path || path.trim() === '') {
			return {
				content: [{ type: "text", text: ErrorMessages.emptyPath() }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Normalize the path
		const normalizedPath = PathUtils.normalizePath(path);

		// Check if file already exists
		if (PathUtils.fileExists(this.app, normalizedPath)) {
			return {
				content: [{ type: "text", text: ErrorMessages.pathAlreadyExists(normalizedPath, 'file') }],
				isError: true
			};
		}

		// Check if it's a folder
		if (PathUtils.folderExists(this.app, normalizedPath)) {
			return {
				content: [{ type: "text", text: ErrorMessages.notAFile(normalizedPath) }],
				isError: true
			};
		}

		// Explicit parent folder detection (before write operation)
		const parentPath = PathUtils.getParentPath(normalizedPath);
		if (parentPath) {
			// First check if parent path is actually a file (not a folder)
			if (PathUtils.fileExists(this.app, parentPath)) {
				return {
					content: [{ type: "text", text: ErrorMessages.notAFolder(parentPath) }],
					isError: true
				};
			}
			
			// Check if parent folder exists
			if (!PathUtils.pathExists(this.app, parentPath)) {
				if (createParents) {
					// Auto-create parent folders recursively
					try {
						await this.createParentFolders(parentPath);
					} catch (error) {
						return {
							content: [{ type: "text", text: ErrorMessages.operationFailed('create parent folders', parentPath, (error as Error).message) }],
							isError: true
						};
					}
				} else {
					// Return clear error before attempting file creation
					return {
						content: [{ type: "text", text: ErrorMessages.parentFolderNotFound(normalizedPath, parentPath) }],
						isError: true
					};
				}
			}
		}

		// Proceed with file creation
		try {
			const file = await this.app.vault.create(normalizedPath, content);
			return {
				content: [{ type: "text", text: `Note created successfully: ${file.path}` }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('create note', normalizedPath, (error as Error).message) }],
				isError: true
			};
		}
	}

	/**
	 * Recursively create parent folders
	 * @private
	 */
	private async createParentFolders(path: string): Promise<void> {
		// Get parent path
		const parentPath = PathUtils.getParentPath(path);
		
		// If there's a parent and it doesn't exist, create it first (recursion)
		if (parentPath && !PathUtils.pathExists(this.app, parentPath)) {
			await this.createParentFolders(parentPath);
		}
		
		// Create the current folder if it doesn't exist
		if (!PathUtils.pathExists(this.app, path)) {
			await this.app.vault.createFolder(path);
		}
	}

	async updateNote(path: string, content: string): Promise<CallToolResult> {
		// Validate path
		if (!path || path.trim() === '') {
			return {
				content: [{ type: "text", text: ErrorMessages.emptyPath() }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Resolve file using path utilities
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
			// Check if it's a folder instead
			if (PathUtils.folderExists(this.app, path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.notAFile(path) }],
					isError: true
				};
			}
			
			return {
				content: [{ type: "text", text: ErrorMessages.fileNotFound(path) }],
				isError: true
			};
		}

		try {
			await this.app.vault.modify(file, content);
			return {
				content: [{ type: "text", text: `Note updated successfully: ${file.path}` }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('update note', path, (error as Error).message) }],
				isError: true
			};
		}
	}

	async deleteNote(path: string): Promise<CallToolResult> {
		// Validate path
		if (!path || path.trim() === '') {
			return {
				content: [{ type: "text", text: ErrorMessages.emptyPath() }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Resolve file using path utilities
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
			// Check if it's a folder instead
			if (PathUtils.folderExists(this.app, path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.cannotDeleteFolder(path) }],
					isError: true
				};
			}
			
			return {
				content: [{ type: "text", text: ErrorMessages.fileNotFound(path) }],
				isError: true
			};
		}

		try {
			await this.app.vault.delete(file);
			return {
				content: [{ type: "text", text: `Note deleted successfully: ${file.path}` }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('delete note', path, (error as Error).message) }],
				isError: true
			};
		}
	}
}
