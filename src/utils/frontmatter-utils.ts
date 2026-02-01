import { parseYaml } from 'obsidian';

/**
 * YAML value types that can appear in frontmatter
 */
export type YAMLValue =
	| string
	| number
	| boolean
	| null
	| YAMLValue[]
	| { [key: string]: YAMLValue };

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
		parsedFrontmatter: Record<string, YAMLValue> | null;
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
		let parsedFrontmatter: Record<string, YAMLValue> | null = null;
		try {
			parsedFrontmatter = parseYaml(frontmatter) || {};
		} catch {
			// If parsing fails, return null for parsed frontmatter
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
	static extractFrontmatterSummary(parsedFrontmatter: Record<string, YAMLValue> | null): {
		title?: string;
		tags?: string[];
		aliases?: string[];
		[key: string]: YAMLValue | undefined;
	} | null {
		if (!parsedFrontmatter) {
			return null;
		}

		const summary: Record<string, YAMLValue> = {};

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
	 * Serialize frontmatter object to YAML string with delimiters
	 * Returns the complete frontmatter block including --- delimiters
	 */
	static serializeFrontmatter(data: Record<string, YAMLValue>): string {
		if (!data || Object.keys(data).length === 0) {
			return '';
		}

		const lines: string[] = ['---'];
		
		for (const [key, value] of Object.entries(data)) {
			if (value === undefined || value === null) {
				continue;
			}

			// Handle different value types
			if (Array.isArray(value)) {
				// Array format
				if (value.length === 0) {
					lines.push(`${key}: []`);
				} else {
					lines.push(`${key}:`);
					for (const item of value) {
						const itemStr = typeof item === 'string' ? item : JSON.stringify(item);
						lines.push(`  - ${itemStr}`);
					}
				}
			} else if (typeof value === 'object') {
				// Object format (nested)
				lines.push(`${key}:`);
				for (const [subKey, subValue] of Object.entries(value)) {
					const subValueStr = typeof subValue === 'string' ? subValue : JSON.stringify(subValue);
					lines.push(`  ${subKey}: ${subValueStr}`);
				}
			} else if (typeof value === 'string') {
				// String - check if needs quoting
				const needsQuotes = value.includes(':') || value.includes('#') || 
									value.includes('[') || value.includes(']') ||
									value.includes('{') || value.includes('}') ||
									value.includes('|') || value.includes('>') ||
									value.startsWith(' ') || value.endsWith(' ');
				
				if (needsQuotes) {
					// Escape quotes in the string
					const escaped = value.replace(/"/g, '\\"');
					lines.push(`${key}: "${escaped}"`);
				} else {
					lines.push(`${key}: ${value}`);
				}
			} else if (typeof value === 'number' || typeof value === 'boolean') {
				// Number or boolean - direct serialization
				lines.push(`${key}: ${value}`);
			} else {
				// Fallback to JSON stringification
				lines.push(`${key}: ${JSON.stringify(value)}`);
			}
		}
		
		lines.push('---');
		return lines.join('\n');
	}

	/**
	 * Parse Excalidraw file metadata
	 * Excalidraw files are JSON with special structure
	 */
	static parseExcalidrawMetadata(content: string): {
		isExcalidraw: boolean;
		elementCount?: number;
		hasCompressedData?: boolean;
		metadata?: Record<string, YAMLValue>;
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
				
				// Pattern 3: ``` with any language specifier (one or more characters)
				if (!jsonString) {
					match = afterDrawing.match(/```[a-z-]+\s*\n([\s\S]*?)```/);
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
					/```[a-z-]+\s*\n([\s\S]*?)```/, // One or more chars for language
					/```\s*\n([\s\S]*?)```/  // No language specifier
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
			let jsonData: Record<string, YAMLValue>;
			
			if (trimmedJson.startsWith('N4KAk') || !trimmedJson.startsWith('{')) {
				// Data is compressed - try to decompress
				try {
					// Validate base64 encoding (will throw on invalid data)
					// This validates the compressed data is at least well-formed
					/* istanbul ignore else - Buffer.from fallback for non-Node/browser environments without atob (Jest/Node always has atob) */
					if (typeof atob !== 'undefined') {
						// atob throws on invalid base64, unlike Buffer.from
						atob(trimmedJson);
					} else if (typeof Buffer !== 'undefined') {
						// Buffer.from doesn't throw, but we keep it for completeness
						Buffer.from(trimmedJson, 'base64');
					}

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
				} catch {
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
			const elementCount = Array.isArray(jsonData.elements) ? jsonData.elements.length : 0;
			
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
		} catch {
			// If parsing fails, return with default values
			const isExcalidraw = content.includes('excalidraw-plugin') ||
								 content.includes('"type":"excalidraw"');


			return {
				isExcalidraw: isExcalidraw,
				elementCount: isExcalidraw ? 0 : undefined,
				hasCompressedData: isExcalidraw ? false : undefined,
				metadata: isExcalidraw ? {} : undefined
			};
		}
	}
}
