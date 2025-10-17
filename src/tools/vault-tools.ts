import { App, TFile, TFolder } from 'obsidian';
import { CallToolResult, FileMetadata, DirectoryMetadata, VaultInfo, SearchResult, SearchMatch } from '../types/mcp-types';
import { PathUtils } from '../utils/path-utils';
import { ErrorMessages } from '../utils/error-messages';

export class VaultTools {
	constructor(private app: App) {}

	async searchNotes(query: string): Promise<CallToolResult> {
		const files = this.app.vault.getMarkdownFiles();
		const matches: SearchMatch[] = [];
		let filesSearched = 0;
		const filesWithMatches = new Set<string>();

		const queryLower = query.toLowerCase();

		for (const file of files) {
			filesSearched++;
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			// Search in content
			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				const lineLower = line.toLowerCase();
				let columnIndex = lineLower.indexOf(queryLower);

				while (columnIndex !== -1) {
					filesWithMatches.add(file.path);
					
					// Extract snippet (50 chars before and after match)
					const snippetStart = Math.max(0, columnIndex - 50);
					const snippetEnd = Math.min(line.length, columnIndex + query.length + 50);
					const snippet = line.substring(snippetStart, snippetEnd);
					
					matches.push({
						path: file.path,
						line: lineIndex + 1, // 1-indexed
						column: columnIndex + 1, // 1-indexed
						snippet: snippet,
						matchRanges: [{
							start: columnIndex - snippetStart,
							end: columnIndex - snippetStart + query.length
						}]
					});

					// Find next occurrence in the same line
					columnIndex = lineLower.indexOf(queryLower, columnIndex + 1);
				}
			}

			// Also check filename
			if (file.basename.toLowerCase().includes(queryLower)) {
				filesWithMatches.add(file.path);
				// Add a match for the filename itself
				const nameIndex = file.basename.toLowerCase().indexOf(queryLower);
				matches.push({
					path: file.path,
					line: 0, // 0 indicates filename match
					column: nameIndex + 1,
					snippet: file.basename,
					matchRanges: [{
						start: nameIndex,
						end: nameIndex + query.length
					}]
				});
			}
		}

		const result: SearchResult = {
			query: query,
			matches: matches,
			totalMatches: matches.length,
			filesSearched: filesSearched,
			filesWithMatches: filesWithMatches.size
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	}

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
}
