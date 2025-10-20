import { App, TFile, TFolder } from 'obsidian';
import { CallToolResult, FileMetadata, DirectoryMetadata, VaultInfo, SearchResult, SearchMatch, StatResult, ExistsResult, ListResult, FileMetadataWithFrontmatter, FrontmatterSummary, WaypointSearchResult, FolderWaypointResult, FolderNoteResult, ValidateWikilinksResult, ResolveWikilinkResult, BacklinksResult } from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';
import { GlobUtils } from '../utils/glob-utils';
import { SearchUtils } from '../utils/search-utils';
import { WaypointUtils } from '../utils/waypoint-utils';
import { LinkUtils } from '../utils/link-utils';
import { IVaultAdapter, IMetadataCacheAdapter } from '../adapters/interfaces';

export class VaultTools {
	constructor(
		private vault: IVaultAdapter,
		private metadata: IMetadataCacheAdapter,
		private app: App  // Keep temporarily for methods not yet migrated
	) {}

	async getVaultInfo(): Promise<CallToolResult> {
		const files = this.app.vault.getFiles();
		const markdownFiles = this.app.vault.getMarkdownFiles();
		const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder);
		
		// Calculate total size
		let totalSize = 0;
		for (const file of files) {
			if (file instanceof TFile) {
				totalSize += file.stat.size;
			}
		}
		
		const info: VaultInfo = {
			name: this.app.vault.getName(),
			path: (this.app.vault.adapter as any).basePath || 'Unknown',
			totalFiles: files.length,
			totalFolders: folders.length,
			markdownFiles: markdownFiles.length,
			totalSize: totalSize
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(info, null, 2)
			}]
		};
	}

	async listNotes(path?: string): Promise<CallToolResult> {
		let items: Array<FileMetadata | DirectoryMetadata> = [];

		// Normalize root path: undefined, empty string "", or "." all mean root
		const isRootPath = !path || path === '' || path === '.';

		let targetFolder: TFolder;

		if (isRootPath) {
			// Get the root folder using adapter
			targetFolder = this.vault.getRoot();
		} else {
			// Validate non-root path
			if (!PathUtils.isValidVaultPath(path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
					isError: true
				};
			}

			// Normalize the path
			const normalizedPath = PathUtils.normalizePath(path);

			// Get folder using adapter
			const folderObj = this.vault.getAbstractFileByPath(normalizedPath);

			if (!folderObj) {
				return {
					content: [{ type: "text", text: ErrorMessages.folderNotFound(normalizedPath) }],
					isError: true
				};
			}

			// Check if it's a folder
			if (!(folderObj instanceof TFolder)) {
				return {
					content: [{ type: "text", text: ErrorMessages.notAFolder(normalizedPath) }],
					isError: true
				};
			}

			targetFolder = folderObj;
		}

		// Iterate over direct children of the folder
		for (const item of targetFolder.children) {
			// Skip the vault root itself
			if (item.path === '' || item.path === '/' || (item instanceof TFolder && item.isRoot())) {
				continue;
			}

			if (item instanceof TFile) {
				items.push(this.createFileMetadata(item));
			} else if (item instanceof TFolder) {
				items.push(this.createDirectoryMetadata(item));
			}
		}

		// Sort: directories first, then files, alphabetically within each group
		// Use case-insensitive comparison for stable, consistent ordering
		items.sort((a, b) => {
			if (a.kind !== b.kind) {
				return a.kind === 'directory' ? -1 : 1;
			}
			// Case-insensitive alphabetical sort within each group
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});

		return {
			content: [{
				type: "text",
				text: JSON.stringify(items, null, 2)
			}]
		};
	}

	// Phase 4: Enhanced List Operations
	async list(options: {
		path?: string;
		recursive?: boolean;
		includes?: string[];
		excludes?: string[];
		only?: 'files' | 'directories' | 'any';
		limit?: number;
		cursor?: string;
		withFrontmatterSummary?: boolean;
	}): Promise<CallToolResult> {
		const {
			path,
			recursive = false,
			includes,
			excludes,
			only = 'any',
			limit,
			cursor,
			withFrontmatterSummary = false
		} = options;

		let items: Array<FileMetadataWithFrontmatter | DirectoryMetadata> = [];

		// Normalize root path: undefined, empty string "", or "." all mean root
		const isRootPath = !path || path === '' || path === '.';

		let targetFolder: TFolder;

		if (isRootPath) {
			// Get the root folder using adapter
			targetFolder = this.vault.getRoot();
		} else {
			// Validate non-root path
			if (!PathUtils.isValidVaultPath(path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
					isError: true
				};
			}

			// Normalize the path
			const normalizedPath = PathUtils.normalizePath(path);

			// Get folder using adapter
			const folderObj = this.vault.getAbstractFileByPath(normalizedPath);

			if (!folderObj) {
				return {
					content: [{ type: "text", text: ErrorMessages.folderNotFound(normalizedPath) }],
					isError: true
				};
			}

			// Check if it's a folder
			if (!(folderObj instanceof TFolder)) {
				return {
					content: [{ type: "text", text: ErrorMessages.notAFolder(normalizedPath) }],
					isError: true
				};
			}

			targetFolder = folderObj;
		}

		// Collect items based on recursive flag
		await this.collectItems(targetFolder, items, recursive, includes, excludes, only, withFrontmatterSummary);

		// Sort: directories first, then files, alphabetically within each group
		items.sort((a, b) => {
			if (a.kind !== b.kind) {
				return a.kind === 'directory' ? -1 : 1;
			}
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});

		// Handle cursor-based pagination
		let startIndex = 0;
		if (cursor) {
			// Cursor is the path of the last item from the previous page
			const cursorIndex = items.findIndex(item => item.path === cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		// Apply limit and pagination
		const totalCount = items.length;
		let paginatedItems = items.slice(startIndex);
		let hasMore = false;
		let nextCursor: string | undefined;

		if (limit && limit > 0 && paginatedItems.length > limit) {
			paginatedItems = paginatedItems.slice(0, limit);
			hasMore = true;
			// Set cursor to the path of the last item in this page
			nextCursor = paginatedItems[paginatedItems.length - 1].path;
		}

		const result: ListResult = {
			items: paginatedItems,
			totalCount: totalCount,
			hasMore: hasMore,
			nextCursor: nextCursor
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	}

	/**
	 * Helper method to recursively collect items from a folder
	 */
	private async collectItems(
		folder: TFolder,
		items: Array<FileMetadataWithFrontmatter | DirectoryMetadata>,
		recursive: boolean,
		includes?: string[],
		excludes?: string[],
		only?: 'files' | 'directories' | 'any',
		withFrontmatterSummary?: boolean
	): Promise<void> {
		for (const item of folder.children) {
			// Skip the vault root itself
			if (item.path === '' || item.path === '/' || (item instanceof TFolder && item.isRoot())) {
				continue;
			}

			// Apply glob filtering
			if (!GlobUtils.shouldInclude(item.path, includes, excludes)) {
				continue;
			}

			// Apply type filtering and add items
			if (item instanceof TFile) {
				if (only !== 'directories') {
					const fileMetadata = await this.createFileMetadataWithFrontmatter(item, withFrontmatterSummary || false);
					items.push(fileMetadata);
				}
			} else if (item instanceof TFolder) {
				if (only !== 'files') {
					items.push(this.createDirectoryMetadata(item));
				}

				// Recursively collect from subfolders if needed
				if (recursive) {
					await this.collectItems(item, items, recursive, includes, excludes, only, withFrontmatterSummary);
				}
			}
		}
	}

	private async createFileMetadataWithFrontmatter(
		file: TFile,
		withFrontmatterSummary: boolean
	): Promise<FileMetadataWithFrontmatter> {
		const baseMetadata = this.createFileMetadata(file);

		if (!withFrontmatterSummary || file.extension !== 'md') {
			return baseMetadata;
		}

		// Extract frontmatter without reading full content
		try {
			const cache = this.metadata.getFileCache(file);
			if (cache?.frontmatter) {
				const summary: FrontmatterSummary = {};

				// Extract common frontmatter fields
				if (cache.frontmatter.title) {
					summary.title = cache.frontmatter.title;
				}
				if (cache.frontmatter.tags) {
					// Tags can be string or array
					if (Array.isArray(cache.frontmatter.tags)) {
						summary.tags = cache.frontmatter.tags;
					} else if (typeof cache.frontmatter.tags === 'string') {
						summary.tags = [cache.frontmatter.tags];
					}
				}
				if (cache.frontmatter.aliases) {
					// Aliases can be string or array
					if (Array.isArray(cache.frontmatter.aliases)) {
						summary.aliases = cache.frontmatter.aliases;
					} else if (typeof cache.frontmatter.aliases === 'string') {
						summary.aliases = [cache.frontmatter.aliases];
					}
				}

				// Include all other frontmatter fields
				for (const key in cache.frontmatter) {
					if (key !== 'title' && key !== 'tags' && key !== 'aliases' && key !== 'position') {
						summary[key] = cache.frontmatter[key];
					}
				}

				return {
					...baseMetadata,
					frontmatterSummary: summary
				};
			}
		} catch (error) {
			// If frontmatter extraction fails, just return base metadata
			console.error(`Failed to extract frontmatter for ${file.path}:`, error);
		}

		return baseMetadata;
	}

	private createFileMetadata(file: TFile): FileMetadata {
		return {
			kind: "file",
			name: file.name,
			path: file.path,
			extension: file.extension,
			size: file.stat.size,
			modified: file.stat.mtime,
			created: file.stat.ctime
		};
	}

	private createDirectoryMetadata(folder: TFolder): DirectoryMetadata {
		// Count direct children
		const childrenCount = folder.children.length;
		
		// Try to get modified time from filesystem if available
		// Note: Obsidian's TFolder doesn't have a stat property in the official API
		// We try to access it anyway in case it's populated at runtime
		// In most cases, this will be 0 for directories
		let modified = 0;
		try {
			if ((folder as any).stat && typeof (folder as any).stat.mtime === 'number') {
				modified = (folder as any).stat.mtime;
			}
		} catch (error) {
			// Silently fail - modified will remain 0
		}
		
		return {
			kind: "directory",
			name: folder.name,
			path: folder.path,
			childrenCount: childrenCount,
			modified: modified
		};
	}

	// Phase 3: Discovery Endpoints
	async stat(path: string): Promise<CallToolResult> {
		// Validate path
		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Normalize the path
		const normalizedPath = PathUtils.normalizePath(path);

		// Get file or folder using adapter
		const item = this.vault.getAbstractFileByPath(normalizedPath);

		if (!item) {
			// Path doesn't exist
			const result: StatResult = {
				path: normalizedPath,
				exists: false
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Check if it's a file
		if (item instanceof TFile) {
			const result: StatResult = {
				path: normalizedPath,
				exists: true,
				kind: "file",
				metadata: this.createFileMetadata(item)
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Check if it's a folder
		if (item instanceof TFolder) {
			const result: StatResult = {
				path: normalizedPath,
				exists: true,
				kind: "directory",
				metadata: this.createDirectoryMetadata(item)
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Path doesn't exist (shouldn't reach here)
		const result: StatResult = {
			path: normalizedPath,
			exists: false
		};
		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	}

	async exists(path: string): Promise<CallToolResult> {
		// Validate path
		if (!PathUtils.isValidVaultPath(path)) {
			return {
				content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
				isError: true
			};
		}

		// Normalize the path
		const normalizedPath = PathUtils.normalizePath(path);

		// Get file or folder using adapter
		const item = this.vault.getAbstractFileByPath(normalizedPath);

		if (!item) {
			// Path doesn't exist
			const result: ExistsResult = {
				path: normalizedPath,
				exists: false
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Check if it's a file
		if (item instanceof TFile) {
			const result: ExistsResult = {
				path: normalizedPath,
				exists: true,
				kind: "file"
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Check if it's a folder
		if (item instanceof TFolder) {
			const result: ExistsResult = {
				path: normalizedPath,
				exists: true,
				kind: "directory"
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Path doesn't exist (shouldn't reach here)
		const result: ExistsResult = {
			path: normalizedPath,
			exists: false
		};
		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	}

	// Phase 6: Powerful Search
	async search(options: {
		query: string;
		isRegex?: boolean;
		caseSensitive?: boolean;
		includes?: string[];
		excludes?: string[];
		folder?: string;
		returnSnippets?: boolean;
		snippetLength?: number;
		maxResults?: number;
	}): Promise<CallToolResult> {
		const {
			query,
			isRegex = false,
			caseSensitive = false,
			includes,
			excludes,
			folder,
			returnSnippets = true,
			snippetLength = 100,
			maxResults = 100
		} = options;

		try {
			const { matches, stats } = await SearchUtils.search(this.app, {
				query,
				isRegex,
				caseSensitive,
				includes,
				excludes,
				folder,
				returnSnippets,
				snippetLength,
				maxResults
			});

			const result: SearchResult = {
				query,
				isRegex,
				matches,
				totalMatches: stats.totalMatches,
				filesSearched: stats.filesSearched,
				filesWithMatches: stats.filesWithMatches
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Search error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	async searchWaypoints(folder?: string): Promise<CallToolResult> {
		try {
			const waypoints = await SearchUtils.searchWaypoints(this.app, folder);

			const result: WaypointSearchResult = {
				waypoints,
				totalWaypoints: waypoints.length,
				filesSearched: this.app.vault.getMarkdownFiles().filter(file => {
					if (!folder) return true;
					const folderPath = folder.endsWith('/') ? folder : folder + '/';
					return file.path.startsWith(folderPath) || file.path === folder;
				}).length
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Waypoint search error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	async getFolderWaypoint(path: string): Promise<CallToolResult> {
		try {
			// Normalize and validate path
			const normalizedPath = PathUtils.normalizePath(path);
			
			// Resolve file
			const file = PathUtils.resolveFile(this.app, normalizedPath);
			if (!file) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.fileNotFound(normalizedPath)
					}],
					isError: true
				};
			}

			// Read file content
			const content = await this.app.vault.read(file);

			// Extract waypoint block
			const waypointBlock = WaypointUtils.extractWaypointBlock(content);

			const result: FolderWaypointResult = {
				path: file.path,
				hasWaypoint: waypointBlock.hasWaypoint,
				waypointRange: waypointBlock.waypointRange,
				links: waypointBlock.links,
				rawContent: waypointBlock.rawContent
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Get folder waypoint error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	async isFolderNote(path: string): Promise<CallToolResult> {
		try {
			// Normalize and validate path
			const normalizedPath = PathUtils.normalizePath(path);
			
			// Resolve file
			const file = PathUtils.resolveFile(this.app, normalizedPath);
			if (!file) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.fileNotFound(normalizedPath)
					}],
					isError: true
				};
			}

			// Check if it's a folder note
			const folderNoteInfo = await WaypointUtils.isFolderNote(this.app, file);

			const result: FolderNoteResult = {
				path: file.path,
				isFolderNote: folderNoteInfo.isFolderNote,
				reason: folderNoteInfo.reason,
				folderPath: folderNoteInfo.folderPath
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Is folder note error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	/**
	 * Validate all wikilinks in a note
	 * Reports resolved and unresolved links with suggestions
	 */
	async validateWikilinks(path: string): Promise<CallToolResult> {
		try {
			// Normalize and validate path
			const normalizedPath = PathUtils.normalizePath(path);
			
			// Resolve file
			const file = PathUtils.resolveFile(this.app, normalizedPath);
			if (!file) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.fileNotFound(normalizedPath)
					}],
					isError: true
				};
			}

			// Validate wikilinks
			const { resolvedLinks, unresolvedLinks } = await LinkUtils.validateWikilinks(
				this.app,
				normalizedPath
			);

			const result: ValidateWikilinksResult = {
				path: normalizedPath,
				totalLinks: resolvedLinks.length + unresolvedLinks.length,
				resolvedLinks,
				unresolvedLinks
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Validate wikilinks error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	/**
	 * Resolve a single wikilink from a source note
	 * Returns the target path if resolvable, or suggestions if not
	 */
	async resolveWikilink(sourcePath: string, linkText: string): Promise<CallToolResult> {
		try {
			// Normalize and validate source path
			const normalizedPath = PathUtils.normalizePath(sourcePath);
			
			// Resolve source file
			const file = PathUtils.resolveFile(this.app, normalizedPath);
			if (!file) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.fileNotFound(normalizedPath)
					}],
					isError: true
				};
			}

			// Try to resolve the link
			const resolvedFile = LinkUtils.resolveLink(this.app, normalizedPath, linkText);

			const result: ResolveWikilinkResult = {
				sourcePath: normalizedPath,
				linkText,
				resolved: resolvedFile !== null,
				targetPath: resolvedFile?.path
			};

			// If not resolved, provide suggestions
			if (!resolvedFile) {
				result.suggestions = LinkUtils.findSuggestions(this.app, linkText);
			}

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Resolve wikilink error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}

	/**
	 * Get all backlinks to a note
	 * Optionally includes unlinked mentions
	 */
	async getBacklinks(
		path: string,
		includeUnlinked: boolean = false,
		includeSnippets: boolean = true
	): Promise<CallToolResult> {
		try {
			// Normalize and validate path
			const normalizedPath = PathUtils.normalizePath(path);
			
			// Resolve file
			const file = PathUtils.resolveFile(this.app, normalizedPath);
			if (!file) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.fileNotFound(normalizedPath)
					}],
					isError: true
				};
			}

			// Get backlinks
			const backlinks = await LinkUtils.getBacklinks(
				this.app,
				normalizedPath,
				includeUnlinked
			);

			// If snippets not requested, remove them
			if (!includeSnippets) {
				for (const backlink of backlinks) {
					for (const occurrence of backlink.occurrences) {
						occurrence.snippet = '';
					}
				}
			}

			const result: BacklinksResult = {
				path: normalizedPath,
				backlinks,
				totalBacklinks: backlinks.length
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `Get backlinks error: ${(error as Error).message}`
				}],
				isError: true
			};
		}
	}
}
