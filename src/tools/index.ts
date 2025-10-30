import { App } from 'obsidian';
import { Tool, CallToolResult } from '../types/mcp-types';
import { NoteTools } from './note-tools';
import { VaultTools } from './vault-tools';
import { createNoteTools } from './note-tools-factory';
import { createVaultTools } from './vault-tools-factory';
import { NotificationManager } from '../ui/notifications';

export class ToolRegistry {
	private noteTools: NoteTools;
	private vaultTools: VaultTools;
	private notificationManager: NotificationManager | null = null;

	constructor(app: App) {
		this.noteTools = createNoteTools(app);
		this.vaultTools = createVaultTools(app);
	}

	/**
	 * Set notification manager for tool call notifications
	 */
	setNotificationManager(manager: NotificationManager | null): void {
		this.notificationManager = manager;
	}

	getToolDefinitions(): Tool[] {
		return [
			{
				name: "read_note",
				description: "Read the content of a file from the Obsidian vault with optional frontmatter parsing. Returns word count (excluding frontmatter and Obsidian comments) when content is included in the response. Use this to read the contents of a specific note or file. Path must be vault-relative (no leading slash) and include the file extension. Use list() first if you're unsure of the exact path. This only works on files, not folders. By default returns raw content with word count. Set parseFrontmatter to true to get structured data with separated frontmatter, content, and word count.",
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
				description: "Create a new file in the Obsidian vault with conflict handling. Returns structured JSON with success status, path, versionId, created timestamp, conflict resolution details, word count (excluding frontmatter and Obsidian comments), and link validation results. Automatically validates all wikilinks, heading links, and embeds, categorizing them as valid, broken notes, or broken headings. Supports automatic parent folder creation and three conflict strategies: 'error' (default, fail if exists), 'overwrite' (replace existing), 'rename' (auto-generate unique name). Use this to create new notes with robust error handling and automatic content analysis.",
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
						},
						onConflict: {
							type: "string",
							enum: ["error", "overwrite", "rename"],
							description: "Conflict resolution strategy if file already exists. 'error' (default): fail with error. 'overwrite': delete existing file and create new. 'rename': auto-generate unique name by appending number. Default: 'error'"
						},
						validateLinks: {
							type: "boolean",
							description: "If true (default), automatically validate all wikilinks and embeds in the note, returning detailed broken link information. If false, skip link validation for better performance. Link validation checks [[wikilinks]], [[note#heading]] links, and ![[embeds]]. Default: true"
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "update_note",
				description: "Update (overwrite) an existing file in the Obsidian vault. Returns structured JSON with success status, path, versionId, modified timestamp, word count (excluding frontmatter and Obsidian comments), and link validation results. Automatically validates all wikilinks, heading links, and embeds, categorizing them as valid, broken notes, or broken headings. This REPLACES the entire file content. The file must already exist. Path must be vault-relative with file extension. Use read_note() first to get current content if you want to make partial changes.",
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
						},
						validateLinks: {
							type: "boolean",
							description: "If true (default), automatically validate all wikilinks and embeds in the note, returning detailed broken link information. If false, skip link validation for better performance. Link validation checks [[wikilinks]], [[note#heading]] links, and ![[embeds]]. Default: true"
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "delete_note",
				description: "Delete a file from the Obsidian vault with safety options. Returns structured JSON with deletion status, path, destination (for soft deletes), and operation mode. Supports soft delete (move to .trash folder, default) and permanent deletion. Use dryRun to preview deletion without executing. Includes concurrency control via ifMatch parameter. This only works on files, NOT folders.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file to delete (e.g., 'folder/note.md'). Must be a file, not a folder. Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						soft: {
							type: "boolean",
							description: "If true (default), move file to .trash folder (recoverable). If false, permanently delete (cannot be undone). Default: true"
						},
						dryRun: {
							type: "boolean",
							description: "If true, preview deletion without executing. Returns what would happen. If false (default), perform actual deletion. Default: false"
						},
						ifMatch: {
							type: "string",
							description: "Optional ETag/versionId for concurrency control. If provided, deletion only proceeds if file hasn't been modified. Get versionId from read operations. Prevents accidental deletion of modified files."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "update_frontmatter",
				description: "Update frontmatter fields without modifying note content. Supports patch operations (add/update fields) and removal of keys. At least one of 'patch' or 'remove' must be provided. Returns structured JSON with success status, path, versionId, modified timestamp, and lists of updated/removed fields. Includes concurrency control via ifMatch parameter. Use this for metadata-only updates to avoid race conditions with content edits.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file (e.g., 'folder/note.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						patch: {
							type: "object",
							description: "Optional object with frontmatter fields to add or update. Keys are field names, values are field values. Supports strings, numbers, booleans, arrays, and nested objects. Example: {\"tags\": [\"project\", \"active\"], \"status\": \"in-progress\"}. Can be omitted if only removing fields."
						},
						remove: {
							type: "array",
							items: { type: "string" },
							description: "Optional array of frontmatter field names to remove. Example: [\"draft\", \"old_status\"]. Fields that don't exist are silently ignored. Can be omitted if only adding/updating fields."
						},
						ifMatch: {
							type: "string",
							description: "Optional ETag/versionId for concurrency control. If provided, update only proceeds if file hasn't been modified. Get versionId from read operations. Prevents lost updates in concurrent scenarios."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "update_sections",
				description: "Update specific sections of a note by line range. Reduces race conditions by avoiding full file overwrites. Returns structured JSON with success status, path, versionId, modified timestamp, count of sections updated, word count for the entire note (excluding frontmatter and Obsidian comments), and link validation results for the entire note. Automatically validates all wikilinks, heading links, and embeds in the complete note after edits, categorizing them as valid, broken notes, or broken headings. Supports multiple edits in a single operation, applied from bottom to top to preserve line numbers. Includes concurrency control via ifMatch parameter. Use this for surgical edits to specific parts of large notes with automatic content analysis.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the file (e.g., 'folder/note.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						edits: {
							type: "array",
							items: {
								type: "object",
								properties: {
									startLine: { type: "number", description: "Starting line number (1-indexed, inclusive)" },
									endLine: { type: "number", description: "Ending line number (1-indexed, inclusive)" },
									content: { type: "string", description: "New content to replace the section" }
								},
								required: ["startLine", "endLine", "content"]
							},
							description: "Array of section edits to apply. Each edit specifies a line range and replacement content. Edits are applied from bottom to top to prevent line number shifts. Example: [{\"startLine\": 10, \"endLine\": 15, \"content\": \"New section content\"}]"
						},
						ifMatch: {
							type: "string",
							description: "Optional ETag/versionId for concurrency control. If provided, update only proceeds if file hasn't been modified. Get versionId from read operations. Prevents conflicting edits in concurrent scenarios."
						},
						validateLinks: {
							type: "boolean",
							description: "If true (default), automatically validate all wikilinks and embeds in the entire note after applying section edits, returning detailed broken link information. If false, skip link validation for better performance. Link validation checks [[wikilinks]], [[note#heading]] links, and ![[embeds]]. Default: true"
						}
					},
					required: ["path", "edits"]
				}
			},
			{
				name: "rename_file",
				description: "Rename or move a file with automatic wikilink updates. Uses Obsidian's FileManager to maintain link integrity across the vault. Returns structured JSON with success status, old/new paths, and versionId. Note: linksUpdated and affectedFiles fields always return 0/empty due to API limitations, but links ARE automatically updated by Obsidian. Supports both rename (same folder) and move (different folder) operations. Automatically creates parent folders if needed. Includes concurrency control via ifMatch parameter. Use this to reorganize vault structure while preserving all internal links.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Current vault-relative path to the file (e.g., 'folder/note.md'). Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						newPath: {
							type: "string",
							description: "New vault-relative path for the file (e.g., 'archive/2024/note.md' or 'folder/renamed.md'). Can be in a different folder for move operations. Must include file extension. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						updateLinks: {
							type: "boolean",
							description: "If true (default), automatically update all wikilinks that reference this file. If false, links will break. Recommended to keep true. Default: true"
						},
						ifMatch: {
							type: "string",
							description: "Optional ETag/versionId for concurrency control. If provided, rename only proceeds if file hasn't been modified. Get versionId from read operations. Prevents renaming modified files."
						}
					},
					required: ["path", "newPath"]
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
							description: "Glob patterns to exclude (e.g., ['templates/**', '*.tmp']). Files matching these patterns will be skipped. Takes precedence over includes."
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
				description: "List files and/or directories with advanced filtering, recursion, and pagination. Returns structured JSON with file/directory metadata and optional frontmatter summaries. Optional: includeWordCount (boolean) - If true, read each file's content and compute word count (excluding frontmatter and Obsidian comments). WARNING: This can be very slow for large directories or recursive listings, as it reads every file. Files that cannot be read are skipped (best effort). Only computed for files, not directories. Supports glob patterns for includes/excludes, recursive traversal, type filtering, and cursor-based pagination. Use this to explore vault structure with fine-grained control.",
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
							description: "Glob patterns to exclude (e.g., ['templates/**', '*.tmp']). Takes precedence over includes."
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
						},
						includeWordCount: {
							type: "boolean",
							description: "If true, read each file's content and compute word count. WARNING: Can be very slow for large directories or recursive listings. Only applies to files. Default: false"
						}
					}
				}
			},
			{
				name: "stat",
				description: "Get detailed metadata for a file or folder at a specific path. Returns existence status, kind (file or directory), and full metadata including size, dates, etc. Optional: includeWordCount (boolean) - If true, read file content and compute word count (excluding frontmatter and Obsidian comments). WARNING: This requires reading the entire file and is significantly slower than metadata-only stat. Only works for files, not directories. Use this to check if a path exists and get its properties. More detailed than exists() but slightly slower. Returns structured JSON with path, exists boolean, kind, and metadata object.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to check (e.g., 'folder/note.md' or 'projects'). Can be a file or folder. Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						includeWordCount: {
							type: "boolean",
							description: "If true, read file content and compute word count. WARNING: Significantly slower than metadata-only stat. Only applies to files. Default: false"
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
			},
			{
				name: "get_folder_waypoint",
				description: "Get Waypoint block from a folder note. Waypoint blocks (%% Begin Waypoint %% ... %% End Waypoint %%) are auto-generated by the Waypoint plugin to create folder indexes. Returns structured JSON with waypoint presence, line range, extracted wikilinks, and raw content. Use this to inspect folder note navigation structures without parsing the entire file.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the folder note (e.g., 'projects/projects.md' or 'daily/daily.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "is_folder_note",
				description: "Check if a note is a folder note. A folder note is identified by either having the same basename as its parent folder OR containing Waypoint markers. Returns structured JSON with boolean result, detection reason (basename_match, waypoint_marker, both, or none), and folder path. Use this to identify navigation/index notes in your vault structure.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the note to check (e.g., 'projects/projects.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "validate_wikilinks",
				description: "Validate all wikilinks in a note and report unresolved links. Parses all [[wikilinks]] in the file, resolves them using Obsidian's link resolution rules, and provides suggestions for broken links. Returns structured JSON with total link count, arrays of resolved links (with targets) and unresolved links (with suggestions). Use this to identify and fix broken links in your notes.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the note to validate (e.g., 'projects/project.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						}
					},
					required: ["path"]
				}
			},
			{
				name: "resolve_wikilink",
				description: "Resolve a single wikilink from a source note to its target path. Uses Obsidian's link resolution rules including shortest path matching, relative paths, and aliases. Returns structured JSON with resolution status, target path if found, or suggestions if not found. Supports links with headings ([[note#heading]]) and aliases ([[note|alias]]). Use this to programmatically resolve links before following them.",
				inputSchema: {
					type: "object",
					properties: {
						sourcePath: {
							type: "string",
							description: "Vault-relative path to the source note containing the link (e.g., 'projects/project.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						linkText: {
							type: "string",
							description: "The wikilink text to resolve (without brackets). Examples: 'target note', 'folder/note', 'note#heading', 'note|alias'. Can include heading references and aliases."
						}
					},
					required: ["sourcePath", "linkText"]
				}
			},
			{
				name: "backlinks",
				description: "Get all backlinks to a note. Returns all notes that link to the target note, with optional unlinked mentions (text references without wikilinks). Uses Obsidian's MetadataCache for accurate backlink detection. Returns structured JSON with array of backlinks, each containing source path, type (linked/unlinked), and occurrences with line numbers and context snippets. Use this to explore note connections and build knowledge graphs.",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Vault-relative path to the target note (e.g., 'concepts/important-concept.md'). Paths are case-sensitive on macOS/Linux. Do not use leading or trailing slashes."
						},
						includeUnlinked: {
							type: "boolean",
							description: "If true, include unlinked mentions (text references without [[brackets]]). If false (default), only include wikilinks. Default: false. Warning: enabling this can be slow for large vaults."
						},
						includeSnippets: {
							type: "boolean",
							description: "If true (default), include context snippets for each backlink occurrence. If false, omit snippets to reduce response size. Default: true"
						}
					},
					required: ["path"]
				}
			}
		];
	}

	async callTool(name: string, args: any): Promise<CallToolResult> {
		const startTime = Date.now();
		
		// Show tool call notification
		if (this.notificationManager) {
			this.notificationManager.showToolCall(name, args);
		}

		try {
			let result: CallToolResult;
			
			switch (name) {
				case "read_note":
					result = await this.noteTools.readNote(args.path, {
						withFrontmatter: args.withFrontmatter,
						withContent: args.withContent,
						parseFrontmatter: args.parseFrontmatter
					});
					break;
				case "create_note":
					result = await this.noteTools.createNote(
						args.path,
						args.content,
						args.createParents ?? false,
						args.onConflict ?? 'error',
						args.validateLinks ?? true
					);
					break;
				case "update_note":
					result = await this.noteTools.updateNote(
						args.path,
						args.content,
						args.validateLinks ?? true
					);
					break;
				case "update_frontmatter":
					result = await this.noteTools.updateFrontmatter(
						args.path,
						args.patch,
						args.remove ?? [],
						args.ifMatch
					);
					break;
				case "update_sections":
					result = await this.noteTools.updateSections(
						args.path,
						args.edits,
						args.ifMatch,
						args.validateLinks ?? true
					);
					break;
				case "rename_file":
					result = await this.noteTools.renameFile(
						args.path,
						args.newPath,
						args.updateLinks ?? true,
						args.ifMatch
					);
					break;
				case "delete_note":
					result = await this.noteTools.deleteNote(
						args.path,
						args.soft ?? true,
						args.dryRun ?? false,
						args.ifMatch
					);
					break;
				case "search":
					result = await this.vaultTools.search({
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
					break;
				case "search_waypoints":
					result = await this.vaultTools.searchWaypoints(args.folder);
					break;
				case "get_vault_info":
					result = await this.vaultTools.getVaultInfo();
					break;
				case "list":
					result = await this.vaultTools.list({
						path: args.path,
						recursive: args.recursive,
						includes: args.includes,
						excludes: args.excludes,
						only: args.only,
						limit: args.limit,
						cursor: args.cursor,
						withFrontmatterSummary: args.withFrontmatterSummary,
						includeWordCount: args.includeWordCount
					});
					break;
				case "stat":
					result = await this.vaultTools.stat(args.path, args.includeWordCount);
					break;
				case "exists":
					result = await this.vaultTools.exists(args.path);
					break;
				case "read_excalidraw":
					result = await this.noteTools.readExcalidraw(args.path, {
						includeCompressed: args.includeCompressed,
						includePreview: args.includePreview
					});
					break;
				case "get_folder_waypoint":
					result = await this.vaultTools.getFolderWaypoint(args.path);
					break;
				case "is_folder_note":
					result = await this.vaultTools.isFolderNote(args.path);
					break;
				case "validate_wikilinks":
					result = await this.vaultTools.validateWikilinks(args.path);
					break;
				case "resolve_wikilink":
					result = await this.vaultTools.resolveWikilink(args.sourcePath, args.linkText);
					break;
				case "backlinks":
					result = await this.vaultTools.getBacklinks(
						args.path,
						args.includeUnlinked ?? false,
						args.includeSnippets ?? true
					);
					break;
				default:
					result = {
						content: [{ type: "text", text: `Unknown tool: ${name}` }],
						isError: true
					};
			}

			// Add to history (no completion notification)
			const duration = Date.now() - startTime;
			if (this.notificationManager) {
				this.notificationManager.addToHistory({
					timestamp: Date.now(),
					toolName: name,
					args: args,
					success: !result.isError,
					duration: duration
				});
			}

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = (error as Error).message;

			// Add to history (no error notification shown)
			if (this.notificationManager) {
				this.notificationManager.addToHistory({
					timestamp: Date.now(),
					toolName: name,
					args: args,
					success: false,
					duration: duration,
					error: errorMessage
				});
			}

			return {
				content: [{ type: "text", text: `Error: ${errorMessage}` }],
				isError: true
			};
		}
	}
}
