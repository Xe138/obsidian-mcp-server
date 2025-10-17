import { App } from 'obsidian';
import express, { Express } from 'express';
import { Server } from 'http';
import {
	JSONRPCRequest,
	JSONRPCResponse,
	ErrorCodes,
	InitializeResult,
	ListToolsResult,
	CallToolResult
} from '../types/mcp-types';
import { MCPServerSettings } from '../types/settings-types';
import { ToolRegistry } from '../tools';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';

export class MCPServer {
	private app: Express;
	private server: Server | null = null;
	private obsidianApp: App;
	private settings: MCPServerSettings;
	private toolRegistry: ToolRegistry;

	constructor(obsidianApp: App, settings: MCPServerSettings) {
		this.obsidianApp = obsidianApp;
		this.settings = settings;
		this.app = express();
		this.toolRegistry = new ToolRegistry(obsidianApp);
		
		setupMiddleware(this.app, this.settings, this.createErrorResponse.bind(this));
		setupRoutes(this.app, this.handleRequest.bind(this), this.createErrorResponse.bind(this));
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
			return this.createErrorResponse(request.id, ErrorCodes.InternalError, (error as Error).message);
		}
	}

	private async handleInitialize(_params: any): Promise<InitializeResult> {
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
		return {
			tools: this.toolRegistry.getToolDefinitions()
		};
	}

	private async handleCallTool(params: any): Promise<CallToolResult> {
		const { name, arguments: args } = params;
		return await this.toolRegistry.callTool(name, args);
	}

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
