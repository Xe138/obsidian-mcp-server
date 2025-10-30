import { FrontmatterUtils } from './frontmatter-utils';

/**
 * Utility class for content analysis and manipulation
 */
export class ContentUtils {
	/**
	 * Count words in content, excluding frontmatter and Obsidian comments
	 * Includes all other content: headings, paragraphs, lists, code blocks, inline code
	 *
	 * @param content The full markdown content to analyze
	 * @returns Word count (excludes frontmatter and Obsidian comments only)
	 */
	static countWords(content: string): number {
		// Extract frontmatter to get content without it
		const { contentWithoutFrontmatter } = FrontmatterUtils.extractFrontmatter(content);

		// Remove Obsidian comments (%% ... %%)
		// Handle both single-line and multi-line comments
		const withoutComments = this.removeObsidianComments(contentWithoutFrontmatter);

		// Split by whitespace and count non-empty tokens
		const words = withoutComments
			.split(/\s+/)
			.filter(word => word.trim().length > 0);

		return words.length;
	}

	/**
	 * Remove Obsidian comments from content
	 * Handles both %% single line %% and multi-line comments
	 *
	 * @param content Content to process
	 * @returns Content with Obsidian comments removed
	 */
	private static removeObsidianComments(content: string): string {
		// Remove Obsidian comments: %% ... %%
		// Use non-greedy match to handle multiple comments
		return content.replace(/%%[\s\S]*?%%/g, '');
	}
}
