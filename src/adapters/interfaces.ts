import { TAbstractFile, TFile, TFolder, CachedMetadata, DataWriteOptions } from 'obsidian';

/**
 * Adapter interface for Obsidian Vault operations
 */
export interface IVaultAdapter {
	// File reading
	read(file: TFile): Promise<string>;

	// File existence and metadata
	stat(file: TAbstractFile): { ctime: number; mtime: number; size: number } | null;

	// File retrieval
	getAbstractFileByPath(path: string): TAbstractFile | null;
	getMarkdownFiles(): TFile[];

	// Directory operations
	getRoot(): TFolder;

	// File creation (process method)
	process(file: TFile, fn: (data: string) => string, options?: DataWriteOptions): Promise<string>;

	// Folder creation
	createFolder(path: string): Promise<void>;

	// File creation
	create(path: string, data: string): Promise<TFile>;
}

/**
 * Adapter interface for Obsidian MetadataCache operations
 */
export interface IMetadataCacheAdapter {
	// Cache access
	getFileCache(file: TFile): CachedMetadata | null;

	// Link resolution
	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;

	// File cache for links and metadata
	resolvedLinks: Record<string, Record<string, number>>;
	unresolvedLinks: Record<string, Record<string, number>>;
}

/**
 * Adapter interface for Obsidian FileManager operations
 */
export interface IFileManagerAdapter {
	// File operations
	renameFile(file: TAbstractFile, newPath: string): Promise<void>;
	trashFile(file: TAbstractFile): Promise<void>;
	processFrontMatter(file: TFile, fn: (frontmatter: any) => void): Promise<void>;
}