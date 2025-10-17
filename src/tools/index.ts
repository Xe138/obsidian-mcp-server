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
				description: "Read the content of a file from the Obsidian vault. Use this to read the contents of a specific note or file. Path must be vault-relative (no leading slash) and include the file extension. Use list_notes() first if you're unsure of the exact path. This only works on files, not folders.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file (e.g., 'folder/note.md' or 'daily/2024-10-16.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
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
				name: "search_notes",
				description: "Search for notes in the Obsidian vault by content or filename. Returns structured JSON with detailed search results including file paths, line numbers, column positions, snippets with context, and match ranges for highlighting. Searches are case-insensitive and match against both file names and file contents. Use this to find notes containing specific text or with specific names.",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "Text to search for in note names and contents (e.g., 'TODO', 'meeting notes', 'project'). Search is case-insensitive."
						}
					},
					required: ["query"]
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
			}
		];
	}

	async callTool(name: string, args: any): Promise<CallToolResult> {
		try {
			switch (name) {
				case "read_note":
					return await this.noteTools.readNote(args.path);
				case "create_note":
					return await this.noteTools.createNote(args.path, args.content, args.createParents ?? false);
				case "update_note":
					return await this.noteTools.updateNote(args.path, args.content);
				case "delete_note":
					return await this.noteTools.deleteNote(args.path);
				case "search_notes":
					return await this.vaultTools.searchNotes(args.query);
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
