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
				description: "Read the content of a note from the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Path to the note within the vault (e.g., 'folder/note.md')"
						}
					},
					required: ["path"]
				}
			},
			{
				name: "create_note",
				description: "Create a new note in the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Path for the new note (e.g., 'folder/note.md')"
						},
						content: {
							type: "string",
							description: "Content of the note"
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "update_note",
				description: "Update an existing note in the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Path to the note to update"
						},
						content: {
							type: "string",
							description: "New content for the note"
						}
					},
					required: ["path", "content"]
				}
			},
			{
				name: "delete_note",
				description: "Delete a note from the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "Path to the note to delete"
						}
					},
					required: ["path"]
				}
			},
			{
				name: "search_notes",
				description: "Search for notes in the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "Search query string"
						}
					},
					required: ["query"]
				}
			},
			{
				name: "get_vault_info",
				description: "Get information about the Obsidian vault",
				inputSchema: {
					type: "object",
					properties: {}
				}
			},
			{
				name: "list_notes",
				description: "List all notes in the vault or in a specific folder",
				inputSchema: {
					type: "object",
					properties: {
						folder: {
							type: "string",
							description: "Optional folder path to list notes from"
						}
					}
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
					return await this.noteTools.createNote(args.path, args.content);
				case "update_note":
					return await this.noteTools.updateNote(args.path, args.content);
				case "delete_note":
					return await this.noteTools.deleteNote(args.path);
				case "search_notes":
					return await this.vaultTools.searchNotes(args.query);
				case "get_vault_info":
					return await this.vaultTools.getVaultInfo();
				case "list_notes":
					return await this.vaultTools.listNotes(args.folder);
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
