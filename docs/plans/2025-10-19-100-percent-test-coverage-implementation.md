# 100% Test Coverage via Dependency Injection - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 100% test coverage through dependency injection refactoring that decouples tool classes from Obsidian API dependencies.

**Architecture:** Create adapter interfaces (IVaultAdapter, IMetadataCacheAdapter, IFileManagerAdapter) to wrap Obsidian APIs. Refactor NoteTools and VaultTools to depend on interfaces instead of concrete App object. Use factory pattern for production instantiation while enabling simple mocks in tests.

**Tech Stack:** TypeScript, Jest, Obsidian Plugin API

---

## Task 1: Create Adapter Interfaces

**Files:**
- Create: `src/adapters/interfaces.ts`

**Step 1: Write adapter interfaces**

Create the file with complete interface definitions:

```typescript
import { TAbstractFile, TFile, TFolder, CachedMetadata } from 'obsidian';

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
	process(file: TFile, fn: (data: string) => string, options?: any): Promise<string>;

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

	// Backlinks - returns record of source paths to link occurrences
	getBacklinksForFile(file: TFile): Record<string, any>;

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
	createNewMarkdownFile(location: TFolder, filename: string, content?: string): Promise<TFile>;
	processFrontMatter(file: TFile, fn: (frontmatter: any) => void): Promise<void>;
}
```

**Step 2: Commit interfaces**

```bash
git add src/adapters/interfaces.ts
git commit -m "feat: add adapter interfaces for dependency injection

Create IVaultAdapter, IMetadataCacheAdapter, and IFileManagerAdapter
interfaces to decouple tool classes from Obsidian API dependencies."
```

---

## Task 2: Implement Concrete Adapters

**Files:**
- Create: `src/adapters/vault-adapter.ts`
- Create: `src/adapters/metadata-adapter.ts`
- Create: `src/adapters/file-manager-adapter.ts`

**Step 1: Implement VaultAdapter**

Create `src/adapters/vault-adapter.ts`:

```typescript
import { Vault, TAbstractFile, TFile, TFolder } from 'obsidian';
import { IVaultAdapter } from './interfaces';

export class VaultAdapter implements IVaultAdapter {
	constructor(private vault: Vault) {}

	async read(file: TFile): Promise<string> {
		return this.vault.read(file);
	}

	stat(file: TAbstractFile): { ctime: number; mtime: number; size: number } | null {
		return this.vault.stat(file);
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		return this.vault.getAbstractFileByPath(path);
	}

	getMarkdownFiles(): TFile[] {
		return this.vault.getMarkdownFiles();
	}

	getRoot(): TFolder {
		return this.vault.getRoot();
	}

	async process(file: TFile, fn: (data: string) => string, options?: any): Promise<string> {
		return this.vault.process(file, fn, options);
	}

	async createFolder(path: string): Promise<void> {
		await this.vault.createFolder(path);
	}

	async create(path: string, data: string): Promise<TFile> {
		return this.vault.create(path, data);
	}
}
```

**Step 2: Implement MetadataCacheAdapter**

Create `src/adapters/metadata-adapter.ts`:

```typescript
import { MetadataCache, TFile, CachedMetadata } from 'obsidian';
import { IMetadataCacheAdapter } from './interfaces';

export class MetadataCacheAdapter implements IMetadataCacheAdapter {
	constructor(private cache: MetadataCache) {}

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.getFileCache(file);
	}

	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
		return this.cache.getFirstLinkpathDest(linkpath, sourcePath);
	}

	getBacklinksForFile(file: TFile): Record<string, any> {
		const backlinksData = this.cache.getBacklinksForFile(file);
		return backlinksData?.data || {};
	}

	get resolvedLinks(): Record<string, Record<string, number>> {
		return this.cache.resolvedLinks;
	}

	get unresolvedLinks(): Record<string, Record<string, number>> {
		return this.cache.unresolvedLinks;
	}
}
```

**Step 3: Implement FileManagerAdapter**

Create `src/adapters/file-manager-adapter.ts`:

```typescript
import { FileManager, TAbstractFile, TFile, TFolder } from 'obsidian';
import { IFileManagerAdapter } from './interfaces';

export class FileManagerAdapter implements IFileManagerAdapter {
	constructor(private fileManager: FileManager) {}

	async renameFile(file: TAbstractFile, newPath: string): Promise<void> {
		await this.fileManager.renameFile(file, newPath);
	}

	async trashFile(file: TAbstractFile): Promise<void> {
		await this.fileManager.trashFile(file);
	}

	async createNewMarkdownFile(location: TFolder, filename: string, content?: string): Promise<TFile> {
		return this.fileManager.createNewMarkdownFile(location, filename, content);
	}

	async processFrontMatter(file: TFile, fn: (frontmatter: any) => void): Promise<void> {
		await this.fileManager.processFrontMatter(file, fn);
	}
}
```

**Step 4: Commit adapters**

```bash
git add src/adapters/vault-adapter.ts src/adapters/metadata-adapter.ts src/adapters/file-manager-adapter.ts
git commit -m "feat: implement concrete adapter classes

Add VaultAdapter, MetadataCacheAdapter, and FileManagerAdapter as
pass-through wrappers for Obsidian API objects."
```

---

## Task 3: Create Mock Adapters for Testing

**Files:**
- Create: `tests/__mocks__/adapters.ts`

**Step 1: Write mock adapter factories**

Create `tests/__mocks__/adapters.ts`:

```typescript
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
		getBacklinksForFile: jest.fn(),
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
		createNewMarkdownFile: jest.fn(),
		processFrontMatter: jest.fn(),
		...overrides
	};
}

/**
 * Helper to create a mock TFile
 */
export function createMockTFile(path: string, stat?: { ctime: number; mtime: number; size: number }): TFile {
	return {
		path,
		basename: path.split('/').pop()?.replace('.md', '') || '',
		extension: 'md',
		name: path.split('/').pop() || '',
		stat: stat || { ctime: Date.now(), mtime: Date.now(), size: 100 },
		vault: {} as any,
		parent: null
	} as TFile;
}

/**
 * Helper to create a mock TFolder
 */
export function createMockTFolder(path: string, children?: TAbstractFile[]): TFolder {
	const folder = {
		path,
		name: path.split('/').pop() || '',
		children: children || [],
		vault: {} as any,
		parent: null,
		isRoot: function() { return path === '' || path === '/'; }
	} as TFolder;
	return folder;
}
```

**Step 2: Commit mock adapters**

```bash
git add tests/__mocks__/adapters.ts
git commit -m "test: add mock adapter factories

Create factory functions for mock adapters to simplify test setup.
Includes helpers for creating mock TFile and TFolder objects."
```

---

## Task 4: Refactor VaultTools to Use Adapters

**Files:**
- Modify: `src/tools/vault-tools.ts`
- Create: `src/tools/vault-tools-factory.ts`

**Step 1: Update VaultTools constructor**

In `src/tools/vault-tools.ts`, modify the class constructor and add imports:

```typescript
import { IVaultAdapter, IMetadataCacheAdapter } from '../adapters/interfaces';

export class VaultTools {
	constructor(
		private vault: IVaultAdapter,
		private metadata: IMetadataCacheAdapter,
		private app: App  // Keep temporarily for methods not yet migrated
	) {}

	// ... rest of class
}
```

**Step 2: Create factory function**

Create `src/tools/vault-tools-factory.ts`:

```typescript
import { App } from 'obsidian';
import { VaultTools } from './vault-tools';
import { VaultAdapter } from '../adapters/vault-adapter';
import { MetadataCacheAdapter } from '../adapters/metadata-adapter';

/**
 * Factory function to create VaultTools with concrete adapters
 */
export function createVaultTools(app: App): VaultTools {
	return new VaultTools(
		new VaultAdapter(app.vault),
		new MetadataCacheAdapter(app.metadataCache),
		app
	);
}
```

**Step 3: Update listNotes method to use adapters**

In `src/tools/vault-tools.ts`, find the `listNotes` method and update to use adapters:

```typescript
async listNotes(path?: string, includeFrontmatter: boolean = false): Promise<CallToolResult> {
	try {
		// ... path validation code ...

		let targetFolder: TFolder;
		if (!normalizedPath || normalizedPath === '.' || normalizedPath === '/') {
			targetFolder = this.vault.getRoot();
		} else {
			const folder = this.vault.getAbstractFileByPath(normalizedPath);
			// ... rest of validation ...
		}

		const items: Array<{ type: 'file' | 'folder'; path: string; name: string; metadata?: any }> = [];

		for (const item of targetFolder.children) {
			// Skip the vault root itself
			if (item.path === '' || item.path === '/' || (item instanceof TFolder && item.isRoot())) {
				continue;
			}

			if (item instanceof TFile && item.extension === 'md') {
				const metadata = includeFrontmatter
					? this.extractFrontmatterSummary(item)
					: undefined;

				items.push({
					type: 'file',
					path: item.path,
					name: item.basename,
					metadata
				});
			} else if (item instanceof TFolder) {
				items.push({
					type: 'folder',
					path: item.path,
					name: item.name
				});
			}
		}

		// ... rest of method (sorting, return) ...
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 4: Update stat method to use adapters**

Find the `stat` method and update:

```typescript
async stat(path: string): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		const stat = this.vault.stat(file);
		if (!stat) {
			return {
				content: [{
					type: "text",
					text: `Unable to get stat for ${normalizedPath}`
				}],
				isError: true
			};
		}

		// ... rest of method ...
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 5: Update exists method to use adapters**

Find the `exists` method and update:

```typescript
async exists(path: string): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		return {
			content: [{
				type: "text",
				text: JSON.stringify({ exists: file !== null }, null, 2)
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 6: Update extractFrontmatterSummary to use adapters**

Find the `extractFrontmatterSummary` method and update:

```typescript
private extractFrontmatterSummary(file: TFile): FileMetadata {
	const stat = this.vault.stat(file);
	const baseMetadata: FileMetadata = {
		created: stat?.ctime || 0,
		modified: stat?.mtime || 0,
		size: stat?.size || 0
	};

	if (!stat) {
		return baseMetadata;
	}

	try {
		const cache = this.metadata.getFileCache(file);
		if (cache?.frontmatter) {
			// ... rest of method unchanged ...
		}
	} catch (error) {
		console.error(`Failed to extract frontmatter for ${file.path}:`, error);
	}

	return baseMetadata;
}
```

**Step 7: Commit VaultTools refactoring**

```bash
git add src/tools/vault-tools.ts src/tools/vault-tools-factory.ts
git commit -m "refactor: migrate VaultTools to use adapter interfaces

Update VaultTools constructor to accept IVaultAdapter and
IMetadataCacheAdapter. Add factory function for production usage.
Update listNotes, stat, exists, and extractFrontmatterSummary methods."
```

---

## Task 5: Update VaultTools Tests to Use Mock Adapters

**Files:**
- Modify: `tests/vault-tools.test.ts`

**Step 1: Update test imports and setup**

At the top of `tests/vault-tools.test.ts`, update imports:

```typescript
import { VaultTools } from '../src/tools/vault-tools';
import { createMockVaultAdapter, createMockMetadataCacheAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';
import { TFile, TFolder, App } from 'obsidian';

// Remove old mock App setup, replace with:
describe('VaultTools', () => {
	let vaultTools: VaultTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockMetadata: ReturnType<typeof createMockMetadataCacheAdapter>;
	let mockApp: App;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockMetadata = createMockMetadataCacheAdapter();
		mockApp = {} as App; // Minimal mock for methods not yet migrated

		vaultTools = new VaultTools(mockVault, mockMetadata, mockApp);
	});

	// ... tests ...
});
```

**Step 2: Update listNotes tests**

Update the listNotes test cases to use mock adapters:

```typescript
describe('listNotes', () => {
	it('should list files and folders in root directory', async () => {
		const mockFiles = [
			createMockTFile('note1.md'),
			createMockTFile('note2.md')
		];
		const mockFolders = [
			createMockTFolder('folder1')
		];
		const mockRoot = createMockTFolder('', [...mockFiles, ...mockFolders]);

		mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

		const result = await vaultTools.listNotes();

		expect(result.isError).toBeUndefined();
		expect(mockVault.getRoot).toHaveBeenCalled();
		// ... rest of assertions ...
	});

	it('should return error if folder not found', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

		const result = await vaultTools.listNotes('nonexistent');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('not found');
	});

	// ... more test cases ...
});
```

**Step 3: Update stat tests**

```typescript
describe('stat', () => {
	it('should return file statistics', async () => {
		const mockFile = createMockTFile('test.md', {
			ctime: 1000,
			mtime: 2000,
			size: 500
		});

		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.stat = jest.fn().mockReturnValue(mockFile.stat);

		const result = await vaultTools.stat('test.md');

		expect(result.isError).toBeUndefined();
		expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('test.md');
		expect(mockVault.stat).toHaveBeenCalledWith(mockFile);
		// ... rest of assertions ...
	});

	it('should return error if file not found', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

		const result = await vaultTools.stat('nonexistent.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('not found');
	});
});
```

**Step 4: Update exists tests**

```typescript
describe('exists', () => {
	it('should return true if file exists', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

		const result = await vaultTools.exists('test.md');

		const response = JSON.parse(result.content[0].text);
		expect(response.exists).toBe(true);
	});

	it('should return false if file does not exist', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

		const result = await vaultTools.exists('nonexistent.md');

		const response = JSON.parse(result.content[0].text);
		expect(response.exists).toBe(false);
	});
});
```

**Step 5: Run tests to verify**

```bash
npm test -- vault-tools.test.ts
```

Expected: Tests should pass for the migrated methods (listNotes, stat, exists).

**Step 6: Commit test updates**

```bash
git add tests/vault-tools.test.ts
git commit -m "test: update vault-tools tests to use mock adapters

Replace complex App object mocks with clean mock adapter pattern.
Simplifies test setup and improves maintainability."
```

---

## Task 6: Fix list-notes-sorting.test.ts Mock Issues

**Files:**
- Modify: `tests/list-notes-sorting.test.ts`

**Step 1: Update imports and test setup**

Update the file to use new mock adapters:

```typescript
import { VaultTools } from '../src/tools/vault-tools';
import { createMockVaultAdapter, createMockMetadataCacheAdapter, createMockTFolder, createMockTFile } from './__mocks__/adapters';
import { App } from 'obsidian';

describe('VaultTools - list_notes sorting', () => {
	let vaultTools: VaultTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockMetadata: ReturnType<typeof createMockMetadataCacheAdapter>;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockMetadata = createMockMetadataCacheAdapter();
		vaultTools = new VaultTools(mockVault, mockMetadata, {} as App);
	});

	// ... tests updated to use mockVault ...
});
```

**Step 2: Fix root folder tests**

Update tests that check root behavior to use properly mocked TFolder with isRoot():

```typescript
it('should list root when path is undefined', async () => {
	const mockFiles = [
		createMockTFile('file1.md'),
		createMockTFile('file2.md')
	];
	const mockRoot = createMockTFolder('', mockFiles);

	mockVault.getRoot = jest.fn().mockReturnValue(mockRoot);

	const result = await vaultTools.listNotes();

	expect(result.isError).toBeUndefined();
	const parsed = JSON.parse(result.content[0].text);
	expect(parsed.path).toBe('');
	expect(parsed.items.length).toBe(2);
});
```

**Step 3: Run tests to verify fix**

```bash
npm test -- list-notes-sorting.test.ts
```

Expected: All tests should pass now that TFolder mocks include isRoot() method.

**Step 4: Commit fix**

```bash
git add tests/list-notes-sorting.test.ts
git commit -m "test: fix list-notes-sorting tests with proper mocks

Use createMockTFolder helper which includes isRoot() method.
Fixes TypeError: item.isRoot is not a function."
```

---

## Task 7: Continue VaultTools Migration - Search Methods

**Files:**
- Modify: `src/tools/vault-tools.ts`

**Step 1: Update search method to use adapters**

Find the `search` method and update to use adapters:

```typescript
async search(
	query: string,
	options?: {
		path?: string;
		useRegex?: boolean;
		caseSensitive?: boolean;
		includeGlob?: string;
		maxResults?: number;
	}
): Promise<CallToolResult> {
	try {
		const files = this.vault.getMarkdownFiles();
		let targetFiles = files;

		// Apply path filter if specified
		if (options?.path) {
			const normalizedPath = PathUtils.normalizePath(options.path);
			targetFiles = files.filter(f => f.path.startsWith(normalizedPath + '/') || f.path === normalizedPath);
		}

		// Apply glob filter if specified
		if (options?.includeGlob) {
			targetFiles = GlobUtils.filterByGlob(targetFiles, options.includeGlob);
		}

		const results: SearchResult[] = [];

		for (const file of targetFiles) {
			const content = await this.vault.read(file);
			const matches = SearchUtils.search(content, query, {
				useRegex: options?.useRegex,
				caseSensitive: options?.caseSensitive
			});

			if (matches.length > 0) {
				results.push({
					path: file.path,
					matches
				});

				if (options?.maxResults && results.length >= options.maxResults) {
					break;
				}
			}
		}

		// ... rest of method (formatting results) ...
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 2: Update getVaultInfo to use adapters**

Find the `getVaultInfo` method:

```typescript
async getVaultInfo(): Promise<CallToolResult> {
	try {
		const allFiles = this.vault.getMarkdownFiles();
		const totalNotes = allFiles.length;

		// Calculate total size
		let totalSize = 0;
		for (const file of allFiles) {
			const stat = this.vault.stat(file);
			if (stat) {
				totalSize += stat.size;
			}
		}

		const info = {
			totalNotes,
			totalSize,
			sizeFormatted: this.formatBytes(totalSize)
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(info, null, 2)
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 3: Commit search methods migration**

```bash
git add src/tools/vault-tools.ts
git commit -m "refactor: migrate search and getVaultInfo to use adapters

Update search and getVaultInfo methods to use IVaultAdapter
instead of direct App.vault access."
```

---

## Task 8: Complete VaultTools Migration - Link Methods

**Files:**
- Modify: `src/tools/vault-tools.ts`

**Step 1: Update validateWikilinks to use adapters**

Find the `validateWikilinks` method:

```typescript
async validateWikilinks(path: string): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file || !(file instanceof TFile)) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		// Read file content
		const content = await this.vault.read(file);

		// Use LinkUtils to validate (LinkUtils already uses metadataCache internally)
		const resolved: any[] = [];
		const unresolved: any[] = [];

		// Extract wikilinks from content
		const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
		let match;

		while ((match = wikilinkRegex.exec(content)) !== null) {
			const linktext = match[1];
			const [linkpath, alias] = linktext.split('|');
			const [path, heading] = linkpath.split('#');

			const dest = this.metadata.getFirstLinkpathDest(path.trim(), normalizedPath);

			if (dest) {
				resolved.push({
					link: linktext,
					resolvedPath: dest.path,
					hasHeading: !!heading,
					hasAlias: !!alias
				});
			} else {
				unresolved.push({
					link: linktext,
					reason: 'File not found'
				});
			}
		}

		const result = {
			path: normalizedPath,
			totalLinks: resolved.length + unresolved.length,
			resolvedLinks: resolved,
			unresolvedLinks: unresolved
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Validate wikilinks error: ${(error as Error).message}`
			}],
			isError: true
		};
	}
}
```

**Step 2: Update resolveWikilink to use adapters**

Find the `resolveWikilink` method:

```typescript
async resolveWikilink(linktext: string, sourcePath: string): Promise<CallToolResult> {
	try {
		const normalizedSource = PathUtils.normalizePath(sourcePath);

		// Parse linktext
		const [linkpath, alias] = linktext.split('|');
		const [path, heading] = linkpath.split('#');

		const dest = this.metadata.getFirstLinkpathDest(path.trim(), normalizedSource);

		if (!dest) {
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						resolved: false,
						linktext,
						reason: 'File not found'
					}, null, 2)
				}]
			};
		}

		const result = {
			resolved: true,
			linktext,
			resolvedPath: dest.path,
			hasHeading: !!heading,
			heading: heading?.trim(),
			hasAlias: !!alias,
			alias: alias?.trim()
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 3: Update backlinks to use adapters**

Find the `backlinks` method:

```typescript
async backlinks(
	path: string,
	includeSnippets: boolean = true,
	includeUnlinked: boolean = false
): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file || !(file instanceof TFile)) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		// Get backlinks from metadata cache
		const backlinksData = this.metadata.getBacklinksForFile(file);
		const backlinks: any[] = [];

		for (const [sourcePath, positions] of Object.entries(backlinksData)) {
			const sourceFile = this.vault.getAbstractFileByPath(sourcePath);

			if (sourceFile && sourceFile instanceof TFile) {
				const occurrences: any[] = [];

				for (const pos of positions as any[]) {
					let snippet = '';

					if (includeSnippets) {
						const content = await this.vault.read(sourceFile);
						const lines = content.split('\n');
						snippet = lines[pos.line] || '';
					}

					occurrences.push({
						line: pos.line,
						column: pos.column,
						snippet
					});
				}

				backlinks.push({
					sourcePath,
					occurrences
				});
			}
		}

		// If snippets not requested, remove them
		if (!includeSnippets) {
			for (const backlink of backlinks) {
				for (const occurrence of backlink.occurrences) {
					occurrence.snippet = '';
				}
			}
		}

		const result = {
			path: normalizedPath,
			backlinks,
			totalBacklinks: backlinks.length
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(result, null, 2)
			}]
		};
	} catch (error) {
		return {
			content: [{
				type: "text",
				text: `Backlinks error: ${(error as Error).message}`
			}],
			isError: true
		};
	}
}
```

**Step 4: Remove app parameter from constructor**

Now that all methods are migrated, remove the temporary `app` parameter:

```typescript
export class VaultTools {
	constructor(
		private vault: IVaultAdapter,
		private metadata: IMetadataCacheAdapter
	) {}

	// ... all methods now use adapters only ...
}
```

Update factory function:

```typescript
export function createVaultTools(app: App): VaultTools {
	return new VaultTools(
		new VaultAdapter(app.vault),
		new MetadataCacheAdapter(app.metadataCache)
	);
}
```

**Step 5: Commit link methods migration**

```bash
git add src/tools/vault-tools.ts src/tools/vault-tools-factory.ts
git commit -m "refactor: complete VaultTools adapter migration

Migrate validateWikilinks, resolveWikilink, and backlinks methods
to use adapters. Remove temporary app parameter from constructor.
VaultTools now fully depends on interface abstractions."
```

---

## Task 9: Add Tests for Uncovered VaultTools Paths

**Files:**
- Modify: `tests/vault-tools.test.ts`

**Step 1: Add frontmatter extraction tests**

Add test cases for the extractFrontmatterSummary method edge cases:

```typescript
describe('extractFrontmatterSummary', () => {
	it('should handle string tags and convert to array', async () => {
		const mockFile = createMockTFile('test.md');
		const mockCache = {
			frontmatter: {
				title: 'Test',
				tags: 'single-tag'
			}
		};

		mockVault.getRoot = jest.fn().mockReturnValue(
			createMockTFolder('', [mockFile])
		);
		mockVault.stat = jest.fn().mockReturnValue({
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

		const result = await vaultTools.listNotes('', true);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.items[0].metadata.frontmatterSummary.tags).toEqual(['single-tag']);
	});

	it('should handle array tags and preserve as array', async () => {
		const mockFile = createMockTFile('test.md');
		const mockCache = {
			frontmatter: {
				title: 'Test',
				tags: ['tag1', 'tag2']
			}
		};

		mockVault.getRoot = jest.fn().mockReturnValue(
			createMockTFolder('', [mockFile])
		);
		mockVault.stat = jest.fn().mockReturnValue({
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

		const result = await vaultTools.listNotes('', true);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.items[0].metadata.frontmatterSummary.tags).toEqual(['tag1', 'tag2']);
	});

	it('should handle string aliases and convert to array', async () => {
		const mockFile = createMockTFile('test.md');
		const mockCache = {
			frontmatter: {
				aliases: 'single-alias'
			}
		};

		mockVault.getRoot = jest.fn().mockReturnValue(
			createMockTFolder('', [mockFile])
		);
		mockVault.stat = jest.fn().mockReturnValue({
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

		const result = await vaultTools.listNotes('', true);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.items[0].metadata.frontmatterSummary.aliases).toEqual(['single-alias']);
	});

	it('should handle frontmatter extraction error gracefully', async () => {
		const mockFile = createMockTFile('test.md');

		mockVault.getRoot = jest.fn().mockReturnValue(
			createMockTFolder('', [mockFile])
		);
		mockVault.stat = jest.fn().mockReturnValue({
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockMetadata.getFileCache = jest.fn().mockImplementation(() => {
			throw new Error('Cache error');
		});

		const result = await vaultTools.listNotes('', true);

		// Should return base metadata even if frontmatter extraction fails
		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.items[0].metadata).toBeDefined();
		expect(parsed.items[0].metadata.created).toBe(1000);
	});

	it('should include custom frontmatter fields', async () => {
		const mockFile = createMockTFile('test.md');
		const mockCache = {
			frontmatter: {
				title: 'Test',
				customField: 'custom value',
				anotherField: 123
			}
		};

		mockVault.getRoot = jest.fn().mockReturnValue(
			createMockTFolder('', [mockFile])
		);
		mockVault.stat = jest.fn().mockReturnValue({
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockMetadata.getFileCache = jest.fn().mockReturnValue(mockCache);

		const result = await vaultTools.listNotes('', true);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.items[0].metadata.frontmatterSummary.customField).toBe('custom value');
		expect(parsed.items[0].metadata.frontmatterSummary.anotherField).toBe(123);
	});
});
```

**Step 2: Add backlinks tests with snippet options**

```typescript
describe('backlinks with options', () => {
	it('should include snippets when includeSnippets is true', async () => {
		const targetFile = createMockTFile('target.md');
		const sourceFile = createMockTFile('source.md');

		mockVault.getAbstractFileByPath = jest.fn()
			.mockReturnValueOnce(targetFile)
			.mockReturnValue(sourceFile);
		mockVault.read = jest.fn().mockResolvedValue('This links to [[target]]');
		mockMetadata.getBacklinksForFile = jest.fn().mockReturnValue({
			'source.md': [{ line: 0, column: 15 }]
		});

		const result = await vaultTools.backlinks('target.md', true);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.backlinks[0].occurrences[0].snippet).toBe('This links to [[target]]');
	});

	it('should remove snippets when includeSnippets is false', async () => {
		const targetFile = createMockTFile('target.md');
		const sourceFile = createMockTFile('source.md');

		mockVault.getAbstractFileByPath = jest.fn()
			.mockReturnValueOnce(targetFile)
			.mockReturnValue(sourceFile);
		mockMetadata.getBacklinksForFile = jest.fn().mockReturnValue({
			'source.md': [{ line: 0, column: 15 }]
		});

		const result = await vaultTools.backlinks('target.md', false);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.backlinks[0].occurrences[0].snippet).toBe('');
	});
});
```

**Step 3: Add validateWikilinks error path tests**

```typescript
describe('validateWikilinks error paths', () => {
	it('should return error if file not found', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

		const result = await vaultTools.validateWikilinks('nonexistent.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('not found');
	});

	it('should handle wikilink parsing errors gracefully', async () => {
		const mockFile = createMockTFile('test.md');

		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.read = jest.fn().mockRejectedValue(new Error('Read error'));

		const result = await vaultTools.validateWikilinks('test.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('error');
	});
});
```

**Step 4: Run tests to verify coverage increase**

```bash
npm run test:coverage -- vault-tools
```

Expected: Coverage for vault-tools.ts should increase significantly, targeting areas that were previously uncovered (lines 309-352, 716-735, 824-852).

**Step 5: Commit new tests**

```bash
git add tests/vault-tools.test.ts
git commit -m "test: add coverage for VaultTools uncovered paths

Add tests for frontmatter extraction edge cases, backlinks options,
and error handling paths. Targets previously uncovered lines."
```

---

## Task 10: Refactor NoteTools to Use Adapters

**Files:**
- Modify: `src/tools/note-tools.ts`
- Create: `src/tools/note-tools-factory.ts`

**Step 1: Update NoteTools constructor**

In `src/tools/note-tools.ts`, update the constructor:

```typescript
import { IVaultAdapter, IFileManagerAdapter } from '../adapters/interfaces';

export class NoteTools {
	constructor(
		private vault: IVaultAdapter,
		private fileManager: IFileManagerAdapter,
		private app: App  // Keep temporarily
	) {}

	// ... rest of class
}
```

**Step 2: Create factory function**

Create `src/tools/note-tools-factory.ts`:

```typescript
import { App } from 'obsidian';
import { NoteTools } from './note-tools';
import { VaultAdapter } from '../adapters/vault-adapter';
import { FileManagerAdapter } from '../adapters/file-manager-adapter';

/**
 * Factory function to create NoteTools with concrete adapters
 */
export function createNoteTools(app: App): NoteTools {
	return new NoteTools(
		new VaultAdapter(app.vault),
		new FileManagerAdapter(app.fileManager),
		app
	);
}
```

**Step 3: Update readNote to use adapters**

Find the `readNote` method:

```typescript
async readNote(path: string, includeVersionId: boolean = false): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file || !(file instanceof TFile)) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		const content = await this.vault.read(file);

		if (includeVersionId) {
			const versionId = VersionUtils.generateVersionId(file);
			return {
				content: [{
					type: "text",
					text: content
				}],
				_meta: {
					versionId
				}
			};
		}

		return {
			content: [{
				type: "text",
				text: content
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 4: Update createNote to use adapters**

Find the `createNote` method:

```typescript
async createNote(
	path: string,
	content: string,
	createParents: boolean = false,
	conflictStrategy: 'error' | 'overwrite' | 'rename' = 'error'
): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);

		// Check if file exists
		const existing = this.vault.getAbstractFileByPath(normalizedPath);

		if (existing) {
			switch (conflictStrategy) {
				case 'error':
					return {
						content: [{
							type: "text",
							text: ErrorMessages.fileAlreadyExists(normalizedPath)
						}],
						isError: true
					};
				case 'overwrite':
					if (existing instanceof TFile) {
						await this.vault.process(existing, () => content);
						return {
							content: [{
								type: "text",
								text: `Note overwritten successfully: ${normalizedPath}`
							}]
						};
					}
					break;
				case 'rename':
					// Find available name
					let counter = 1;
					let newPath = normalizedPath;
					while (this.vault.getAbstractFileByPath(newPath)) {
						const parts = normalizedPath.split('.');
						const ext = parts.pop();
						const base = parts.join('.');
						newPath = `${base}-${counter}.${ext}`;
						counter++;
					}
					await this.vault.create(newPath, content);
					return {
						content: [{
							type: "text",
							text: `Note created with renamed path: ${newPath}`
						}]
					};
			}
		}

		// Create parent folders if requested
		if (createParents) {
			const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
			if (parentPath) {
				await this.createParentFolders(parentPath);
			}
		} else {
			// Check parent exists
			const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
			if (parentPath) {
				const parent = this.vault.getAbstractFileByPath(parentPath);
				if (!parent) {
					return {
						content: [{
							type: "text",
							text: ErrorMessages.parentFolderNotFound(normalizedPath, parentPath)
						}],
						isError: true
					};
				}
			}
		}

		await this.vault.create(normalizedPath, content);

		return {
			content: [{
				type: "text",
				text: `Note created successfully: ${normalizedPath}`
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}

private async createParentFolders(path: string): Promise<void> {
	const parts = path.split('/');
	let currentPath = '';

	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;
		const existing = this.vault.getAbstractFileByPath(currentPath);

		if (!existing) {
			await this.vault.createFolder(currentPath);
		}
	}
}
```

**Step 5: Update updateNote to use adapters**

Find the `updateNote` method:

```typescript
async updateNote(
	path: string,
	content: string,
	ifMatch?: string
): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file || !(file instanceof TFile)) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		// Check version if ifMatch provided
		if (ifMatch) {
			const currentVersion = VersionUtils.generateVersionId(file);
			if (currentVersion !== ifMatch) {
				return {
					content: [{
						type: "text",
						text: ErrorMessages.versionMismatch(normalizedPath, ifMatch, currentVersion)
					}],
					isError: true
				};
			}
		}

		await this.vault.process(file, () => content);

		return {
			content: [{
				type: "text",
				text: `Note updated successfully: ${normalizedPath}`
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 6: Update deleteNote to use adapters**

Find the `deleteNote` method:

```typescript
async deleteNote(path: string): Promise<CallToolResult> {
	try {
		const normalizedPath = PathUtils.normalizePath(path);
		const file = this.vault.getAbstractFileByPath(normalizedPath);

		if (!file) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedPath)
				}],
				isError: true
			};
		}

		await this.fileManager.trashFile(file);

		return {
			content: [{
				type: "text",
				text: `Note deleted successfully: ${normalizedPath}`
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 7: Update renameFile to use adapters**

Find the `renameFile` method:

```typescript
async renameFile(oldPath: string, newPath: string): Promise<CallToolResult> {
	try {
		const normalizedOld = PathUtils.normalizePath(oldPath);
		const normalizedNew = PathUtils.normalizePath(newPath);

		const file = this.vault.getAbstractFileByPath(normalizedOld);

		if (!file) {
			return {
				content: [{
					type: "text",
					text: ErrorMessages.fileNotFound(normalizedOld)
				}],
				isError: true
			};
		}

		await this.fileManager.renameFile(file, normalizedNew);

		return {
			content: [{
				type: "text",
				text: `File renamed successfully: ${normalizedOld} → ${normalizedNew}`
			}]
		};
	} catch (error) {
		// ... error handling ...
	}
}
```

**Step 8: Remove app parameter from constructor**

Remove the temporary app parameter:

```typescript
export class NoteTools {
	constructor(
		private vault: IVaultAdapter,
		private fileManager: IFileManagerAdapter
	) {}

	// ... all methods now use adapters only ...
}
```

Update factory:

```typescript
export function createNoteTools(app: App): NoteTools {
	return new NoteTools(
		new VaultAdapter(app.vault),
		new FileManagerAdapter(app.fileManager)
	);
}
```

**Step 9: Commit NoteTools refactoring**

```bash
git add src/tools/note-tools.ts src/tools/note-tools-factory.ts
git commit -m "refactor: migrate NoteTools to use adapter interfaces

Update NoteTools to depend on IVaultAdapter and IFileManagerAdapter.
Migrate all CRUD methods (read, create, update, delete, rename) to
use adapters instead of direct Obsidian API access."
```

---

## Task 11: Update NoteTools Tests and Fix parent-folder-detection

**Files:**
- Modify: `tests/note-tools.test.ts`
- Modify: `tests/parent-folder-detection.test.ts`

**Step 1: Update note-tools.test.ts imports and setup**

```typescript
import { NoteTools } from '../src/tools/note-tools';
import { createMockVaultAdapter, createMockFileManagerAdapter, createMockTFile } from './__mocks__/adapters';
import { TFile, App } from 'obsidian';

describe('NoteTools', () => {
	let noteTools: NoteTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockFileManager: ReturnType<typeof createMockFileManagerAdapter>;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockFileManager = createMockFileManagerAdapter();
		noteTools = new NoteTools(mockVault, mockFileManager);
	});

	// ... tests ...
});
```

**Step 2: Update readNote tests**

```typescript
describe('readNote', () => {
	it('should read note content', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.read = jest.fn().mockResolvedValue('# Test Content');

		const result = await noteTools.readNote('test.md');

		expect(result.isError).toBeUndefined();
		expect(result.content[0].text).toBe('# Test Content');
		expect(mockVault.read).toHaveBeenCalledWith(mockFile);
	});

	it('should return error if file not found', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

		const result = await noteTools.readNote('nonexistent.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('not found');
	});

	it('should include versionId when requested', async () => {
		const mockFile = createMockTFile('test.md', {
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.read = jest.fn().mockResolvedValue('content');

		const result = await noteTools.readNote('test.md', true);

		expect(result.isError).toBeUndefined();
		expect(result._meta?.versionId).toBeDefined();
	});
});
```

**Step 3: Update createNote tests**

```typescript
describe('createNote', () => {
	it('should create note successfully', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
		mockVault.create = jest.fn().mockResolvedValue(createMockTFile('test.md'));

		const result = await noteTools.createNote('test.md', 'content');

		expect(result.isError).toBeUndefined();
		expect(mockVault.create).toHaveBeenCalledWith('test.md', 'content');
		expect(result.content[0].text).toContain('created successfully');
	});

	it('should return error if file exists and strategy is error', async () => {
		const existing = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(existing);

		const result = await noteTools.createNote('test.md', 'content', false, 'error');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('already exists');
	});

	it('should overwrite if strategy is overwrite', async () => {
		const existing = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(existing);
		mockVault.process = jest.fn().mockResolvedValue('content');

		const result = await noteTools.createNote('test.md', 'content', false, 'overwrite');

		expect(result.isError).toBeUndefined();
		expect(mockVault.process).toHaveBeenCalled();
		expect(result.content[0].text).toContain('overwritten');
	});

	it('should rename if strategy is rename', async () => {
		const existing = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn()
			.mockReturnValueOnce(existing)
			.mockReturnValue(null);
		mockVault.create = jest.fn().mockResolvedValue(createMockTFile('test-1.md'));

		const result = await noteTools.createNote('test.md', 'content', false, 'rename');

		expect(result.isError).toBeUndefined();
		expect(mockVault.create).toHaveBeenCalledWith('test-1.md', 'content');
	});
});
```

**Step 4: Update parent-folder-detection.test.ts**

Update the entire test file to use mock adapters:

```typescript
import { NoteTools } from '../src/tools/note-tools';
import { createMockVaultAdapter, createMockFileManagerAdapter, createMockTFile, createMockTFolder } from './__mocks__/adapters';

describe('Enhanced Parent Folder Detection', () => {
	let noteTools: NoteTools;
	let mockVault: ReturnType<typeof createMockVaultAdapter>;
	let mockFileManager: ReturnType<typeof createMockFileManagerAdapter>;

	beforeEach(() => {
		mockVault = createMockVaultAdapter();
		mockFileManager = createMockFileManagerAdapter();
		noteTools = new NoteTools(mockVault, mockFileManager);
	});

	describe('Explicit parent folder detection', () => {
		it('should succeed when parent folder exists', async () => {
			const parentFolder = createMockTFolder('existing-folder');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(null) // File doesn't exist
				.mockReturnValue(parentFolder); // Parent exists
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('existing-folder/file.md'));

			const result = await noteTools.createNote('existing-folder/file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(result.content[0].text).toContain('Note created successfully');
			expect(mockVault.create).toHaveBeenCalledWith('existing-folder/file.md', 'content');
		});

		it('should fail when parent folder does not exist and createParents is false', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

			const result = await noteTools.createNote('missing-folder/file.md', 'content', false);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Parent folder');
		});
	});

	describe('createParents parameter', () => {
		it('should create single missing parent folder when createParents is true', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('new-folder/file.md'));

			const result = await noteTools.createNote('new-folder/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledWith('new-folder');
			expect(mockVault.create).toHaveBeenCalledWith('new-folder/file.md', 'content');
			expect(result.content[0].text).toContain('Note created successfully');
		});

		it('should recursively create all missing parent folders', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('a/b/c/file.md'));

			const result = await noteTools.createNote('a/b/c/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledTimes(3);
			expect(mockVault.createFolder).toHaveBeenCalledWith('a');
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b');
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b/c');
		});

		it('should skip creating folders that already exist', async () => {
			const folderA = createMockTFolder('a');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(null) // File doesn't exist
				.mockReturnValueOnce(folderA) // 'a' exists
				.mockReturnValue(null); // 'a/b' doesn't exist
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('a/b/file.md'));

			const result = await noteTools.createNote('a/b/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			// Should only create 'a/b', not 'a' (which already exists)
			expect(mockVault.createFolder).toHaveBeenCalledTimes(1);
			expect(mockVault.createFolder).toHaveBeenCalledWith('a/b');
		});
	});

	describe('Edge cases', () => {
		it('should handle file in root directory (no parent path)', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('file.md'));

			const result = await noteTools.createNote('file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('file.md', 'content');
		});

		it('should normalize paths before checking parent', async () => {
			const parentFolder = createMockTFolder('folder');

			mockVault.getAbstractFileByPath = jest.fn()
				.mockReturnValueOnce(null)
				.mockReturnValue(parentFolder);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('folder/file.md'));

			const result = await noteTools.createNote('folder//file.md', 'content', false);

			expect(result.isError).toBeUndefined();
			expect(mockVault.create).toHaveBeenCalledWith('folder/file.md', 'content');
		});

		it('should handle deeply nested paths', async () => {
			mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
			mockVault.createFolder = jest.fn().mockResolvedValue(undefined);
			mockVault.create = jest.fn().mockResolvedValue(createMockTFile('a/b/c/d/e/f/file.md'));

			const result = await noteTools.createNote('a/b/c/d/e/f/file.md', 'content', true);

			expect(result.isError).toBeUndefined();
			expect(mockVault.createFolder).toHaveBeenCalledTimes(6);
		});
	});
});
```

**Step 5: Run tests to verify fixes**

```bash
npm test
```

Expected: All tests should now pass, including the 13 that were failing before.

**Step 6: Commit test fixes**

```bash
git add tests/note-tools.test.ts tests/parent-folder-detection.test.ts
git commit -m "test: update NoteTools tests to use mock adapters

Replace complex App mocks with clean adapter pattern. Fixes all
parent-folder-detection test failures by providing proper mocks."
```

---

## Task 12: Add Tests for Uncovered NoteTools Paths

**Files:**
- Modify: `tests/note-tools.test.ts`

**Step 1: Add version mismatch tests**

```typescript
describe('updateNote with version checking', () => {
	it('should update when version matches', async () => {
		const mockFile = createMockTFile('test.md', {
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		const expectedVersion = `2000-100`;

		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.process = jest.fn().mockResolvedValue('new content');

		const result = await noteTools.updateNote('test.md', 'new content', expectedVersion);

		expect(result.isError).toBeUndefined();
		expect(mockVault.process).toHaveBeenCalled();
	});

	it('should return error when version does not match', async () => {
		const mockFile = createMockTFile('test.md', {
			ctime: 1000,
			mtime: 2000,
			size: 100
		});
		const wrongVersion = `1000-50`;

		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);

		const result = await noteTools.updateNote('test.md', 'new content', wrongVersion);

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('version mismatch');
		expect(mockVault.process).not.toHaveBeenCalled();
	});

	it('should update without version check when ifMatch not provided', async () => {
		const mockFile = createMockTFile('test.md');

		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.process = jest.fn().mockResolvedValue('new content');

		const result = await noteTools.updateNote('test.md', 'new content');

		expect(result.isError).toBeUndefined();
		expect(mockVault.process).toHaveBeenCalled();
	});
});
```

**Step 2: Add error handling tests**

```typescript
describe('error handling', () => {
	it('should handle read errors', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.read = jest.fn().mockRejectedValue(new Error('Permission denied'));

		const result = await noteTools.readNote('test.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Permission denied');
	});

	it('should handle create errors', async () => {
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
		mockVault.create = jest.fn().mockRejectedValue(new Error('Disk full'));

		const result = await noteTools.createNote('test.md', 'content');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Disk full');
	});

	it('should handle update errors', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockVault.process = jest.fn().mockRejectedValue(new Error('File locked'));

		const result = await noteTools.updateNote('test.md', 'content');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('File locked');
	});

	it('should handle delete errors', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockFileManager.trashFile = jest.fn().mockRejectedValue(new Error('Cannot delete'));

		const result = await noteTools.deleteNote('test.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Cannot delete');
	});

	it('should handle rename errors', async () => {
		const mockFile = createMockTFile('test.md');
		mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(mockFile);
		mockFileManager.renameFile = jest.fn().mockRejectedValue(new Error('Name conflict'));

		const result = await noteTools.renameFile('test.md', 'new.md');

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain('Name conflict');
	});
});
```

**Step 3: Run coverage to check progress**

```bash
npm run test:coverage
```

Expected: Coverage for note-tools.ts should approach or reach 100%.

**Step 4: Commit new tests**

```bash
git add tests/note-tools.test.ts
git commit -m "test: add coverage for NoteTools uncovered paths

Add tests for version mismatch handling, error paths, and edge cases.
Targets previously uncovered lines in note-tools.ts."
```

---

## Task 13: Update ToolRegistry to Use Factory Functions

**Files:**
- Modify: `src/tools/index.ts`

**Step 1: Update imports and tool instantiation**

In `src/tools/index.ts`, update to use factory functions:

```typescript
import { App } from 'obsidian';
import { createNoteTools } from './note-tools-factory';
import { createVaultTools } from './vault-tools-factory';
import { NotificationManager } from '../ui/notifications';

export class ToolRegistry {
	private noteTools: ReturnType<typeof createNoteTools>;
	private vaultTools: ReturnType<typeof createVaultTools>;

	constructor(app: App, notificationManager?: NotificationManager) {
		this.noteTools = createNoteTools(app);
		this.vaultTools = createVaultTools(app);

		// ... rest of constructor ...
	}

	// ... rest of class unchanged ...
}
```

**Step 2: Verify no breaking changes**

The public API of ToolRegistry remains unchanged - it still accepts an App object and uses the tools internally.

**Step 3: Commit ToolRegistry update**

```bash
git add src/tools/index.ts
git commit -m "refactor: update ToolRegistry to use factory functions

Use createNoteTools and createVaultTools factory functions instead
of direct instantiation. Completes integration of adapter pattern."
```

---

## Task 14: Update Main Plugin to Use Factory Functions (if needed)

**Files:**
- Check: `src/main.ts` (may not need changes)

**Step 1: Check if main.ts directly instantiates tools**

```bash
grep -n "new NoteTools\|new VaultTools" src/main.ts
```

Expected: Likely no matches, as main.ts probably only uses ToolRegistry.

**Step 2: If changes needed, update imports**

If main.ts directly creates tools (unlikely), update to use factories:

```typescript
import { createNoteTools } from './tools/note-tools-factory';
import { createVaultTools } from './tools/vault-tools-factory';

// Replace:
// const noteTools = new NoteTools(this.app);
// With:
const noteTools = createNoteTools(this.app);
```

**Step 3: Commit if changes made**

```bash
git add src/main.ts
git commit -m "refactor: update main plugin to use factory functions"
```

Or skip this task if no changes needed.

---

## Task 15: Run Full Test Suite and Verify 100% Coverage

**Files:**
- N/A (verification task)

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests passing (401+ tests).

**Step 2: Run coverage report**

```bash
npm run test:coverage
```

Expected output:
```
-----------------------|---------|----------|---------|---------|---
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|---
All files              |     100 |      100 |     100 |     100 |
 adapters              |     100 |      100 |     100 |     100 |
  file-manager-adapter.ts |   100 |      100 |     100 |     100 |
  interfaces.ts        |     100 |      100 |     100 |     100 |
  metadata-adapter.ts  |     100 |      100 |     100 |     100 |
  vault-adapter.ts     |     100 |      100 |     100 |     100 |
 tools                 |     100 |      100 |     100 |     100 |
  note-tools.ts        |     100 |      100 |     100 |     100 |
  vault-tools.ts       |     100 |      100 |     100 |     100 |
 utils                 |     100 |      100 |     100 |     100 |
  ...                  |     100 |      100 |     100 |     100 |
-----------------------|---------|----------|---------|---------|---
```

**Step 3: If not 100%, identify remaining gaps**

```bash
npm run test:coverage -- --verbose
```

Check the output for any remaining uncovered lines and add targeted tests.

**Step 4: Document coverage achievement**

Once 100% is reached, capture the coverage report:

```bash
npm run test:coverage > coverage-report.txt
git add coverage-report.txt
git commit -m "docs: capture 100% test coverage achievement

All files now have 100% statement, branch, function, and line coverage."
```

---

## Task 16: Run Build and Verify No Errors

**Files:**
- N/A (verification task)

**Step 1: Run TypeScript type check**

```bash
npm run build
```

Expected: No type errors. Build should complete successfully.

**Step 2: Check for any compilation warnings**

Review build output for any warnings that should be addressed.

**Step 3: Verify output files**

```bash
ls -lh main.js
```

Expected: main.js exists and has reasonable size (should be similar to before refactoring).

**Step 4: Commit if any build config changes were needed**

```bash
git add tsconfig.json  # If modified
git commit -m "chore: update build configuration for adapter pattern"
```

Or skip if no changes.

---

## Task 17: Create Summary Commit and Tag

**Files:**
- N/A (Git operations)

**Step 1: Create summary of all changes**

Review git log to see all commits:

```bash
git log --oneline master..HEAD
```

**Step 2: Create final summary commit (if desired)**

```bash
git commit --allow-empty -m "feat: achieve 100% test coverage via dependency injection

Summary of changes:
- Created adapter interfaces (IVaultAdapter, IMetadataCacheAdapter, IFileManagerAdapter)
- Implemented concrete adapters as Obsidian API wrappers
- Refactored NoteTools and VaultTools to depend on interfaces
- Created factory functions for production usage
- Updated all tests to use clean mock adapter pattern
- Added tests for all previously uncovered code paths

Results:
- 100% test coverage (statements, branches, functions, lines)
- All 401+ tests passing
- Cleaner, more maintainable test code
- Build succeeds with no errors

Benefits:
- Easy to test new features (inject simple mocks)
- Obsidian API changes isolated to adapter layer
- Strong confidence for future refactoring
- Clear separation between business logic and API dependencies"
```

**Step 3: Create a tag for this milestone**

```bash
git tag -a v100-percent-coverage -m "100% test coverage milestone"
```

---

## Task 18: Manual Verification in Obsidian (Optional but Recommended)

**Files:**
- N/A (manual testing)

**Step 1: Build the plugin**

```bash
npm run build
```

**Step 2: Copy files to Obsidian vault for testing**

```bash
# Assuming you have a test vault
cp main.js manifest.json styles.css /path/to/test-vault/.obsidian/plugins/obsidian-mcp-server/
```

**Step 3: Test in Obsidian**

1. Open Obsidian
2. Reload Obsidian (Ctrl/Cmd + R if in dev mode)
3. Enable the plugin
4. Start the MCP server
5. Test a few basic operations via HTTP client:
   - Create a note
   - Read a note
   - List notes
   - Search
   - Check that everything works as before

**Step 4: Document verification**

If all works correctly:

```bash
git commit --allow-empty -m "verify: manual testing in Obsidian successful

Tested plugin in Obsidian after dependency injection refactoring.
All basic operations (create, read, list, search) working correctly."
```

---

## Completion Checklist

- [ ] Task 1: Create adapter interfaces
- [ ] Task 2: Implement concrete adapters
- [ ] Task 3: Create mock adapters
- [ ] Task 4: Refactor VaultTools to use adapters
- [ ] Task 5: Update VaultTools tests
- [ ] Task 6: Fix list-notes-sorting tests
- [ ] Task 7: Migrate search methods
- [ ] Task 8: Migrate link methods
- [ ] Task 9: Add tests for uncovered VaultTools paths
- [ ] Task 10: Refactor NoteTools to use adapters
- [ ] Task 11: Update NoteTools tests and fix parent-folder-detection
- [ ] Task 12: Add tests for uncovered NoteTools paths
- [ ] Task 13: Update ToolRegistry
- [ ] Task 14: Update main plugin (if needed)
- [ ] Task 15: Verify 100% coverage
- [ ] Task 16: Verify build succeeds
- [ ] Task 17: Create summary and tag
- [ ] Task 18: Manual verification (optional)

---

## Success Criteria

**Primary Goals:**
✅ 100% test coverage: statements, branches, functions, lines
✅ All tests passing (401+ tests)
✅ Build succeeds with no errors
✅ Plugin functions correctly in Obsidian

**Code Quality Goals:**
✅ Clean separation between business logic and Obsidian API
✅ Simple, maintainable test code using mock adapters
✅ Factory pattern enables easy production usage
✅ No breaking changes to public API

**Documentation:**
✅ Design document committed
✅ Implementation plan committed
✅ Coverage achievement documented
✅ Manual verification documented
