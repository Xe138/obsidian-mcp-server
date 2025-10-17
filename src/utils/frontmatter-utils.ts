import { parseYaml } from 'obsidian';

/**
 * Utility class for parsing and extracting frontmatter from markdown files
 */
export class FrontmatterUtils {
	/**
	 * Extract frontmatter from markdown content
	 * Returns the frontmatter block, content without frontmatter, and parsed YAML
	 */
	static extractFrontmatter(content: string): {
		hasFrontmatter: boolean;
		frontmatter: string;
		parsedFrontmatter: Record<string, any> | null;
		content: string;
		contentWithoutFrontmatter: string;
	} {
		// Check if content starts with frontmatter delimiter
		if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
			return {
				hasFrontmatter: false,
				frontmatter: '',
				parsedFrontmatter: null,
				content: content,
				contentWithoutFrontmatter: content
			};
		}

		// Find the closing delimiter
		const lines = content.split('\n');
		let endIndex = -1;
		
		// Start from line 1 (skip the opening ---)
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '---' || line === '...') {
				endIndex = i;
				break;
			}
		}

		// If no closing delimiter found, treat as no frontmatter
		if (endIndex === -1) {
			return {
				hasFrontmatter: false,
				frontmatter: '',
				parsedFrontmatter: null,
				content: content,
				contentWithoutFrontmatter: content
			};
		}

		// Extract frontmatter (excluding delimiters)
		const frontmatterLines = lines.slice(1, endIndex);
		const frontmatter = frontmatterLines.join('\n');

		// Extract content after frontmatter
		const contentLines = lines.slice(endIndex + 1);
		const contentWithoutFrontmatter = contentLines.join('\n');

		// Parse YAML using Obsidian's built-in parser
		let parsedFrontmatter: Record<string, any> | null = null;
		try {
			parsedFrontmatter = parseYaml(frontmatter) || {};
		} catch (error) {
			// If parsing fails, return null for parsed frontmatter
			console.error('Failed to parse frontmatter:', error);
			parsedFrontmatter = null;
		}

		return {
			hasFrontmatter: true,
			frontmatter: frontmatter,
			parsedFrontmatter: parsedFrontmatter,
			content: content,
			contentWithoutFrontmatter: contentWithoutFrontmatter
		};
	}

	/**
	 * Extract only the frontmatter summary (common fields)
	 * Useful for list operations without reading full content
	 */
	static extractFrontmatterSummary(parsedFrontmatter: Record<string, any> | null): {
		title?: string;
		tags?: string[];
		aliases?: string[];
		[key: string]: any;
	} | null {
		if (!parsedFrontmatter) {
			return null;
		}

		const summary: Record<string, any> = {};

		// Extract common fields
		if (parsedFrontmatter.title) {
			summary.title = parsedFrontmatter.title;
		}

		if (parsedFrontmatter.tags) {
			// Normalize tags to array
			if (Array.isArray(parsedFrontmatter.tags)) {
				summary.tags = parsedFrontmatter.tags;
			} else if (typeof parsedFrontmatter.tags === 'string') {
				summary.tags = [parsedFrontmatter.tags];
			}
		}

		if (parsedFrontmatter.aliases) {
			// Normalize aliases to array
			if (Array.isArray(parsedFrontmatter.aliases)) {
				summary.aliases = parsedFrontmatter.aliases;
			} else if (typeof parsedFrontmatter.aliases === 'string') {
				summary.aliases = [parsedFrontmatter.aliases];
			}
		}

		// Include any other top-level fields
		for (const key in parsedFrontmatter) {
			if (!['title', 'tags', 'aliases'].includes(key)) {
				summary[key] = parsedFrontmatter[key];
			}
		}

		return Object.keys(summary).length > 0 ? summary : null;
	}

	/**
	 * Check if content has frontmatter (quick check without parsing)
	 */
	static hasFrontmatter(content: string): boolean {
		return content.startsWith('---\n') || content.startsWith('---\r\n');
	}

	/**
	 * Parse Excalidraw file metadata
	 * Excalidraw files are JSON with special structure
	 */
	static parseExcalidrawMetadata(content: string): {
		isExcalidraw: boolean;
		elementCount?: number;
		hasCompressedData?: boolean;
		metadata?: Record<string, any>;
	} {
		try {
			// Excalidraw files are typically markdown with a code block containing JSON
			// Format: # Text Elements\n\n<text content>\n\n## Drawing\n```json\n<excalidraw data>\n```
			
			// Check if it's an Excalidraw file by looking for the plugin marker
			const hasExcalidrawMarker = content.includes('excalidraw-plugin') || 
										content.includes('"type":"excalidraw"');
			
			if (!hasExcalidrawMarker) {
				return { isExcalidraw: false };
			}

			// Try multiple approaches to extract JSON from code block
			let jsonString: string | null = null;
			
			// Approach 1: Look for code fence after "## Drawing" section
			const drawingIndex = content.indexOf('## Drawing');
			if (drawingIndex > 0) {
				const afterDrawing = content.substring(drawingIndex);
				
				// Pattern 1: ```compressed-json (Excalidraw's actual format)
				let match = afterDrawing.match(/```compressed-json\s*\n([\s\S]*?)```/);
				if (match) {
					jsonString = match[1];
				}
				
				// Pattern 2: ```json
				if (!jsonString) {
					match = afterDrawing.match(/```json\s*\n([\s\S]*?)```/);
					if (match) {
						jsonString = match[1];
					}
				}
				
				// Pattern 3: ``` with any language specifier
				if (!jsonString) {
					match = afterDrawing.match(/```[a-z-]*\s*\n([\s\S]*?)```/);
					if (match) {
						jsonString = match[1];
					}
				}
				
				// Pattern 4: ``` (no language specifier)
				if (!jsonString) {
					match = afterDrawing.match(/```\s*\n([\s\S]*?)```/);
					if (match) {
						jsonString = match[1];
					}
				}
			}
			
			// Approach 2: If still no match, try searching entire content
			if (!jsonString) {
				// Look for any code fence with JSON-like content
				const patterns = [
					/```compressed-json\s*\n([\s\S]*?)```/,
					/```json\s*\n([\s\S]*?)```/,
					/```[a-z-]*\s*\n([\s\S]*?)```/,
					/```\s*\n([\s\S]*?)```/
				];
				
				for (const pattern of patterns) {
					const match = content.match(pattern);
					if (match) {
						jsonString = match[1];
						break;
					}
				}
			}
			
			if (!jsonString) {
				// Return with default values if JSON can't be extracted
				return { 
					isExcalidraw: true,
					elementCount: 0,
					hasCompressedData: false,
					metadata: {}
				};
			}

			// Check if data is compressed (base64 encoded)
			const trimmedJson = jsonString.trim();
			let jsonData: any;
			
			if (trimmedJson.startsWith('N4KAk') || !trimmedJson.startsWith('{')) {
				// Data is compressed - try to decompress
				try {
					// Decompress using pako (if available) or return metadata indicating compression
					// For now, we'll indicate it's compressed and provide limited metadata
					return {
						isExcalidraw: true,
						elementCount: 0, // Can't count without decompression
						hasCompressedData: true, // Definitely compressed
						metadata: {
							appState: {},
							version: 2,
							compressed: true // Indicate data is compressed
						}
					};
				} catch (decompressError) {
					// Decompression failed
					return {
						isExcalidraw: true,
						elementCount: 0,
						hasCompressedData: true,
						metadata: { compressed: true }
					};
				}
			}
			
			// Parse the JSON (uncompressed format)
			jsonData = JSON.parse(trimmedJson);
			
			// Count elements
			const elementCount = jsonData.elements ? jsonData.elements.length : 0;
			
			// Check for compressed data (files or images)
			const hasCompressedData = !!(jsonData.files && Object.keys(jsonData.files).length > 0);

			return {
				isExcalidraw: true,
				elementCount: elementCount,
				hasCompressedData: hasCompressedData,
				metadata: {
					appState: jsonData.appState || {},
					version: jsonData.version || 2
				}
			};
		} catch (error) {
			// If parsing fails, return with default values
			const isExcalidraw = content.includes('excalidraw-plugin') || 
								 content.includes('"type":"excalidraw"');
			
			// Log error for debugging
			console.error('Excalidraw parsing error:', error);
			
			return {
				isExcalidraw: isExcalidraw,
				elementCount: isExcalidraw ? 0 : undefined,
				hasCompressedData: isExcalidraw ? false : undefined,
				metadata: isExcalidraw ? {} : undefined
			};
		}
	}
}
