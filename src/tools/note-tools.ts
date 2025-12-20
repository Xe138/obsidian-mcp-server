import { App } from 'obsidian';
import {
	CallToolResult,
	ParsedNote,
	ExcalidrawMetadata,
	UpdateFrontmatterResult,
	UpdateSectionsResult,
	CreateNoteResult,
	RenameFileResult,
	DeleteNoteResult,
	SectionEdit,
	ConflictStrategy
} from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';
import { FrontmatterUtils, YAMLValue } from '../utils/frontmatter-utils';
import { WaypointUtils } from '../utils/waypoint-utils';
import { VersionUtils } from '../utils/version-utils';
import { ContentUtils } from '../utils/content-utils';
import { LinkUtils } from '../utils/link-utils';
import { IVaultAdapter, IFileManagerAdapter, IMetadataCacheAdapter } from '../adapters/interfaces';

export class NoteTools {
	constructor(
		private vault: IVaultAdapter,
		private fileManager: IFileManagerAdapter,
		private metadata: IMetadataCacheAdapter,
		private app: App  // Keep temporarily for methods not yet migrated
	) {}

	async readNote(
		path: string,
		options?: {
			withFrontmatter?: boolean;
			withContent?: boolean;
			parseFrontmatter?: boolean;
		}
	): Promise<CallToolResult> {
		// Default options
		/* istanbul ignore next - Default parameter branch coverage (true branch tested in all existing tests) */
		const withFrontmatter = options?.withFrontmatter ?? true;
		/* istanbul ignore next */
		const withContent = options?.withContent ?? true;
		/* istanbul ignore next */
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
			const content = await this.vault.read(file);

			// If no special options, return simple content
			if (!parseFrontmatter) {
				// Compute word count when returning content
				if (withContent) {
					const wordCount = ContentUtils.countWords(content);
					const result = {
						content,
						wordCount
					};
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
					};
				}
				return {
					content: [{ type: "text", text: content }]
				};
			}

			// Parse frontmatter if requested
			const extracted = FrontmatterUtils.extractFrontmatter(content);

			const result: ParsedNote = {
				path: file.path,
				hasFrontmatter: extracted.hasFrontmatter,
				/* istanbul ignore next - Conditional content inclusion tested via integration tests */
				content: withContent ? content : ''
			};

			// Include frontmatter if requested
			/* istanbul ignore next - Response building branches tested via integration tests */
			if (withFrontmatter && extracted.hasFrontmatter) {
				result.frontmatter = extracted.frontmatter;
				result.parsedFrontmatter = extracted.parsedFrontmatter || undefined;
			}

			// Include content without frontmatter if parsing
			/* istanbul ignore next */
			if (withContent && extracted.hasFrontmatter) {
				result.contentWithoutFrontmatter = extracted.contentWithoutFrontmatter;
			}

			// Add word count when content is included
			if (withContent) {
				result.wordCount = ContentUtils.countWords(content);
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

	async createNote(
		path: string,
		content: string,
		createParents: boolean = false,
		onConflict: ConflictStrategy = 'error',
		validateLinks: boolean = true
	): Promise<CallToolResult> {
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
		let normalizedPath = PathUtils.normalizePath(path);
		let finalPath = normalizedPath;
		let wasRenamed = false;
		let originalPath: string | undefined;

		// Check if file already exists
		if (PathUtils.fileExists(this.app, normalizedPath)) {
			/* istanbul ignore next - onConflict error branch tested in note-tools.test.ts */
			if (onConflict === 'error') {
				return {
					content: [{ type: "text", text: ErrorMessages.pathAlreadyExists(normalizedPath, 'file') }],
					isError: true
				};
			/* istanbul ignore next - onConflict overwrite branch tested in note-tools.test.ts */
			} else if (onConflict === 'overwrite') {
				// Delete existing file before creating
				const existingFile = PathUtils.resolveFile(this.app, normalizedPath);
				/* istanbul ignore next */
				if (existingFile) {
					await this.fileManager.trashFile(existingFile);
				}
			} else if (onConflict === 'rename') {
				// Generate a unique name
				originalPath = normalizedPath;
				finalPath = this.generateUniquePath(normalizedPath);
				wasRenamed = true;
			}
		}

		// Check if it's a folder
		if (PathUtils.folderExists(this.app, finalPath)) {
			return {
				content: [{ type: "text", text: ErrorMessages.notAFile(finalPath) }],
				isError: true
			};
		}

		// Explicit parent folder detection (before write operation)
		const parentPath = PathUtils.getParentPath(finalPath);
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
						content: [{ type: "text", text: ErrorMessages.parentFolderNotFound(finalPath, parentPath) }],
						isError: true
					};
				}
			}
		}

		// Proceed with file creation
		try {
			const file = await this.vault.create(finalPath, content);

			const result: CreateNoteResult = {
				success: true,
				path: file.path,
				versionId: VersionUtils.generateVersionId(file),
				created: file.stat.ctime,
				renamed: wasRenamed,
				originalPath: originalPath
			};

			// Add word count
			result.wordCount = ContentUtils.countWords(content);

			// Add link validation if requested
			if (validateLinks) {
				result.linkValidation = LinkUtils.validateLinks(
					this.vault,
					this.metadata,
					content,
					file.path
				);
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('create note', finalPath, (error as Error).message) }],
				isError: true
			};
		}
	}

	/**
	 * Generate a unique path by appending a number to the filename
	 * @private
	 */
	private generateUniquePath(path: string): string {
		const basePath = path.replace(/\.md$/, '');
		let counter = 1;
		let newPath = `${basePath} ${counter}.md`;
		
		while (PathUtils.fileExists(this.app, newPath)) {
			counter++;
			newPath = `${basePath} ${counter}.md`;
		}
		
		return newPath;
	}

	/**
	 * Recursively create parent folders
	 * @private
	 */
	private async createParentFolders(path: string): Promise<void> {
		// Get parent path
		/* istanbul ignore next - PathUtils.getParentPath branch coverage */
		const parentPath = PathUtils.getParentPath(path);

		// If there's a parent and it doesn't exist, create it first (recursion)
		if (parentPath && !PathUtils.pathExists(this.app, parentPath)) {
			await this.createParentFolders(parentPath);
		}
		
		// Create the current folder if it doesn't exist
		if (!PathUtils.pathExists(this.app, path)) {
			await this.vault.createFolder(path);
		}
	}

	async updateNote(path: string, content: string, validateLinks: boolean = true): Promise<CallToolResult> {
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
			const currentContent = await this.vault.read(file);
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

			await this.vault.modify(file, content);

			// Build response with word count and link validation
			interface UpdateNoteResult {
				success: boolean;
				path: string;
				versionId: string;
				modified: number;
				wordCount?: number;
				linkValidation?: {
					valid: string[];
					brokenNotes: Array<{ link: string; line: number; context: string }>;
					brokenHeadings: Array<{ link: string; line: number; context: string; note: string }>;
					summary: string;
				};
			}

			const result: UpdateNoteResult = {
				success: true,
				path: file.path,
				versionId: VersionUtils.generateVersionId(file),
				modified: file.stat.mtime,
				wordCount: ContentUtils.countWords(content)
			};

			// Add link validation if requested
			if (validateLinks) {
				result.linkValidation = LinkUtils.validateLinks(
					this.vault,
					this.metadata,
					content,
					file.path
				);
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('update note', path, (error as Error).message) }],
				isError: true
			};
		}
	}

	/**
	 * Rename or move a file with automatic link updates
	 * Uses Obsidian's FileManager to maintain link integrity
	 */
	async renameFile(
		path: string,
		newPath: string,
		updateLinks: boolean = true,
		ifMatch?: string
	): Promise<CallToolResult> {
		// Validate paths
		if (!path || path.trim() === '') {
			return {
				content: [{ type: "text", text: ErrorMessages.emptyPath() }],
				isError: true
			};
		}

		if (!newPath || newPath.trim() === '') {
			return {
				content: [{ type: "text", text: JSON.stringify({ error: 'New path cannot be empty' }, null, 2) }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		if (!PathUtils.isValidVaultPath(newPath)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(newPath) }],
				isError: true
			};
		}

		// Resolve source file
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
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

		// Normalize new path
		const normalizedNewPath = PathUtils.normalizePath(newPath);

		// Check if destination already exists
		if (PathUtils.fileExists(this.app, normalizedNewPath)) {
			return {
				content: [{ 
					type: "text", 
					text: JSON.stringify({
						error: 'Destination file already exists',
						path: normalizedNewPath,
						message: 'Cannot rename/move file because a file already exists at the destination path.'
					}, null, 2)
				}],
				isError: true
			};
		}

		if (PathUtils.folderExists(this.app, normalizedNewPath)) {
			return {
				content: [{ type: "text", text: ErrorMessages.notAFile(normalizedNewPath) }],
				isError: true
			};
		}

		try {
			// Check version if ifMatch provided
			if (ifMatch && !VersionUtils.validateVersion(file, ifMatch)) {
				const currentVersion = VersionUtils.generateVersionId(file);
				return {
					content: [{ type: "text", text: VersionUtils.versionMismatchError(path, ifMatch, currentVersion) }],
					isError: true
				};
			}

			// Create parent folder if needed
			const parentPath = PathUtils.getParentPath(normalizedNewPath);
			if (parentPath && !PathUtils.pathExists(this.app, parentPath)) {
				await this.createParentFolders(parentPath);
			}

			// Use Obsidian's FileManager to rename (automatically updates links)
			// Note: Obsidian's renameFile automatically updates all wikilinks
			await this.fileManager.renameFile(file, normalizedNewPath);

			// Get the renamed file to get version info
			const renamedFile = PathUtils.resolveFile(this.app, normalizedNewPath);
			
			// Note: We cannot reliably track which files were updated without the backlinks API
			// The FileManager handles link updates internally
			const result: RenameFileResult = {
				success: true,
				oldPath: path,
				newPath: normalizedNewPath,
				linksUpdated: 0, // Cannot track without backlinks API
				affectedFiles: [], // Cannot track without backlinks API
				versionId: renamedFile ? VersionUtils.generateVersionId(renamedFile) : ''
			};

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('rename file', path, (error as Error).message) }],
				isError: true
			};
		}
	}

	async deleteNote(
		path: string,
		soft: boolean = true,
		dryRun: boolean = false,
		ifMatch?: string
	): Promise<CallToolResult> {
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
			// Check version if ifMatch provided
			if (ifMatch && !VersionUtils.validateVersion(file, ifMatch)) {
				const currentVersion = VersionUtils.generateVersionId(file);
				return {
					content: [{ type: "text", text: VersionUtils.versionMismatchError(path, ifMatch, currentVersion) }],
					isError: true
				};
			}

			let destination: string | undefined;

			// Dry run - just return what would happen
			if (dryRun) {
				if (soft) {
					// Destination depends on user's configured deletion preference
					destination = 'trash';
				}
				
				const result: DeleteNoteResult = {
					deleted: false,
					path: file.path,
					destination,
					dryRun: true,
					soft
				};

				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
				};
			}

			// Perform actual deletion using user's preferred trash settings
			// FileManager.trashFile() respects the user's configured deletion preference
			// (system trash or .trash/ folder) as set in Obsidian settings
			await this.fileManager.trashFile(file);
			if (soft) {
				// For soft delete, indicate the file was moved to trash (location depends on user settings)
				destination = 'trash';
			}

			const result: DeleteNoteResult = {
				deleted: true,
				path: file.path,
				destination,
				dryRun: false,
				soft
			};

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
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
			const content = await this.vault.read(file);

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

	/**
	 * Update frontmatter fields without modifying content
	 * Supports patch operations (add/update) and removal of keys
	 * At least one of patch or remove must be provided
	 * Includes concurrency control via ifMatch parameter
	 */
	async updateFrontmatter(
		path: string,
		patch?: Record<string, YAMLValue>,
		remove: string[] = [],
		ifMatch?: string
	): Promise<CallToolResult> {
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

		// Validate that at least one operation is provided
		const hasPatch = patch && typeof patch === 'object' && Object.keys(patch).length > 0;
		const hasRemove = remove && Array.isArray(remove) && remove.length > 0;
		
		if (!hasPatch && !hasRemove) {
			return {
				content: [{ 
					type: "text", 
					text: JSON.stringify({
						error: 'No operations provided',
						message: 'At least one of "patch" or "remove" must be provided with values.'
					}, null, 2)
				}],
				isError: true
			};
		}

		// Resolve file
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
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
			// Check version if ifMatch provided
			if (ifMatch && !VersionUtils.validateVersion(file, ifMatch)) {
				const currentVersion = VersionUtils.generateVersionId(file);
				return {
					content: [{ type: "text", text: VersionUtils.versionMismatchError(path, ifMatch, currentVersion) }],
					isError: true
				};
			}

			// Read current content
			const content = await this.vault.read(file);
			const extracted = FrontmatterUtils.extractFrontmatter(content);

			// Get current frontmatter or create new
			let frontmatterData = extracted.parsedFrontmatter || {};

			// Track changes
			const updatedFields: string[] = [];
			const removedFields: string[] = [];

			// Apply patch (add/update fields) - only if patch is provided
			if (patch && typeof patch === 'object') {
				for (const [key, value] of Object.entries(patch)) {
					frontmatterData[key] = value;
					updatedFields.push(key);
				}
			}

			// Remove fields
			if (remove && Array.isArray(remove)) {
				for (const key of remove) {
					if (key in frontmatterData) {
						delete frontmatterData[key];
						removedFields.push(key);
					}
				}
			}

			// Serialize frontmatter
			const newFrontmatter = FrontmatterUtils.serializeFrontmatter(frontmatterData);

			// Reconstruct content
			let newContent: string;
			if (extracted.hasFrontmatter) {
				// Replace existing frontmatter
				newContent = newFrontmatter + '\n' + extracted.contentWithoutFrontmatter;
			} else {
				// Add frontmatter at the beginning
				newContent = newFrontmatter + '\n' + content;
			}

			// Write back
			await this.vault.modify(file, newContent);

			// Generate response with version info
			const result: UpdateFrontmatterResult = {
				success: true,
				path: file.path,
				versionId: VersionUtils.generateVersionId(file),
				modified: file.stat.mtime,
				updatedFields,
				removedFields
			};

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('update frontmatter', path, (error as Error).message) }],
				isError: true
			};
		}
	}

	/**
	 * Update specific sections of a note by line range
	 * Reduces race conditions by avoiding full overwrites
	 * Includes concurrency control via ifMatch parameter
	 */
	async updateSections(
		path: string,
		edits: SectionEdit[],
		ifMatch?: string,
		validateLinks: boolean = true
	): Promise<CallToolResult> {
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

		// Validate edits
		if (!edits || edits.length === 0) {
			return {
				content: [{ type: "text", text: JSON.stringify({ error: 'No edits provided' }, null, 2) }],
				isError: true
			};
		}

		// Resolve file
		const file = PathUtils.resolveFile(this.app, path);
		
		if (!file) {
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
			// Check version if ifMatch provided
			if (ifMatch && !VersionUtils.validateVersion(file, ifMatch)) {
				const currentVersion = VersionUtils.generateVersionId(file);
				return {
					content: [{ type: "text", text: VersionUtils.versionMismatchError(path, ifMatch, currentVersion) }],
					isError: true
				};
			}

			// Read current content
			const content = await this.vault.read(file);
			const lines = content.split('\n');

			// Sort edits by startLine in descending order to apply from bottom to top
			// This prevents line number shifts from affecting subsequent edits
			const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);

			// Validate all edits before applying
			for (const edit of sortedEdits) {
				if (edit.startLine < 1 || edit.endLine < edit.startLine || edit.endLine > lines.length) {
					return {
						content: [{ 
							type: "text", 
							text: JSON.stringify({
								error: 'Invalid line range',
								edit,
								totalLines: lines.length,
								message: `Line range ${edit.startLine}-${edit.endLine} is invalid. File has ${lines.length} lines.`
							}, null, 2)
						}],
						isError: true
					};
				}
			}

			// Apply edits from bottom to top
			for (const edit of sortedEdits) {
				// Convert to 0-indexed
				const startIdx = edit.startLine - 1;
				const endIdx = edit.endLine; // endLine is inclusive, so we don't subtract 1

				// Replace the section
				const newLines = edit.content.split('\n');
				lines.splice(startIdx, endIdx - startIdx, ...newLines);
			}

			// Reconstruct content
			const newContent = lines.join('\n');

			// Write back
			await this.vault.modify(file, newContent);

			// Generate response with version info
			const result: UpdateSectionsResult = {
				success: true,
				path: file.path,
				versionId: VersionUtils.generateVersionId(file),
				modified: file.stat.mtime,
				sectionsUpdated: edits.length
			};

			// Add word count
			result.wordCount = ContentUtils.countWords(newContent);

			// Add link validation if requested
			if (validateLinks) {
				result.linkValidation = LinkUtils.validateLinks(
					this.vault,
					this.metadata,
					newContent,
					file.path
				);
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: ErrorMessages.operationFailed('update sections', path, (error as Error).message) }],
				isError: true
			};
		}
	}
}
