import { IVaultAdapter, IMetadataCacheAdapter, IFileManagerAdapter } from '../../src/adapters/interfaces';
import { TFile, TFolder, TAbstractFile, CachedMetadata } from 'obsidian';

/**
 * Create a mock VaultAdapter with jest.fn() for all methods
 */
export function createMockVaultAdapter(overrides?: Partial<IVaultAdapter>): IVaultAdapter {
	return {
		read: jest.fn(),
		stat: jest.fn(),
		getAbstractFileByPath: jest.fn(),
		getMarkdownFiles: jest.fn(),
		getRoot: jest.fn(),
		process: jest.fn(),
		createFolder: jest.fn(),
		create: jest.fn(),
		modify: jest.fn(),
		delete: jest.fn(),
		trash: jest.fn(),
		...overrides
	};
}

/**
 * Create a mock MetadataCacheAdapter with jest.fn() for all methods
 */
export function createMockMetadataCacheAdapter(overrides?: Partial<IMetadataCacheAdapter>): IMetadataCacheAdapter {
	return {
		getFileCache: jest.fn(),
		getFirstLinkpathDest: jest.fn(),
		resolvedLinks: {},
		unresolvedLinks: {},
		...overrides
	};
}

/**
 * Create a mock FileManagerAdapter with jest.fn() for all methods
 */
export function createMockFileManagerAdapter(overrides?: Partial<IFileManagerAdapter>): IFileManagerAdapter {
	return {
		renameFile: jest.fn(),
		trashFile: jest.fn(),
		processFrontMatter: jest.fn(),
		...overrides
	};
}

/**
 * Helper to create a mock TFile with proper prototype chain
 */
export function createMockTFile(path: string, stat?: { ctime: number; mtime: number; size: number }): TFile {
	const file = Object.create(TFile.prototype);
	Object.assign(file, {
		path,
		basename: path.split('/').pop()?.replace('.md', '') || '',
		extension: 'md',
		name: path.split('/').pop() || '',
		stat: stat || { ctime: Date.now(), mtime: Date.now(), size: 100 },
		vault: {} as any,
		parent: null
	});
	return file;
}

/**
 * Helper to create a mock TFolder with proper prototype chain
 */
export function createMockTFolder(path: string, children?: TAbstractFile[]): TFolder {
	const folder = Object.create(TFolder.prototype);
	Object.assign(folder, {
		path,
		name: path.split('/').pop() || '',
		children: children || [],
		vault: {} as any,
		parent: null,
		isRoot: function() { return path === '' || path === '/'; }
	});
	return folder;
}