import { App, TFile, TFolder } from 'obsidian';
import { CallToolResult, FileMetadata, DirectoryMetadata, VaultInfo, SearchResult, SearchMatch, StatResult, ExistsResult, ListResult, FileMetadataWithFrontmatter, FrontmatterSummary, WaypointSearchResult, FolderWaypointResult, FolderNoteResult } from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';
import { GlobUtils } from '../utils/glob-utils';
import { SearchUtils } from '../utils/search-utils';
import { WaypointUtils } from '../utils/waypoint-utils';

export class VaultTools {
	constructor(private app: App) {}

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
		
		if (isRootPath) {
			// List direct children of the root
			const allFiles = this.app.vault.getAllLoadedFiles();
			for (const item of allFiles) {
				// Skip the vault root itself
				// The vault root can have path === '' or path === '/' depending on Obsidian version
				if (item.path === '' || item.path === '/' || (item instanceof TFolder && item.isRoot())) {
					continue;
				}
				
				// Check if this item is a direct child of root
				// Root items have parent === null or parent.path === '' or parent.path === '/'
				const itemParent = item.parent?.path || '';
				if (itemParent === '' || itemParent === '/') {
					if (item instanceof TFile) {
						items.push(this.createFileMetadata(item));
					} else if (item instanceof TFolder) {
						items.push(this.createDirectoryMetadata(item));
					}
				}
			}
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

			// Check if it's a folder
			const folderObj = PathUtils.resolveFolder(this.app, normalizedPath);
			if (!folderObj) {
				// Check if it's a file instead
				if (PathUtils.fileExists(this.app, normalizedPath)) {
					return {
						content: [{ type: "text", text: ErrorMessages.notAFolder(normalizedPath) }],
						isError: true
					};
				}
				
				return {
					content: [{ type: "text", text: ErrorMessages.folderNotFound(normalizedPath) }],
					isError: true
				};
			}

			// Get direct children of the folder (non-recursive)
			const allFiles = this.app.vault.getAllLoadedFiles();
			for (const item of allFiles) {
				// Check if this item is a direct child of the target folder
				const itemParent = item.parent?.path || '';
				if (itemParent === normalizedPath) {
					if (item instanceof TFile) {
						items.push(this.createFileMetadata(item));
					} else if (item instanceof TFolder) {
						items.push(this.createDirectoryMetadata(item));
					}
				}
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
		let normalizedPath = '';

		if (!isRootPath) {
			// Validate non-root path
			if (!PathUtils.isValidVaultPath(path)) {
				return {
					content: [{ type: "text", text: ErrorMessages.invalidPath(path) }],
					isError: true
				};
			}

			// Normalize the path
			normalizedPath = PathUtils.normalizePath(path);

			// Check if it's a folder
			const folderObj = PathUtils.resolveFolder(this.app, normalizedPath);
			if (!folderObj) {
				// Check if it's a file instead
				if (PathUtils.fileExists(this.app, normalizedPath)) {
					return {
						content: [{ type: "text", text: ErrorMessages.notAFolder(normalizedPath) }],
						isError: true
					};
				}
				
				return {
					content: [{ type: "text", text: ErrorMessages.folderNotFound(normalizedPath) }],
					isError: true
				};
			}
		}

		// Collect items based on recursive flag
		const allFiles = this.app.vault.getAllLoadedFiles();
		
		for (const item of allFiles) {
			// Skip the vault root itself
			if (item.path === '' || item.path === '/' || (item instanceof TFolder && item.isRoot())) {
				continue;
			}

			// Determine if this item should be included based on path
			let shouldIncludeItem = false;

			if (isRootPath) {
				if (recursive) {
					// Include all items in the vault
					shouldIncludeItem = true;
				} else {
					// Include only direct children of root
					const itemParent = item.parent?.path || '';
					shouldIncludeItem = (itemParent === '' || itemParent === '/');
				}
			} else {
				if (recursive) {
					// Include items that are descendants of the target folder
					shouldIncludeItem = item.path.startsWith(normalizedPath + '/') || item.path === normalizedPath;
					// Exclude the folder itself
					if (item.path === normalizedPath) {
						shouldIncludeItem = false;
					}
				} else {
					// Include only direct children of the target folder
					const itemParent = item.parent?.path || '';
					shouldIncludeItem = (itemParent === normalizedPath);
				}
			}

			if (!shouldIncludeItem) {
				continue;
			}

			// Apply glob filtering
			if (!GlobUtils.shouldInclude(item.path, includes, excludes)) {
				continue;
			}

			// Apply type filtering
			if (item instanceof TFile) {
				if (only === 'directories') {
					continue;
				}
				
				const fileMetadata = await this.createFileMetadataWithFrontmatter(item, withFrontmatterSummary);
				items.push(fileMetadata);
			} else if (item instanceof TFolder) {
				if (only === 'files') {
					continue;
				}
				
				items.push(this.createDirectoryMetadata(item));
			}
		}

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
			const cache = this.app.metadataCache.getFileCache(file);
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

		// Check if it's a file
		const file = PathUtils.resolveFile(this.app, normalizedPath);
		if (file) {
			const result: StatResult = {
				path: normalizedPath,
				exists: true,
				kind: "file",
				metadata: this.createFileMetadata(file)
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Check if it's a folder
		const folder = PathUtils.resolveFolder(this.app, normalizedPath);
		if (folder) {
			const result: StatResult = {
				path: normalizedPath,
				exists: true,
				kind: "directory",
				metadata: this.createDirectoryMetadata(folder)
			};
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

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

		// Check if it's a file
		if (PathUtils.fileExists(this.app, normalizedPath)) {
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
		if (PathUtils.folderExists(this.app, normalizedPath)) {
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
}
