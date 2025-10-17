// MCP Protocol Types
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

export enum ErrorCodes {
	ParseError = -32700,
	InvalidRequest = -32600,
	MethodNotFound = -32601,
	InvalidParams = -32602,
	InternalError = -32603
}

export interface InitializeResult {
	protocolVersion: string;
	capabilities: {
		tools?: {};
	};
	serverInfo: {
		name: string;
		version: string;
	};
}

export interface Tool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties: Record<string, any>;
		required?: string[];
	};
}

export interface ListToolsResult {
	tools: Tool[];
}

export interface ContentBlock {
	type: "text";
	text: string;
}

export interface CallToolResult {
	content: ContentBlock[];
	isError?: boolean;
}
