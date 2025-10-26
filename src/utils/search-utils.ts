import { TFile } from 'obsidian';
import { SearchMatch } from '../types/mcp-types';
import { GlobUtils } from './glob-utils';
import { IVaultAdapter } from '../adapters/interfaces';

export interface SearchOptions {
	query: string;
	isRegex?: boolean;
	caseSensitive?: boolean;
	includes?: string[];
	excludes?: string[];
	folder?: string;
	returnSnippets?: boolean;
	snippetLength?: number;
	maxResults?: number;
}

export interface SearchStatistics {
	filesSearched: number;
	filesWithMatches: number;
	totalMatches: number;
}

export class SearchUtils {
	/**
	 * Search vault files with advanced filtering and regex support
	 */
	static async search(
		vault: IVaultAdapter,
		options: SearchOptions
	): Promise<{ matches: SearchMatch[]; stats: SearchStatistics }> {
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

		const matches: SearchMatch[] = [];
		const filesWithMatches = new Set<string>();
		let filesSearched = 0;

		// Compile search pattern
		let searchPattern: RegExp;
		try {
			if (isRegex) {
				const flags = caseSensitive ? 'g' : 'gi';
				searchPattern = new RegExp(query, flags);
			} else {
				// Escape special regex characters for literal search
				const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const flags = caseSensitive ? 'g' : 'gi';
				searchPattern = new RegExp(escapedQuery, flags);
			}
		} catch (error) {
			throw new Error(`Invalid regex pattern: ${(error as Error).message}`);
		}

		// Get files to search
		let files = vault.getMarkdownFiles();

		// Filter by folder if specified
		if (folder) {
			const folderPath = folder.endsWith('/') ? folder : folder + '/';
			files = files.filter(file => 
				file.path.startsWith(folderPath) || file.path === folder
			);
		}

		// Apply glob filtering
		if (includes || excludes) {
			files = files.filter(file => 
				GlobUtils.shouldInclude(file.path, includes, excludes)
			);
		}

		// Search through files
		for (const file of files) {
			if (matches.length >= maxResults) {
				break;
			}

			filesSearched++;
			
			try {
				const content = await vault.read(file);
				const fileMatches = this.searchInFile(
					file,
					content,
					searchPattern,
					returnSnippets,
					snippetLength,
					maxResults - matches.length
				);

				if (fileMatches.length > 0) {
					filesWithMatches.add(file.path);
					matches.push(...fileMatches);
				}

				// Also search in filename
				const filenameMatches = this.searchInFilename(
					file,
					searchPattern,
					caseSensitive
				);
				
				if (filenameMatches.length > 0) {
					filesWithMatches.add(file.path);
					matches.push(...filenameMatches);
				}
			} catch (error) {
				// Skip files that can't be read
			}
		}

		return {
			matches,
			stats: {
				filesSearched,
				filesWithMatches: filesWithMatches.size,
				totalMatches: matches.length
			}
		};
	}

	/**
	 * Search within a single file's content
	 */
	private static searchInFile(
		file: TFile,
		content: string,
		pattern: RegExp,
		returnSnippets: boolean,
		snippetLength: number,
		maxMatches: number
	): SearchMatch[] {
		const matches: SearchMatch[] = [];
		const lines = content.split('\n');

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			if (matches.length >= maxMatches) {
				break;
			}

			const line = lines[lineIndex];
			
			// Reset regex lastIndex for global patterns
			pattern.lastIndex = 0;
			
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(line)) !== null) {
				if (matches.length >= maxMatches) {
					break;
				}

				const columnIndex = match.index;
				const matchText = match[0];

				// Extract snippet with context
				let snippet = line;
				let snippetStart = 0;
				let matchStart = columnIndex;

				if (returnSnippets && line.length > snippetLength) {
					// Calculate snippet boundaries
					const halfSnippet = Math.floor(snippetLength / 2);
					snippetStart = Math.max(0, columnIndex - halfSnippet);
					const snippetEnd = Math.min(line.length, snippetStart + snippetLength);
					
					// Adjust if we're at the end of the line
					if (snippetEnd === line.length && line.length > snippetLength) {
						snippetStart = Math.max(0, line.length - snippetLength);
					}
					
					snippet = line.substring(snippetStart, snippetEnd);
					matchStart = columnIndex - snippetStart;
				}

				matches.push({
					path: file.path,
					line: lineIndex + 1, // 1-indexed
					column: columnIndex + 1, // 1-indexed
					snippet: snippet,
					matchRanges: [{
						start: matchStart,
						end: matchStart + matchText.length
					}]
				});

				// Prevent infinite loop for zero-width matches
				if (match[0].length === 0) {
					pattern.lastIndex++;
				}
			}
		}

		return matches;
	}

	/**
	 * Search in filename
	 */
	private static searchInFilename(
		file: TFile,
		pattern: RegExp,
		caseSensitive: boolean
	): SearchMatch[] {
		const matches: SearchMatch[] = [];
		const basename = file.basename;
		
		// Reset regex lastIndex
		pattern.lastIndex = 0;
		
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(basename)) !== null) {
			const columnIndex = match.index;
			const matchText = match[0];

			matches.push({
				path: file.path,
				line: 0, // 0 indicates filename match
				column: columnIndex + 1, // 1-indexed
				snippet: basename,
				matchRanges: [{
					start: columnIndex,
					end: columnIndex + matchText.length
				}]
			});

			// Prevent infinite loop for zero-width matches
			if (match[0].length === 0) {
				pattern.lastIndex++;
			}
		}

		return matches;
	}

	/**
	 * Search for Waypoint markers in vault
	 */
	static async searchWaypoints(
		vault: IVaultAdapter,
		folder?: string
	): Promise<Array<{
		path: string;
		line: number;
		waypointRange: { start: number; end: number };
		content: string;
		links: string[];
	}>> {
		const results: Array<{
			path: string;
			line: number;
			waypointRange: { start: number; end: number };
			content: string;
			links: string[];
		}> = [];

		// Get files to search
		let files = vault.getMarkdownFiles();

		// Filter by folder if specified
		if (folder) {
			const folderPath = folder.endsWith('/') ? folder : folder + '/';
			files = files.filter(file => 
				file.path.startsWith(folderPath) || file.path === folder
			);
		}

		// Search for waypoint markers
		const waypointStartPattern = /%% Begin Waypoint %%/;
		const waypointEndPattern = /%% End Waypoint %%/;
		const linkPattern = /\[\[([^\]]+)\]\]/g;

		for (const file of files) {
			try {
				const content = await vault.read(file);
				const lines = content.split('\n');

				let inWaypoint = false;
				let waypointStart = -1;
				let waypointContent: string[] = [];

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];

					if (waypointStartPattern.test(line)) {
						inWaypoint = true;
						waypointStart = i + 1; // 1-indexed
						waypointContent = [];
					} else if (waypointEndPattern.test(line) && inWaypoint) {
						// Extract links from waypoint content
						const contentStr = waypointContent.join('\n');
						const links: string[] = [];
						let linkMatch: RegExpExecArray | null;
						
						while ((linkMatch = linkPattern.exec(contentStr)) !== null) {
							links.push(linkMatch[1]);
						}

						results.push({
							path: file.path,
							line: waypointStart,
							waypointRange: {
								start: waypointStart,
								end: i + 1 // 1-indexed
							},
							content: contentStr,
							links: links
						});

						inWaypoint = false;
						waypointStart = -1;
						waypointContent = [];
					} else if (inWaypoint) {
						waypointContent.push(line);
					}
				}
			} catch (error) {
				// Skip files that can't be searched
			}
		}

		return results;
	}
}
