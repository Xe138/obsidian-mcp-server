import { TFile } from 'obsidian';
import { IVaultAdapter, IMetadataCacheAdapter } from '../adapters/interfaces';

/**
 * Parsed wikilink structure
 */
export interface WikiLink {
	/** Full link text including brackets: [[link]] or [[link|alias]] */
	raw: string;
	/** Link target (the part before |) */
	target: string;
	/** Display alias (the part after |), if present */
	alias?: string;
	/** Line number where the link appears (1-indexed) */
	line: number;
	/** Column where the link starts (0-indexed) */
	column: number;
}

/**
 * Resolved link information
 */
export interface ResolvedLink {
	/** Original link text */
	text: string;
	/** Resolved target file path */
	target: string;
	/** Display alias, if present */
	alias?: string;
}

/**
 * Unresolved link information
 */
export interface UnresolvedLink {
	/** Original link text */
	text: string;
	/** Line number where the link appears */
	line: number;
	/** Suggested potential matches */
	suggestions: string[];
}

/**
 * Broken link information (note doesn't exist)
 */
export interface BrokenNoteLink {
	/** Original link text */
	link: string;
	/** Line number where the link appears */
	line: number;
	/** Context snippet around the link */
	context: string;
}

/**
 * Broken heading link information (note exists but heading doesn't)
 */
export interface BrokenHeadingLink {
	/** Original link text */
	link: string;
	/** Line number where the link appears */
	line: number;
	/** Context snippet around the link */
	context: string;
	/** The note path that exists */
	note: string;
}

/**
 * Link validation result
 */
export interface LinkValidationResult {
	/** Array of valid links */
	valid: string[];
	/** Array of broken note links (note doesn't exist) */
	brokenNotes: BrokenNoteLink[];
	/** Array of broken heading links (note exists but heading doesn't) */
	brokenHeadings: BrokenHeadingLink[];
	/** Human-readable summary */
	summary: string;
}

/**
 * Backlink occurrence in a file
 */
export interface BacklinkOccurrence {
	/** Line number where the backlink appears */
	line: number;
	/** Context snippet around the backlink */
	snippet: string;
}

/**
 * Backlink from a source file
 */
export interface Backlink {
	/** Source file path that contains the link */
	sourcePath: string;
	/** Type of backlink: linked (wikilink) or unlinked (text mention) */
	type: 'linked' | 'unlinked';
	/** List of occurrences in the source file */
	occurrences: BacklinkOccurrence[];
}

/**
 * Utilities for working with wikilinks and backlinks
 */
export class LinkUtils {
	/**
	 * Regex pattern for matching wikilinks: [[target]] or [[target|alias]]
	 * Matches:
	 * - [[simple link]]
	 * - [[link with spaces]]
	 * - [[link|with alias]]
	 * - [[folder/nested link]]
	 * - [[link#heading]]
	 * - [[link#heading|alias]]
	 */
	private static readonly WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

	/**
	 * Parse all wikilinks from content
	 * @param content File content to parse
	 * @returns Array of parsed wikilinks with positions
	 */
	static parseWikilinks(content: string): WikiLink[] {
		const links: WikiLink[] = [];
		const lines = content.split('\n');

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];
			const regex = new RegExp(this.WIKILINK_REGEX);
			let match: RegExpExecArray | null;

			while ((match = regex.exec(line)) !== null) {
				const raw = match[0];
				const target = match[1].trim();
				const alias = match[2]?.trim();

				links.push({
					raw,
					target,
					alias,
					line: lineIndex + 1, // 1-indexed
					column: match.index
				});
			}
		}

		return links;
	}

	/**
	 * Resolve a wikilink to its target file
	 * Uses Obsidian's MetadataCache for accurate resolution
	 *
	 * @param vault Vault adapter for file operations
	 * @param metadata Metadata cache adapter for link resolution
	 * @param sourcePath Path of the file containing the link
	 * @param linkText Link text (without brackets)
	 * @returns Resolved file or null if not found
	 */
	static resolveLink(vault: IVaultAdapter, metadata: IMetadataCacheAdapter, sourcePath: string, linkText: string): TFile | null {
		// Get the source file
		const sourceFile = vault.getAbstractFileByPath(sourcePath);
		if (!(sourceFile instanceof TFile)) {
			return null;
		}

		// Use Obsidian's MetadataCache to resolve the link
		// This handles all of Obsidian's link resolution rules:
		// - Shortest path matching
		// - Relative paths
		// - Aliases
		// - Headings and blocks
		const resolvedFile = metadata.getFirstLinkpathDest(linkText, sourcePath);

		return resolvedFile;
	}

	/**
	 * Find potential matches for an unresolved link
	 * Uses fuzzy matching on file names
	 *
	 * @param vault Vault adapter for file operations
	 * @param linkText Link text to find matches for
	 * @param maxSuggestions Maximum number of suggestions to return
	 * @returns Array of suggested file paths
	 */
	static findSuggestions(vault: IVaultAdapter, linkText: string, maxSuggestions: number = 5): string[] {
		const allFiles = vault.getMarkdownFiles();
		const suggestions: Array<{ path: string; score: number }> = [];

		// Remove heading/block references for matching
		const cleanLinkText = linkText.split('#')[0].split('^')[0].toLowerCase();

		for (const file of allFiles) {
			const fileName = file.basename.toLowerCase();
			const filePath = file.path.toLowerCase();

			// Calculate similarity score
			let score = 0;

			// Exact basename match (highest priority)
			if (fileName === cleanLinkText) {
				score = 1000;
			}
			// Basename contains link text
			else if (fileName.includes(cleanLinkText)) {
				score = 500 + (cleanLinkText.length / fileName.length) * 100;
			}
			// Path contains link text
			else if (filePath.includes(cleanLinkText)) {
				score = 250 + (cleanLinkText.length / filePath.length) * 100;
			}
			// Levenshtein-like: count matching characters
			else {
				let matchCount = 0;
				for (const char of cleanLinkText) {
					if (fileName.includes(char)) {
						matchCount++;
					}
				}
				score = (matchCount / cleanLinkText.length) * 100;
			}

			if (score > 0) {
				suggestions.push({ path: file.path, score });
			}
		}

		// Sort by score (descending) and return top N
		suggestions.sort((a, b) => b.score - a.score);
		return suggestions.slice(0, maxSuggestions).map(s => s.path);
	}

	/**
	 * Get all backlinks to a file
	 * Uses Obsidian's MetadataCache for accurate backlink detection
	 *
	 * @param vault Vault adapter for file operations
	 * @param metadata Metadata cache adapter for link resolution
	 * @param targetPath Path of the file to find backlinks for
	 * @param includeUnlinked Whether to include unlinked mentions
	 * @returns Array of backlinks
	 */
	static async getBacklinks(
		vault: IVaultAdapter,
		metadata: IMetadataCacheAdapter,
		targetPath: string,
		includeUnlinked: boolean = false
	): Promise<Backlink[]> {
		const backlinks: Backlink[] = [];
		const targetFile = vault.getAbstractFileByPath(targetPath);

		if (!(targetFile instanceof TFile)) {
			return backlinks;
		}

		// Get the target file's basename for matching
		const targetBasename = targetFile.basename;

		// Get all backlinks from MetadataCache using resolvedLinks
		// resolvedLinks is a map of: sourcePath -> { targetPath: linkCount }
		const resolvedLinks = metadata.resolvedLinks;
		
		// Find all files that link to our target
		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			// Check if this source file links to our target
			if (!links[targetPath]) {
				continue;
			}

			const sourceFile = vault.getAbstractFileByPath(sourcePath);
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			// Read the source file to find link occurrences
			const content = await vault.read(sourceFile);
			const lines = content.split('\n');
			const occurrences: BacklinkOccurrence[] = [];

			// Parse wikilinks in the source file to find references to target
			const wikilinks = this.parseWikilinks(content);

			for (const link of wikilinks) {
				// Resolve this link to see if it points to our target
				const resolvedFile = this.resolveLink(vault, metadata, sourcePath, link.target);
				
				if (resolvedFile && resolvedFile.path === targetPath) {
					const snippet = this.extractSnippet(lines, link.line - 1, 100);
					occurrences.push({
						line: link.line,
						snippet
					});
				}
			}

			if (occurrences.length > 0) {
				backlinks.push({
					sourcePath,
					type: 'linked',
					occurrences
				});
			}
		}

		// Process unlinked mentions if requested
		if (includeUnlinked) {
			const allFiles = vault.getMarkdownFiles();

			// Build a set of files that already have linked backlinks
			const linkedSourcePaths = new Set(backlinks.map(b => b.sourcePath));

			for (const file of allFiles) {
				// Skip if already in linked backlinks
				if (linkedSourcePaths.has(file.path)) {
					continue;
				}

				// Skip the target file itself
				if (file.path === targetPath) {
					continue;
				}

				const content = await vault.read(file);
				const lines = content.split('\n');
				const occurrences: BacklinkOccurrence[] = [];

				// Search for unlinked mentions of the target basename
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					
					// Use word boundary regex to find whole word matches
					const regex = new RegExp(`\\b${this.escapeRegex(targetBasename)}\\b`, 'gi');
					
					if (regex.test(line)) {
						const snippet = this.extractSnippet(lines, i, 100);
						occurrences.push({
							line: i + 1, // 1-indexed
							snippet
						});
					}
				}

				if (occurrences.length > 0) {
					backlinks.push({
						sourcePath: file.path,
						type: 'unlinked',
						occurrences
					});
				}
			}
		}

		return backlinks;
	}

	/**
	 * Extract a snippet of text around a specific line
	 * @param lines Array of lines
	 * @param lineIndex Line index (0-indexed)
	 * @param maxLength Maximum snippet length
	 * @returns Snippet text
	 */
	private static extractSnippet(lines: string[], lineIndex: number, maxLength: number): string {
		const line = lines[lineIndex] || '';
		
		// If line is short enough, return it as-is
		if (line.length <= maxLength) {
			return line;
		}

		// Truncate and add ellipsis
		const half = Math.floor(maxLength / 2);
		return line.substring(0, half) + '...' + line.substring(line.length - half);
	}

	/**
	 * Escape special regex characters
	 * @param str String to escape
	 * @returns Escaped string
	 */
	private static escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Validate all wikilinks in a file
	 * @param vault Vault adapter for file operations
	 * @param metadata Metadata cache adapter for link resolution
	 * @param filePath Path of the file to validate
	 * @returns Object with resolved and unresolved links
	 */
	static async validateWikilinks(
		vault: IVaultAdapter,
		metadata: IMetadataCacheAdapter,
		filePath: string
	): Promise<{
		resolvedLinks: ResolvedLink[];
		unresolvedLinks: UnresolvedLink[];
	}> {
		const file = vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return { resolvedLinks: [], unresolvedLinks: [] };
		}

		const content = await vault.read(file);
		const wikilinks = this.parseWikilinks(content);

		const resolvedLinks: ResolvedLink[] = [];
		const unresolvedLinks: UnresolvedLink[] = [];

		for (const link of wikilinks) {
			const resolvedFile = this.resolveLink(vault, metadata, filePath, link.target);

			if (resolvedFile) {
				resolvedLinks.push({
					text: link.raw,
					target: resolvedFile.path,
					alias: link.alias
				});
			} else {
				const suggestions = this.findSuggestions(vault, link.target);
				unresolvedLinks.push({
					text: link.raw,
					line: link.line,
					suggestions
				});
			}
		}

		return { resolvedLinks, unresolvedLinks };
	}

	/**
	 * Validate all links in content (wikilinks, heading links, and embeds)
	 * Returns categorized results: valid, broken notes, and broken headings
	 *
	 * @param vault Vault adapter for file operations
	 * @param metadata Metadata cache adapter for link resolution
	 * @param content File content to validate
	 * @param sourcePath Path of the file containing the links
	 * @returns Structured validation result with categorized links
	 */
	static validateLinks(
		vault: IVaultAdapter,
		metadata: IMetadataCacheAdapter,
		content: string,
		sourcePath: string
	): LinkValidationResult {
		const valid: string[] = [];
		const brokenNotes: BrokenNoteLink[] = [];
		const brokenHeadings: BrokenHeadingLink[] = [];

		// Parse all wikilinks from content (includes embeds which start with !)
		const wikilinks = this.parseWikilinks(content);
		const lines = content.split('\n');

		for (const link of wikilinks) {
			// Check if this is a heading link
			const hasHeading = link.target.includes('#');

			if (hasHeading) {
				// Split note path and heading
				const [notePath, ...headingParts] = link.target.split('#');
				const heading = headingParts.join('#'); // Rejoin in case heading has # in it

				// Try to resolve the note
				const resolvedFile = this.resolveLink(vault, metadata, sourcePath, notePath || sourcePath);

				if (!resolvedFile) {
					// Note doesn't exist
					const context = this.extractSnippet(lines, link.line - 1, 100);
					brokenNotes.push({
						link: link.raw,
						line: link.line,
						context
					});
				} else {
					// Note exists, check if heading exists
					const fileCache = metadata.getFileCache(resolvedFile);
					const headings = fileCache?.headings || [];

					// Normalize heading for comparison (remove # and trim)
					const normalizedHeading = heading.trim().toLowerCase();
					const headingExists = headings.some(h =>
						h.heading.trim().toLowerCase() === normalizedHeading
					);

					if (headingExists) {
						// Both note and heading exist
						valid.push(link.raw);
					} else {
						// Note exists but heading doesn't
						const context = this.extractSnippet(lines, link.line - 1, 100);
						brokenHeadings.push({
							link: link.raw,
							line: link.line,
							context,
							note: resolvedFile.path
						});
					}
				}
			} else {
				// Regular link or embed (no heading)
				const resolvedFile = this.resolveLink(vault, metadata, sourcePath, link.target);

				if (resolvedFile) {
					valid.push(link.raw);
				} else {
					const context = this.extractSnippet(lines, link.line - 1, 100);
					brokenNotes.push({
						link: link.raw,
						line: link.line,
						context
					});
				}
			}
		}

		// Generate summary
		const totalLinks = valid.length + brokenNotes.length + brokenHeadings.length;
		let summary = `${totalLinks} links: ${valid.length} valid`;
		if (brokenNotes.length > 0) {
			summary += `, ${brokenNotes.length} broken note${brokenNotes.length === 1 ? '' : 's'}`;
		}
		if (brokenHeadings.length > 0) {
			summary += `, ${brokenHeadings.length} broken heading${brokenHeadings.length === 1 ? '' : 's'}`;
		}

		return {
			valid,
			brokenNotes,
			brokenHeadings,
			summary
		};
	}
}
