import { App, TFile } from 'obsidian';
import { CallToolResult, ParsedNote, ExcalidrawMetadata } from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';
import { FrontmatterUtils } from '../utils/frontmatter-utils';
import { WaypointUtils } from '../utils/waypoint-utils';

export class NoteTools {
	constructor(private app: App) {}

	async readNote(
		path: string,
		options?: {
			withFrontmatter?: boolean;
			withContent?: boolean;
			parseFrontmatter?: boolean;
		}
	): Promise<CallToolResult> {
		// Default options
		const withFrontmatter = options?.withFrontmatter ?? true;
		const withContent = options?.withContent ?? true;
		const parseFrontmatter = options?.parseFrontmatter ?? false;

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

			// If no special options, return simple content
			if (!parseFrontmatter) {
				return {
					content: [{ type: "text", text: content }]
				};
			}

			// Parse frontmatter if requested
			const extracted = FrontmatterUtils.extractFrontmatter(content);

			const result: ParsedNote = {
				path: file.path,
				hasFrontmatter: extracted.hasFrontmatter,
				content: withContent ? content : ''
			};

			// Include frontmatter if requested
			if (withFrontmatter && extracted.hasFrontmatter) {
				result.frontmatter = extracted.frontmatter;
				result.parsedFrontmatter = extracted.parsedFrontmatter || undefined;
			}

			// Include content without frontmatter if parsing
			if (withContent && extracted.hasFrontmatter) {
				result.contentWithoutFrontmatter = extracted.contentWithoutFrontmatter;
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
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
			// Check for waypoint edit protection
			const currentContent = await this.app.vault.read(file);
			const waypointCheck = WaypointUtils.wouldAffectWaypoint(currentContent, content);
			
			if (waypointCheck.affected) {
				return {
					content: [{ 
						type: "text", 
						text: `Cannot update note: This would modify a Waypoint block.\n\n` +
							`Waypoint blocks (%% Begin Waypoint %% ... %% End Waypoint %%) are auto-generated ` +
							`by the Waypoint plugin and should not be manually edited.\n\n` +
							`Waypoint location: lines ${waypointCheck.waypointRange?.start}-${waypointCheck.waypointRange?.end}\n\n` +
							`Troubleshooting tips:\n` +
							`• Use get_folder_waypoint() to view the current waypoint content\n` +
							`• Edit content outside the waypoint block\n` +
							`• Let the Waypoint plugin regenerate the block automatically\n` +
							`• If you need to force this edit, the waypoint will need to be regenerated`
					}],
					isError: true
				};
			}

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

	async readExcalidraw(
		path: string,
		options?: {
			includeCompressed?: boolean;
			includePreview?: boolean;
		}
	): Promise<CallToolResult> {
		// Default options
		const includeCompressed = options?.includeCompressed ?? false;
		const includePreview = options?.includePreview ?? true;

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

			// Parse Excalidraw metadata (gracefully handles malformed files)
			const metadata = FrontmatterUtils.parseExcalidrawMetadata(content);

			if (!metadata.isExcalidraw) {
				// Return structured response for non-Excalidraw files
				const result: ExcalidrawMetadata = {
					path: file.path,
					isExcalidraw: false
				};
				return {
					content: [{ 
						type: "text", 
						text: JSON.stringify({
							...result,
							message: `File is not an Excalidraw drawing. The file does not contain Excalidraw plugin markers. Use read_note instead for regular markdown files.`
						}, null, 2)
					}]
				};
			}

			// Build result with all core metadata fields (always returned)
			const result: ExcalidrawMetadata = {
				path: file.path,
				isExcalidraw: metadata.isExcalidraw,
				elementCount: metadata.elementCount, // Number of drawing elements
				hasCompressedData: metadata.hasCompressedData, // Boolean for embedded images
				metadata: metadata.metadata // Object with appState and version
			};

			// Include preview if requested (extract text elements)
			if (includePreview) {
				// Extract text before the Drawing section
				const drawingIndex = content.indexOf('## Drawing');
				if (drawingIndex > 0) {
					const previewText = content.substring(0, drawingIndex).trim();
					// Remove the "# Text Elements" header if present
					result.preview = previewText.replace(/^#\s*Text Elements\s*\n+/, '').trim();
				}
			}

			// Include compressed data if requested (full content)
			if (includeCompressed) {
				result.compressedData = content;
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('read excalidraw', path, (error as Error).message) }],
				isError: true
			};
		}
	}
}
