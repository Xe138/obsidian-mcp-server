// MCP Protocol Types based on JSON-RPC 2.0

export interface JSONRPCRequest {
	jsonrpc: "2.0";
	id?: string | number;
	method: string;
	params?: any;
}

export interface JSONRPCResponse {
	jsonrpc: "2.0";
	id: string | number | null;
	result?: any;
	error?: JSONRPCError;
}

export interface JSONRPCError {
	code: number;
	message: string;
	data?: any;
}

export interface JSONRPCNotification {
	jsonrpc: "2.0";
	method: string;
	params?: any;
}

// MCP Protocol Messages

export interface InitializeRequest {
	method: "initialize";
	params: {
		protocolVersion: string;
		capabilities: ClientCapabilities;
		clientInfo: {
			name: string;
			version: string;
		};
	};
}

export interface InitializeResult {
	protocolVersion: string;
	capabilities: ServerCapabilities;
	serverInfo: {
		name: string;
		version: string;
	};
}

export interface ClientCapabilities {
	roots?: {
		listChanged?: boolean;
	};
	sampling?: {};
	experimental?: Record<string, any>;
}

export interface ServerCapabilities {
	tools?: {};
	resources?: {
		subscribe?: boolean;
		listChanged?: boolean;
	};
	prompts?: {
		listChanged?: boolean;
	};
	logging?: {};
	experimental?: Record<string, any>;
}

export interface ListToolsRequest {
	method: "tools/list";
	params?: {
		cursor?: string;
	};
}

export interface Tool {
	name: string;
	description?: string;
	inputSchema: {
		type: "object";
		properties?: Record<string, any>;
		required?: string[];
	};
}

export interface ListToolsResult {
	tools: Tool[];
	nextCursor?: string;
}

export interface CallToolRequest {
	method: "tools/call";
	params: {
		name: string;
		arguments?: Record<string, any>;
	};
}

export interface CallToolResult {
	content: ContentBlock[];
	isError?: boolean;
}

export interface ContentBlock {
	type: "text" | "image" | "resource";
	text?: string;
	data?: string;
	mimeType?: string;
}

// Error codes
export const ErrorCodes = {
	ParseError: -32700,
	InvalidRequest: -32600,
	MethodNotFound: -32601,
	InvalidParams: -32602,
	InternalError: -32603,
};
