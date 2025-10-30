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
	wordCount?: number;
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
	isRegex: boolean;
	matches: SearchMatch[];
	totalMatches: number;
	filesSearched: number;
	filesWithMatches: number;
}

// Phase 6: Waypoint Search Types
export interface WaypointResult {
	path: string;
	line: number;
	waypointRange: { start: number; end: number };
	content: string;
	links: string[];
}

export interface WaypointSearchResult {
	waypoints: WaypointResult[];
	totalWaypoints: number;
	filesSearched: number;
}

// Phase 7: Waypoint Support Types
export interface FolderWaypointResult {
	path: string;
	hasWaypoint: boolean;
	waypointRange?: { start: number; end: number };
	links?: string[];
	rawContent?: string;
}

export interface FolderNoteResult {
	path: string;
	isFolderNote: boolean;
	reason: 'basename_match' | 'waypoint_marker' | 'both' | 'none';
	folderPath?: string;
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

// Phase 4: Enhanced List Operations Types
export interface FrontmatterSummary {
	title?: string;
	tags?: string[];
	aliases?: string[];
	[key: string]: any;
}

export interface FileMetadataWithFrontmatter extends FileMetadata {
	frontmatterSummary?: FrontmatterSummary;
}

export interface ListResult {
	items: Array<FileMetadataWithFrontmatter | DirectoryMetadata>;
	totalCount: number;
	hasMore: boolean;
	nextCursor?: string;
}

// Phase 5: Advanced Read Operations Types
export interface ParsedNote {
	path: string;
	hasFrontmatter: boolean;
	frontmatter?: string;
	parsedFrontmatter?: Record<string, any>;
	content: string;
	contentWithoutFrontmatter?: string;
	wordCount?: number;
}

/**
 * Excalidraw drawing file metadata
 * Returned by read_excalidraw tool
 */
export interface ExcalidrawMetadata {
	/** File path */
	path: string;
	/** True if file is a valid Excalidraw drawing */
	isExcalidraw: boolean;
	/** Number of drawing elements (shapes, text, etc.) */
	elementCount?: number;
	/** True if drawing contains compressed/embedded image data */
	hasCompressedData?: boolean;
	/** Drawing metadata including appState and version */
	metadata?: {
		appState?: Record<string, any>;
		version?: number;
		[key: string]: any;
	};
	/** Preview text extracted from text elements section (when includePreview=true) */
	preview?: string;
	/** Full compressed drawing data (when includeCompressed=true) */
	compressedData?: string;
}

// Phase 8: Write Operations & Concurrency Types

/**
 * Conflict resolution strategy for create_note
 */
export type ConflictStrategy = 'error' | 'overwrite' | 'rename';

/**
 * Section edit operation for update_sections
 */
export interface SectionEdit {
	/** Starting line number (1-indexed) */
	startLine: number;
	/** Ending line number (1-indexed, inclusive) */
	endLine: number;
	/** New content to replace the section */
	content: string;
}

/**
 * Result from update_frontmatter operation
 */
export interface UpdateFrontmatterResult {
	success: boolean;
	path: string;
	versionId: string;
	modified: number;
	updatedFields: string[];
	removedFields: string[];
}

/**
 * Result from update_sections operation
 */
export interface UpdateSectionsResult {
	success: boolean;
	path: string;
	versionId: string;
	modified: number;
	sectionsUpdated: number;
	wordCount?: number;
	linkValidation?: LinkValidationResult;
}

/**
 * Result from create_note operation
 */
export interface CreateNoteResult {
	success: boolean;
	path: string;
	versionId: string;
	created: number;
	renamed?: boolean;
	originalPath?: string;
	wordCount?: number;
	linkValidation?: LinkValidationResult;
}

/**
 * Result from rename_file operation
 */
export interface RenameFileResult {
	success: boolean;
	oldPath: string;
	newPath: string;
	linksUpdated: number;
	affectedFiles: string[];
	versionId: string;
}

/**
 * Result from delete_note operation
 */
export interface DeleteNoteResult {
	deleted: boolean;
	path: string;
	destination?: string;
	dryRun: boolean;
	soft: boolean;
}

// Phase 9: Linking & Backlinks Types

/**
 * Resolved wikilink information
 */
export interface ResolvedLink {
	text: string;
	target: string;
	alias?: string;
}

/**
 * Unresolved wikilink information
 */
export interface UnresolvedLink {
	text: string;
	line: number;
	suggestions: string[];
}

/**
 * Broken link information (note doesn't exist)
 */
export interface BrokenNoteLink {
	link: string;
	line: number;
	context: string;
}

/**
 * Broken heading link information (note exists but heading doesn't)
 */
export interface BrokenHeadingLink {
	link: string;
	line: number;
	context: string;
	note: string;
}

/**
 * Link validation result for write operations
 */
export interface LinkValidationResult {
	valid: string[];
	brokenNotes: BrokenNoteLink[];
	brokenHeadings: BrokenHeadingLink[];
	summary: string;
}

/**
 * Result from validate_wikilinks operation
 */
export interface ValidateWikilinksResult {
	path: string;
	totalLinks: number;
	resolvedLinks: ResolvedLink[];
	unresolvedLinks: UnresolvedLink[];
}

/**
 * Result from resolve_wikilink operation
 */
export interface ResolveWikilinkResult {
	sourcePath: string;
	linkText: string;
	resolved: boolean;
	targetPath?: string;
	suggestions?: string[];
}

/**
 * Backlink occurrence in a file
 */
export interface BacklinkOccurrence {
	line: number;
	snippet: string;
}

/**
 * Backlink from a source file
 */
export interface BacklinkInfo {
	sourcePath: string;
	type: 'linked' | 'unlinked';
	occurrences: BacklinkOccurrence[];
}

/**
 * Result from backlinks operation
 */
export interface BacklinksResult {
	path: string;
	backlinks: BacklinkInfo[];
	totalBacklinks: number;
}
