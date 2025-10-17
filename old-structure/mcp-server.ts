import { App, TFile, TFolder } from 'obsidian';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import {
	JSONRPCRequest,
	JSONRPCResponse,
	JSONRPCError,
	InitializeResult,
	ListToolsResult,
	CallToolResult,
	Tool,
	ErrorCodes,
	ContentBlock
} from './mcp-types';

export interface MCPServerSettings {
	port: number;
	enableCORS: boolean;
	allowedOrigins: string[];
	apiKey?: string;
	enableAuth: boolean;
}

export class MCPServer {
	private app: Express;
	private server: Server | null = null;
	private obsidianApp: App;
	private settings: MCPServerSettings;

	constructor(obsidianApp: App, settings: MCPServerSettings) {
		this.obsidianApp = obsidianApp;
		this.settings = settings;
		this.app = express();
		this.setupMiddleware();
		this.setupRoutes();
	}

	private setupMiddleware(): void {
		// Parse JSON bodies
		this.app.use(express.json());

		// CORS configuration
		if (this.settings.enableCORS) {
			const corsOptions = {
				origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
					// Allow requests with no origin (like mobile apps or curl requests)
					if (!origin) return callback(null, true);
					
					if (this.settings.allowedOrigins.includes('*') || 
						this.settings.allowedOrigins.includes(origin)) {
						callback(null, true);
					} else {
						callback(new Error('Not allowed by CORS'));
					}
				},
				credentials: true
			};
			this.app.use(cors(corsOptions));
		}

		// Authentication middleware
		if (this.settings.enableAuth && this.settings.apiKey) {
			this.app.use((req: Request, res: Response, next: any) => {
				const authHeader = req.headers.authorization;
				const apiKey = authHeader?.replace('Bearer ', '');
				
				if (apiKey !== this.settings.apiKey) {
					return res.status(401).json(this.createErrorResponse(null, ErrorCodes.InvalidRequest, 'Unauthorized'));
				}
				next();
			});
		}

		// Origin validation for security (DNS rebinding protection)
		this.app.use((req: Request, res: Response, next: any) => {
			const origin = req.headers.origin;
			const host = req.headers.host;
			
			// Only allow localhost connections
			if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
				return res.status(403).json(this.createErrorResponse(null, ErrorCodes.InvalidRequest, 'Only localhost connections allowed'));
			}
			
			next();
		});
	}

	private setupRoutes(): void {
		// Main MCP endpoint
		this.app.post('/mcp', async (req: Request, res: Response) => {
			try {
				const request = req.body as JSONRPCRequest;
				const response = await this.handleRequest(request);
				res.json(response);
			} catch (error) {
				console.error('MCP request error:', error);
				res.status(500).json(this.createErrorResponse(null, ErrorCodes.InternalError, 'Internal server error'));
			}
		});

		// Health check endpoint
		this.app.get('/health', (_req: Request, res: Response) => {
			res.json({ status: 'ok', timestamp: Date.now() });
		});
	}

	private async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
		try {
			switch (request.method) {
				case 'initialize':
					return this.createSuccessResponse(request.id, await this.handleInitialize(request.params));
				case 'tools/list':
					return this.createSuccessResponse(request.id, await this.handleListTools());
				case 'tools/call':
					return this.createSuccessResponse(request.id, await this.handleCallTool(request.params));
				case 'ping':
					return this.createSuccessResponse(request.id, {});
				default:
					return this.createErrorResponse(request.id, ErrorCodes.MethodNotFound, `Method not found: ${request.method}`);
			}
		} catch (error) {
			console.error('Error handling request:', error);
			return this.createErrorResponse(request.id, ErrorCodes.InternalError, error.message);
		}
	}

	private async handleInitialize(params: any): Promise<InitializeResult> {
		return {
			protocolVersion: "2024-11-05",
			capabilities: {
				tools: {}
			},
			serverInfo: {
				name: "obsidian-mcp-server",
				version: "1.0.0"
			}
		};
	}

	private async handleListTools(): Promise<ListToolsResult> {
		const tools: Tool[] = [
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

		return { tools };
	}

	private async handleCallTool(params: any): Promise<CallToolResult> {
		const { name, arguments: args } = params;

		try {
			switch (name) {
				case "read_note":
					return await this.readNote(args.path);
				case "create_note":
					return await this.createNote(args.path, args.content);
				case "update_note":
					return await this.updateNote(args.path, args.content);
				case "delete_note":
					return await this.deleteNote(args.path);
				case "search_notes":
					return await this.searchNotes(args.query);
				case "get_vault_info":
					return await this.getVaultInfo();
				case "list_notes":
					return await this.listNotes(args.folder);
				default:
					return {
						content: [{ type: "text", text: `Unknown tool: ${name}` }],
						isError: true
					};
			}
		} catch (error) {
			return {
				content: [{ type: "text", text: `Error: ${error.message}` }],
				isError: true
			};
		}
	}

	// Tool implementations

	private async readNote(path: string): Promise<CallToolResult> {
		const file = this.obsidianApp.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		const content = await this.obsidianApp.vault.read(file);
		return {
			content: [{ type: "text", text: content }]
		};
	}

	private async createNote(path: string, content: string): Promise<CallToolResult> {
		try {
			const file = await this.obsidianApp.vault.create(path, content);
			return {
				content: [{ type: "text", text: `Note created successfully: ${file.path}` }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `Failed to create note: ${error.message}` }],
				isError: true
			};
		}
	}

	private async updateNote(path: string, content: string): Promise<CallToolResult> {
		const file = this.obsidianApp.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		await this.obsidianApp.vault.modify(file, content);
		return {
			content: [{ type: "text", text: `Note updated successfully: ${path}` }]
		};
	}

	private async deleteNote(path: string): Promise<CallToolResult> {
		const file = this.obsidianApp.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		await this.obsidianApp.vault.delete(file);
		return {
			content: [{ type: "text", text: `Note deleted successfully: ${path}` }]
		};
	}

	private async searchNotes(query: string): Promise<CallToolResult> {
		const files = this.obsidianApp.vault.getMarkdownFiles();
		const results: string[] = [];

		for (const file of files) {
			const content = await this.obsidianApp.vault.read(file);
			if (content.toLowerCase().includes(query.toLowerCase()) || 
				file.basename.toLowerCase().includes(query.toLowerCase())) {
				results.push(file.path);
			}
		}

		return {
			content: [{
				type: "text",
				text: results.length > 0 
					? `Found ${results.length} notes:\n${results.join('\n')}`
					: 'No notes found matching the query'
			}]
		};
	}

	private async getVaultInfo(): Promise<CallToolResult> {
		const files = this.obsidianApp.vault.getFiles();
		const markdownFiles = this.obsidianApp.vault.getMarkdownFiles();
		
		const info = {
			name: this.obsidianApp.vault.getName(),
			totalFiles: files.length,
			markdownFiles: markdownFiles.length,
			rootPath: (this.obsidianApp.vault.adapter as any).basePath || 'Unknown'
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(info, null, 2)
			}]
		};
	}

	private async listNotes(folder?: string): Promise<CallToolResult> {
		let files: TFile[];

		if (folder) {
			const folderObj = this.obsidianApp.vault.getAbstractFileByPath(folder);
			if (!folderObj || !(folderObj instanceof TFolder)) {
				return {
					content: [{ type: "text", text: `Folder not found: ${folder}` }],
					isError: true
				};
			}
			files = [];
			this.obsidianApp.vault.getMarkdownFiles().forEach((file: TFile) => {
				if (file.path.startsWith(folder + '/')) {
					files.push(file);
				}
			});
		} else {
			files = this.obsidianApp.vault.getMarkdownFiles();
		}

		const noteList = files.map(f => f.path).join('\n');
		return {
			content: [{
				type: "text",
				text: `Found ${files.length} notes:\n${noteList}`
			}]
		};
	}

	// Helper methods

	private createSuccessResponse(id: string | number | undefined, result: any): JSONRPCResponse {
		return {
			jsonrpc: "2.0",
			id: id ?? null,
			result
		};
	}

	private createErrorResponse(id: string | number | undefined | null, code: number, message: string, data?: any): JSONRPCResponse {
		return {
			jsonrpc: "2.0",
			id: id ?? null,
			error: {
				code,
				message,
				data
			}
		};
	}

	// Server lifecycle

	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.server = this.app.listen(this.settings.port, '127.0.0.1', () => {
					console.log(`MCP Server listening on http://127.0.0.1:${this.settings.port}/mcp`);
					resolve();
				});

				this.server.on('error', (error: any) => {
					if (error.code === 'EADDRINUSE') {
						reject(new Error(`Port ${this.settings.port} is already in use`));
					} else {
						reject(error);
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.server) {
				this.server.close((err?: Error) => {
					if (err) {
						reject(err);
					} else {
						console.log('MCP Server stopped');
						this.server = null;
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	}

	public isRunning(): boolean {
		return this.server !== null;
	}

	public updateSettings(settings: MCPServerSettings): void {
		this.settings = settings;
	}
}
