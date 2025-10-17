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

// Phase 2: Typed Result Interfaces
export type ItemKind = "file" | "directory";

export interface FileMetadata {
	kind: "file";
	name: string;
	path: string;
	extension: string;
	size: number;
	modified: number;
	created: number;
}

export interface DirectoryMetadata {
	kind: "directory";
	name: string;
	path: string;
	childrenCount: number;
	modified: number;
}

export interface VaultInfo {
	name: string;
	path: string;
	totalFiles: number;
	totalFolders: number;
	markdownFiles: number;
	totalSize: number;
}

export interface SearchMatch {
	path: string;
	line: number;
	column: number;
	snippet: string;
	matchRanges: Array<{ start: number; end: number }>;
}

export interface SearchResult {
	query: string;
	matches: SearchMatch[];
	totalMatches: number;
	filesSearched: number;
	filesWithMatches: number;
}

// Phase 3: Discovery Endpoint Types
export interface StatResult {
	path: string;
	exists: boolean;
	kind?: ItemKind;
	metadata?: FileMetadata | DirectoryMetadata;
}

export interface ExistsResult {
	path: string;
	exists: boolean;
	kind?: ItemKind;
}
