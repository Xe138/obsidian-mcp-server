# 100% Test Coverage via Dependency Injection

**Date:** 2025-10-19
**Goal:** Achieve 100% test coverage through dependency injection refactoring
**Current Coverage:** 90.58% overall (VaultTools: 71.72%, NoteTools: 92.77%)

## Motivation

We want codebase confidence for future refactoring and feature work. The current test suite has good coverage but gaps remain in:
- Error handling paths
- Edge cases (type coercion, missing data)
- Complex conditional branches

The current testing approach directly mocks Obsidian's `App` object, leading to:
- Complex, brittle mock setups
- Duplicated mocking code across test files
- Difficulty isolating specific behaviors
- Hard-to-test error conditions

## Solution: Dependency Injection Architecture

### Core Principle
Extract interfaces for Obsidian API dependencies, allowing tools to depend on abstractions rather than concrete implementations. This enables clean, simple mocks in tests while maintaining production functionality.

### Architecture Overview

**Current State:**
```typescript
class NoteTools {
  constructor(private app: App) {}
  // Methods use: this.app.vault.X, this.app.metadataCache.Y, etc.
}
```

**Target State:**
```typescript
class NoteTools {
  constructor(
    private vault: IVaultAdapter,
    private metadata: IMetadataCacheAdapter,
    private fileManager: IFileManagerAdapter
  ) {}
  // Methods use: this.vault.X, this.metadata.Y, etc.
}

// Production usage via factory:
function createNoteTools(app: App): NoteTools {
  return new NoteTools(
    new VaultAdapter(app.vault),
    new MetadataCacheAdapter(app.metadataCache),
    new FileManagerAdapter(app.fileManager)
  );
}
```

## Interface Design

### IVaultAdapter
Wraps file system operations from Obsidian's Vault API.

```typescript
interface IVaultAdapter {
  // File reading
  read(path: string): Promise<string>;

  // File existence and metadata
  exists(path: string): boolean;
  stat(path: string): { ctime: number; mtime: number; size: number } | null;

  // File retrieval
  getAbstractFileByPath(path: string): TAbstractFile | null;
  getMarkdownFiles(): TFile[];

  // Directory operations
  getRoot(): TFolder;
}
```

### IMetadataCacheAdapter
Wraps metadata and link resolution from Obsidian's MetadataCache API.

```typescript
interface IMetadataCacheAdapter {
  // Cache access
  getFileCache(file: TFile): CachedMetadata | null;

  // Link resolution
  getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;

  // Backlinks
  getBacklinksForFile(file: TFile): { [key: string]: any };

  // Additional metadata methods as needed
}
```

### IFileManagerAdapter
Wraps file modification operations from Obsidian's FileManager API.

```typescript
interface IFileManagerAdapter {
  // File operations
  rename(file: TAbstractFile, newPath: string): Promise<void>;
  delete(file: TAbstractFile): Promise<void>;
  create(path: string, content: string): Promise<TFile>;
  modify(file: TFile, content: string): Promise<void>;
}
```

## Implementation Strategy

### Directory Structure
```
src/
├── adapters/
│   ├── interfaces.ts          # Interface definitions
│   ├── vault-adapter.ts       # VaultAdapter implementation
│   ├── metadata-adapter.ts    # MetadataCacheAdapter implementation
│   └── file-manager-adapter.ts # FileManagerAdapter implementation
├── tools/
│   ├── note-tools.ts          # Refactored to use adapters
│   └── vault-tools.ts         # Refactored to use adapters
tests/
├── __mocks__/
│   ├── adapters.ts            # Mock adapter factories
│   └── obsidian.ts            # Existing Obsidian mocks (minimal usage going forward)
```

### Migration Approach

**Step 1: Create Adapters**
- Define interfaces in `src/adapters/interfaces.ts`
- Implement concrete adapters (simple pass-through wrappers initially)
- Create mock adapter factories in `tests/__mocks__/adapters.ts`

**Step 2: Refactor VaultTools**
- Update constructor to accept adapter interfaces
- Replace all `this.app.X` calls with `this.X` (using injected adapters)
- Create `createVaultTools(app: App)` factory function
- Update tests to use mock adapters

**Step 3: Refactor NoteTools**
- Same pattern as VaultTools
- Create `createNoteTools(app: App)` factory function
- Update tests to use mock adapters

**Step 4: Integration**
- Update ToolRegistry to use factory functions
- Update main.ts to use factory functions
- Verify all existing functionality preserved

### Backward Compatibility

**Plugin Code (main.ts, ToolRegistry):**
- Uses factory functions: `createNoteTools(app)`, `createVaultTools(app)`
- No awareness of adapters - just passes the App object
- Public API unchanged

**Tool Classes:**
- Constructors accept adapters (new signature)
- All methods work identically (internal implementation detail)
- External callers use factory functions

## Test Suite Overhaul

### Mock Adapter Pattern

**Centralized Mock Creation:**
```typescript
// tests/__mocks__/adapters.ts
export function createMockVaultAdapter(overrides?: Partial<IVaultAdapter>): IVaultAdapter {
  return {
    read: jest.fn(),
    exists: jest.fn(),
    stat: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getMarkdownFiles: jest.fn(),
    getRoot: jest.fn(),
    ...overrides
  };
}

export function createMockMetadataCacheAdapter(overrides?: Partial<IMetadataCacheAdapter>): IMetadataCacheAdapter {
  return {
    getFileCache: jest.fn(),
    getFirstLinkpathDest: jest.fn(),
    getBacklinksForFile: jest.fn(),
    ...overrides
  };
}

export function createMockFileManagerAdapter(overrides?: Partial<IFileManagerAdapter>): IFileManagerAdapter {
  return {
    rename: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    modify: jest.fn(),
    ...overrides
  };
}
```

**Test Setup Simplification:**
```typescript
// Before: Complex App mock with nested properties
const mockApp = {
  vault: { read: jest.fn(), ... },
  metadataCache: { getFileCache: jest.fn(), ... },
  fileManager: { ... },
  // Many more properties...
};

// After: Simple, targeted mocks
const vaultAdapter = createMockVaultAdapter({
  read: jest.fn().mockResolvedValue('file content')
});
const tools = new VaultTools(vaultAdapter, mockMetadata, mockFileManager);
```

### Coverage Strategy by Feature Area

**1. Frontmatter Operations**
- Test string tags → array conversion
- Test array tags → preserved as array
- Test missing frontmatter → base metadata only
- Test frontmatter parsing errors → error handling path
- Test all field types (title, aliases, custom fields)

**2. Wikilink Validation**
- Test resolved links → included in results
- Test unresolved links → included with error details
- Test missing file → error path
- Test heading links (`[[note#heading]]`)
- Test alias links (`[[note|alias]]`)

**3. Backlinks**
- Test `includeSnippets: true` → snippets included
- Test `includeSnippets: false` → snippets removed
- Test `includeUnlinked: true` → unlinked mentions included
- Test `includeUnlinked: false` → only linked mentions
- Test error handling paths

**4. Search Utilities**
- Test glob pattern filtering
- Test regex search with matches
- Test regex search with no matches
- Test invalid regex → error handling
- Test edge cases (empty results, malformed patterns)

**5. Note CRUD Operations**
- Test all conflict strategies: error, overwrite, rename
- Test version mismatch → conflict error
- Test missing file on update → error path
- Test permission errors → error handling
- Test all edge cases in uncovered lines

**6. Path Validation Edge Cases**
- Test all PathUtils error conditions
- Test leading/trailing slash handling
- Test `..` traversal attempts
- Test absolute path rejection

## Implementation Phases

### Phase 1: Foundation (Adapters)
**Deliverables:**
- `src/adapters/interfaces.ts` - All interface definitions
- `src/adapters/vault-adapter.ts` - VaultAdapter implementation
- `src/adapters/metadata-adapter.ts` - MetadataCacheAdapter implementation
- `src/adapters/file-manager-adapter.ts` - FileManagerAdapter implementation
- `tests/__mocks__/adapters.ts` - Mock adapter factories
- Tests for adapters (basic pass-through verification)

**Success Criteria:**
- All adapters compile without errors
- Mock adapters available for test usage
- Simple adapter tests pass

### Phase 2: VaultTools Refactoring
**Deliverables:**
- Refactored VaultTools class using adapters
- `createVaultTools()` factory function
- Updated vault-tools.test.ts using mock adapters
- New tests for uncovered lines:
  - Frontmatter extraction (lines 309-352)
  - Wikilink validation error path (lines 716-735)
  - Backlinks snippet removal (lines 824-852)
  - Other uncovered paths

**Success Criteria:**
- VaultTools achieves 100% coverage (all metrics)
- All existing tests pass
- No breaking changes to public API

### Phase 3: NoteTools Refactoring
**Deliverables:**
- Refactored NoteTools class using adapters
- `createNoteTools()` factory function
- Updated note-tools.test.ts using mock adapters
- New tests for uncovered error paths and edge cases

**Success Criteria:**
- NoteTools achieves 100% coverage (all metrics)
- All existing tests pass
- No breaking changes to public API

### Phase 4: Integration & Verification
**Deliverables:**
- Updated ToolRegistry using factory functions
- Updated main.ts using factory functions
- Full test suite passing
- Coverage report showing 100% across all files
- Build succeeding with no errors

**Success Criteria:**
- 100% test coverage: statements, branches, functions, lines
- All 400+ tests passing
- `npm run build` succeeds
- Manual smoke test in Obsidian confirms functionality

## Risk Mitigation

**Risk: Breaking existing functionality**
- Mitigation: Incremental refactoring, existing tests updated alongside code changes
- Factory pattern keeps plugin code nearly unchanged

**Risk: Incomplete interface coverage**
- Mitigation: Start with methods actually used by tools, add to interfaces as needed
- Adapters are simple pass-throughs, easy to extend

**Risk: Complex migration**
- Mitigation: Phased approach allows stopping after any phase
- Git worktree isolates changes from main branch

**Risk: Test maintenance burden**
- Mitigation: Centralized mock factories reduce duplication
- Cleaner mocks are easier to maintain than complex App mocks

## Success Metrics

**Coverage Goals:**
- Statement coverage: 100%
- Branch coverage: 100%
- Function coverage: 100%
- Line coverage: 100%

**Quality Goals:**
- All existing tests pass
- No type errors in build
- Plugin functions correctly in Obsidian
- Test code is cleaner and more maintainable

**Timeline:**
- Phase 1: ~2-3 hours (adapters + mocks)
- Phase 2: ~3-4 hours (VaultTools refactor + tests)
- Phase 3: ~2-3 hours (NoteTools refactor + tests)
- Phase 4: ~1 hour (integration + verification)
- Total: ~8-11 hours of focused work

## Future Benefits

**After this refactoring:**
- Adding new tools is easier (use existing adapters)
- Testing new features is trivial (mock only what you need)
- Obsidian API changes isolated to adapter layer
- Confidence in comprehensive test coverage enables fearless refactoring
- New team members can understand test setup quickly
