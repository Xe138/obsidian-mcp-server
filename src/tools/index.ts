import { App } from 'obsidian';
import { Tool, CallToolResult } from '../types/mcp-types';
import { NoteTools } from './note-tools';
import { VaultTools } from './vault-tools';

export class ToolRegistry {
	private noteTools: NoteTools;
	private vaultTools: VaultTools;

	constructor(app: App) {
		this.noteTools = new NoteTools(app);
		this.vaultTools = new VaultTools(app);
	}

	getToolDefinitions(): Tool[] {
		return [
			{
				name: "read_note",
				description: "Read the content of a file from the Obsidian vault with optional frontmatter parsing. Use this to read the contents of a specific note or file. Path must be vault-relative (no leading slash) and include the file extension. Use list() first if you're unsure of the exact path. This only works on files, not folders. By default returns raw content. Set parseFrontmatter to true to get structured data with separated frontmatter and content.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file (e.g., 'folder/note.md' or 'daily/2024-10-16.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						withFrontmatter: {
							type: "boolean",
							description: "If true (default), include frontmatter in the response when parseFrontmatter is true. Only applies when parseFrontmatter is true."
						},
						withContent: {
							type: "boolean",
							description: "If true (default), include full content in the response. Set to false to get only metadata when parseFrontmatter is true."
						},
						parseFrontmatter: {
							type: "boolean",
							description: "If true, parse and separate frontmatter from content, returning structured JSON. If false (default), return raw file content as plain text. Use true when you need to work with frontmatter separately."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "create_note",
				description: "Create a new file in the Obsidian vault. Use this to create a new note or file. By default, parent folders must already exist. Set createParents to true to automatically create missing parent folders. Path must be vault-relative with file extension. Will fail if the file already exists. Use list_notes() to verify the parent folder exists before creating.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path for the new file (e.g., 'folder/note.md' or 'projects/2024/report.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						content: {
							type: "string",
							description: "The complete content to write to the new file. Can include markdown formatting, frontmatter, etc."
						},
						createParents: {
							type: "boolean",
							description: "If true, automatically create missing parent folders. If false (default), returns an error if parent folders don't exist. Default: false"
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "update_note",
				description: "Update (overwrite) an existing file in the Obsidian vault. Use this to modify the contents of an existing note. This REPLACES the entire file content. The file must already exist. Path must be vault-relative with file extension. Use read_note() first to get current content if you want to make partial changes.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the existing file (e.g., 'folder/note.md'). Must include file extension. File must exist. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						content: {
							type: "string",
							description: "The complete new content that will replace the entire file. To make partial changes, read the file first, modify the content, then update."
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "delete_note",
				description: "Delete a file from the Obsidian vault. Use this to permanently remove a file. This only works on files, NOT folders. The file must exist. Path must be vault-relative with file extension. This operation cannot be undone through the API.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file to delete (e.g., 'folder/note.md'). Must be a file, not a folder. Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "search",
				description: "Search vault with advanced filtering, regex support, and snippet extraction. Returns structured JSON with detailed search results including file paths, line numbers, column positions, snippets with context, and match ranges for highlighting. Supports both literal and regex search patterns, case sensitivity control, glob filtering, folder scoping, and result limiting. Use this for powerful content search across your vault.",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "Text or regex pattern to search for (e.g., 'TODO', 'meeting.*notes', '^# Heading'). Interpretation depends on isRegex parameter."
						},
						isRegex: {
							type: "boolean",
							description: "If true, treat query as a regular expression pattern. If false (default), treat as literal text. Regex supports full JavaScript regex syntax."
						},
						caseSensitive: {
							type: "boolean",
							description: "If true, search is case-sensitive. If false (default), search is case-insensitive. Applies to both literal and regex searches."
						},
						includes: {
							type: "array",
							items: { type: "string" },
							description: "Glob patterns to include (e.g., ['*.md', 'projects/**']). Only files matching these patterns will be searched. If empty, all files are included."
						},
						excludes: {
							type: "array",
							items: { type: "string" },
							description: "Glob patterns to exclude (e.g., ['.obsidian/**', '*.tmp']). Files matching these patterns will be skipped. Takes precedence over includes."
						},
						folder: {
							type: "string",
							description: "Optional vault-relative folder path to limit search scope (e.g., 'projects' or 'daily/2024'). Only files within this folder will be searched."
						},
						returnSnippets: {
							type: "boolean",
							description: "If true (default), include surrounding context snippets for each match. If false, only return match locations without snippets."
						},
						snippetLength: {
							type: "number",
							description: "Maximum length of context snippets in characters. Default: 100. Only applies when returnSnippets is true."
						},
						maxResults: {
							type: "number",
							description: "Maximum number of matches to return. Default: 100. Use to limit results for broad searches."
						}
					},
					required: ["query"]
				}
			},
			{
				name: "search_waypoints",
				description: "Find all Waypoint plugin markers in the vault. Waypoints are special comment blocks (%% Begin Waypoint %% ... %% End Waypoint %%) used by the Waypoint plugin to auto-generate folder indexes. Returns structured JSON with waypoint locations, content, and extracted wikilinks. Useful for discovering folder notes and navigation structures.",
				inputSchema: {
					type: "object",
					properties: {
						folder: {
							type: "string",
							description: "Optional vault-relative folder path to limit search scope (e.g., 'projects'). If omitted, searches entire vault."
						}
					}
				}
			},
			{
				name: "get_vault_info",
				description: "Get information about the Obsidian vault. Returns structured JSON with vault name, path, total file count, total folder count, markdown file count, and total size in bytes. Use this to understand the vault structure and get an overview of available content. No parameters required.",
				inputSchema: {
					type: "object",
					properties: {}
				}
			},
			{
				name: "list",
				description: "List files and/or directories with advanced filtering, recursion, and pagination. Returns structured JSON with file/directory metadata and optional frontmatter summaries. Supports glob patterns for includes/excludes, recursive traversal, type filtering, and cursor-based pagination. Use this to explore vault structure with fine-grained control.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Optional vault-relative folder path to list from (e.g., 'projects' or 'daily/2024'). Omit or use empty string for root. Paths are case-sensitive on macOS/Linux."
						},
						recursive: {
							type: "boolean",
							description: "If true, recursively list all descendants. If false (default), list only direct children."
						},
						includes: {
							type: "array",
							items: { type: "string" },
							description: "Glob patterns to include (e.g., ['*.md', 'projects/**']). Supports *, **, ?, [abc], {a,b}. If empty, includes all."
						},
						excludes: {
							type: "array",
							items: { type: "string" },
							description: "Glob patterns to exclude (e.g., ['.obsidian/**', '*.tmp']). Takes precedence over includes."
						},
						only: {
							type: "string",
							enum: ["files", "directories", "any"],
							description: "Filter by type: 'files' (only files), 'directories' (only folders), 'any' (both, default)."
						},
						limit: {
							type: "number",
							description: "Maximum number of items to return per page. Use with cursor for pagination."
						},
						cursor: {
							type: "string",
							description: "Pagination cursor from previous response's nextCursor field. Continue from where the last page ended."
						},
						withFrontmatterSummary: {
							type: "boolean",
							description: "If true, include parsed frontmatter (title, tags, aliases) for markdown files without reading full content. Default: false."
						}
					}
				}
			},
			{
				name: "stat",
				description: "Get detailed metadata for a file or folder at a specific path. Returns existence status, kind (file or directory), and full metadata including size, dates, etc. Use this to check if a path exists and get its properties. More detailed than exists() but slightly slower. Returns structured JSON with path, exists boolean, kind, and metadata object.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to check (e.g., 'folder/note.md' or 'projects'). Can be a file or folder. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "exists",
				description: "Quickly check if a file or folder exists at a specific path. Returns existence status and kind (file or directory) without fetching full metadata. Faster than stat() when you only need to verify existence. Use this before operations that require a path to exist. Returns structured JSON with path, exists boolean, and optional kind.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to check (e.g., 'folder/note.md' or 'projects'). Can be a file or folder. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "read_excalidraw",
				description: "Read an Excalidraw drawing file with specialized metadata extraction. Returns structured ExcalidrawMetadata JSON object. ALWAYS RETURNED FIELDS: 'path' (string: file path), 'isExcalidraw' (boolean: true if valid Excalidraw file), 'elementCount' (number: count of drawing elements - NOTE: returns 0 for compressed files which is most Excalidraw files, only uncompressed files return actual count), 'hasCompressedData' (boolean: true if drawing uses compressed format), 'metadata' (object: contains appState, version, and compressed flag). CONDITIONAL FIELDS: 'preview' (string: text elements from Text Elements section, included when includePreview=true which is default), 'compressedData' (string: full file content including compressed drawing data, included only when includeCompressed=true). Gracefully handles non-Excalidraw files by returning isExcalidraw=false with helpful message. Use this for .excalidraw.md files to get drawing information. Most files use compressed format so elementCount will be 0 but hasCompressedData will be true.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the Excalidraw file (e.g., 'drawings/diagram.excalidraw.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						includeCompressed: {
							type: "boolean",
							description: "If true, include the full compressed drawing data in 'compressedData' field. Default: false. Warning: can be very large for complex drawings with embedded images. Set to true only when you need the complete drawing JSON data for processing or export."
						},
						includePreview: {
							type: "boolean",
							description: "If true (default), include preview text in 'preview' field extracted from the drawing's text elements section. Set to false to omit preview and reduce response size. Useful for getting a text summary of the drawing without the full data."
						}
					},
					required: ["path"]
				}
			}
		];
	}

	async callTool(name: string, args: any): Promise<CallToolResult> {
		try {
			switch (name) {
				case "read_note":
					return await this.noteTools.readNote(args.path, {
						withFrontmatter: args.withFrontmatter,
						withContent: args.withContent,
						parseFrontmatter: args.parseFrontmatter
					});
				case "create_note":
					return await this.noteTools.createNote(args.path, args.content, args.createParents ?? false);
				case "update_note":
					return await this.noteTools.updateNote(args.path, args.content);
				case "delete_note":
					return await this.noteTools.deleteNote(args.path);
				case "search":
					return await this.vaultTools.search({
						query: args.query,
						isRegex: args.isRegex,
						caseSensitive: args.caseSensitive,
						includes: args.includes,
						excludes: args.excludes,
						folder: args.folder,
						returnSnippets: args.returnSnippets,
						snippetLength: args.snippetLength,
						maxResults: args.maxResults
					});
				case "search_waypoints":
					return await this.vaultTools.searchWaypoints(args.folder);
				case "get_vault_info":
					return await this.vaultTools.getVaultInfo();
				case "list":
					return await this.vaultTools.list({
						path: args.path,
						recursive: args.recursive,
						includes: args.includes,
						excludes: args.excludes,
						only: args.only,
						limit: args.limit,
						cursor: args.cursor,
						withFrontmatterSummary: args.withFrontmatterSummary
					});
				case "stat":
					return await this.vaultTools.stat(args.path);
				case "exists":
					return await this.vaultTools.exists(args.path);
				case "read_excalidraw":
					return await this.noteTools.readExcalidraw(args.path, {
						includeCompressed: args.includeCompressed,
						includePreview: args.includePreview
					});
				default:
					return {
						content: [{ type: "text", text: `Unknown tool: ${name}` }],
						isError: true
					};
			}
		} catch (error) {
			return {
				content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
				isError: true
			};
		}
	}
}
