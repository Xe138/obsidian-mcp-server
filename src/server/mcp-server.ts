import { App } from 'obsidian';
import express, { Express } from 'express';
import { Server } from 'http';
import {
	JSONRPCRequest,
	JSONRPCResponse,
	JSONRPCParams,
	JSONValue,
	ErrorCodes,
	InitializeResult,
	ListToolsResult,
	CallToolResult
} from '../types/mcp-types';
import { MCPServerSettings } from '../types/settings-types';
import { ToolRegistry } from '../tools';
import { NotificationManager } from '../ui/notifications';
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
					return this.createSuccessResponse(request.id, this.handleInitialize(request.params ?? {}));
				case 'tools/list':
					return this.createSuccessResponse(request.id, this.handleListTools());
				case 'tools/call':
					return this.createSuccessResponse(request.id, await this.handleCallTool(request.params ?? {}));
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

	private handleInitialize(_params: JSONRPCParams): InitializeResult {
		return {
			protocolVersion: "2024-11-05",
			capabilities: {
				tools: {}
			},
			serverInfo: {
				name: "obsidian-mcp-server",
				version: "2.0.0"
			}
		};
	}

	private handleListTools(): ListToolsResult {
		return {
			tools: this.toolRegistry.getToolDefinitions()
		};
	}

	private async handleCallTool(params: JSONRPCParams): Promise<CallToolResult> {
		const paramsObj = params as { name: string; arguments: Record<string, unknown> };
		return await this.toolRegistry.callTool(paramsObj.name, paramsObj.arguments);
	}

	private createSuccessResponse(id: string | number | undefined, result: unknown): JSONRPCResponse {
		return {
			jsonrpc: "2.0",
			id: id ?? null,
			result: result as JSONValue
		};
	}

	private createErrorResponse(id: string | number | undefined | null, code: number, message: string, data?: JSONValue): JSONRPCResponse {
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
				const bindAddress = this.settings.allowedIPs?.trim() ? '0.0.0.0' : '127.0.0.1';
				this.server = this.app.listen(this.settings.port, bindAddress, () => {
					resolve();
				});

				this.server.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code === 'EADDRINUSE') {
						reject(new Error(`Port ${this.settings.port} is already in use`));
					} else {
						reject(error);
					}
				});
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
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

	/**
	 * Set notification manager for tool call notifications
	 */
	public setNotificationManager(manager: NotificationManager | null): void {
		this.toolRegistry.setNotificationManager(manager);
	}
}
