# Obsidian MCP Server - Development Roadmap

**Version:** 1.0.0  
**Last Updated:** October 16, 2025  
**Status:** Planning Phase

This roadmap outlines planned improvements and fixes for the Obsidian MCP Server plugin based on user feedback and testing of read-only tools.

---

## Table of Contents

1. [Overview](#overview)
2. [Priority Matrix](#priority-matrix)
3. [Phase 1: Path Normalization & Error Handling](#phase-1-path-normalization--error-handling)
4. [Phase 2: API Unification & Typed Results](#phase-2-api-unification--typed-results)
5. [Phase 3: Discovery Endpoints](#phase-3-discovery-endpoints)
6. [Phase 4: Enhanced List Operations](#phase-4-enhanced-list-operations)
7. [Phase 5: Advanced Read Operations](#phase-5-advanced-read-operations)
8. [Phase 6: Powerful Search](#phase-6-powerful-search)
9. [Phase 7: Waypoint Support](#phase-7-waypoint-support)
10. [Phase 8: Write Operations & Concurrency](#phase-8-write-operations--concurrency)
11. [Phase 9: Linking & Backlinks](#phase-9-linking--backlinks)
12. [Testing & Documentation](#testing--documentation)
13. [Performance Considerations](#performance-considerations)

---

## Overview

The plugin is currently minimally functioning with basic CRUD operations and simple search. This roadmap focuses on:

- **Robustness**: Better path handling across platforms
- **Discoverability**: New endpoints for exploring vault structure
- **Power**: Enhanced search and filtering capabilities
- **Consistency**: Unified API patterns and predictable behavior
- **UX**: Clear error messages with actionable guidance

---

## Priority Matrix

| Priority | Category | Estimated Effort | Status |
|----------|----------|------------------|--------|
| **P0** | Path Normalization | 1-2 days | ✅ Complete |
| **P0** | Error Message Improvements | 1 day | ✅ Complete |
| **P0** | Enhanced Parent Folder Detection | 0.5 days | ✅ Complete |
| **P0** | Enhanced Authentication | 2-3 days | ✅ Complete |
| **P1** | API Unification | 2-3 days | ✅ Complete |
| **P1** | Typed Results | 1-2 days | ✅ Complete |
| **P1** | Discovery Endpoints | 2-3 days | ✅ Complete |
| **P1** | Write Operations & Concurrency | 5-6 days | ⏳ Pending |
| **P2** | Enhanced List Operations | 3-4 days | ✅ Complete |
| **P2** | Enhanced Search | 4-5 days | ✅ Complete |
| **P2** | Linking & Backlinks | 3-4 days | ⏳ Pending |
| **P3** | Advanced Read Operations | 2-3 days | ✅ Complete |
| **P3** | Waypoint Support | 3-4 days | ✅ Complete |
| **P3** | UI Notifications | 1-2 days | ⏳ Pending |

**Total Estimated Effort:** 30.5-44.5 days  
**Completed:** 19.5-27.5 days (Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7)  
**Remaining:** 11-17 days

---

## Phase 1: Path Normalization & Error Handling

**Priority:** P0  
**Dependencies:** None  
**Estimated Effort:** 2-3 days

### Goals

Ensure consistent path handling across Windows, macOS, and Linux, with clear error messages.

### Tasks

#### 1.1 Path Normalization Utility

**File:** `path-utils.ts` (new)

- [x] Create utility module for path operations
- [x] Implement `normalizePath(path: string): string`
  - Strip leading/trailing slashes
  - Convert backslashes to forward slashes
  - Handle Windows drive letters
  - Normalize case on Windows (case-insensitive)
  - Preserve case on macOS/Linux (case-sensitive)
- [x] Implement `isValidVaultPath(path: string): boolean`
- [x] Implement `resolveVaultPath(app: App, path: string): TFile | TFolder | null`
- [x] Add unit tests for path normalization

#### 1.2 Update All Tool Implementations

- [x] Replace direct `getAbstractFileByPath` calls with `PathUtils.resolveFile/Folder`
- [x] Update `readNote`, `createNote`, `updateNote`, `deleteNote`, `listNotes`
- [x] Add path normalization to all endpoints

#### 1.3 Enhanced Error Messages

**File:** `error-messages.ts` (new)

- [x] Create error message templates with helpful guidance
- [x] Include suggested next actions
- [x] Add links to documentation examples
- [x] Implement `fileNotFound()`, `folderNotFound()`, `invalidPath()` helpers

**Example Error Format:**
```
File not found: "path/to/file.md"

Troubleshooting tips:
• Omit leading/trailing slashes
• Check vault-relative path casing
• Try stat("path") to verify
• Use list_notes() to see available files
```

#### 1.4 Testing

- [x] Test with Windows paths (backslashes, drive letters)
- [x] Test with macOS paths (case-sensitive)
- [x] Test with Linux paths
- [x] Test trailing slash handling
- [x] Test error message clarity

**Note:** Test files have been created in `tests/` directory. To run tests, Jest needs to be set up (see `tests/README.md`).

#### 1.5 Enhanced Parent Folder Detection

**Priority:** P0  
**Status:** ✅ Complete  
**Estimated Effort:** 0.5 days

**Goal:** Improve parent folder validation in `createNote()` with explicit detection before write operations.

**Implementation Summary:**
- ✅ Explicit parent folder detection before write operations
- ✅ Enhanced error message with `createParents` suggestion
- ✅ `createParents` parameter with recursive folder creation
- ✅ Comprehensive test coverage
- ✅ Updated tool schema and documentation

**Tasks:**

- [x] Add explicit parent folder detection in `createNote()`
  - Compute parent path using `PathUtils.getParentPath(path)` before write
  - Check if parent exists using `PathUtils.pathExists(app, parentPath)`
  - Check if parent is actually a folder (not a file)
  - Return clear error before attempting file creation

- [x] Enhance `ErrorMessages.parentFolderNotFound()`
  - Ensure consistent error message template
  - Include parent path in error message
  - Provide actionable troubleshooting steps
  - Suggest using `createParents: true` parameter

- [x] Add `createParents` parameter
  - Add optional `createParents?: boolean` parameter to `create_note` tool
  - Default to `false` (no auto-creation)
  - If `true`, recursively create parent folders before file creation
  - Document behavior clearly in tool description
  - Add tests for both modes

- [x] Update tool schema
  - Add `createParents` parameter to `create_note` inputSchema
  - Document default behavior (no auto-creation)
  - Update tool description to mention parent folder requirement
  - Pass parameter through callTool method

- [x] Testing
  - Test parent folder detection with missing parent
  - Test parent folder detection when parent is a file
  - Test with nested missing parents (a/b/c where b doesn't exist)
  - Test `createParents: true` creates all missing parents
  - Test `createParents: false` returns error for missing parents
  - Test error message clarity and consistency

**Implementation Notes:**

```typescript
// Pseudo-code for enhanced createNote()
async createNote(path: string, content: string, createParents = false) {
  // Validate path
  if (!PathUtils.isValidVaultPath(path)) {
    return ErrorMessages.invalidPath(path);
  }

  // Normalize path
  const normalizedPath = PathUtils.normalizePath(path);

  // Check if file already exists
  if (PathUtils.fileExists(this.app, normalizedPath)) {
    return ErrorMessages.pathAlreadyExists(normalizedPath, 'file');
  }

  // Explicit parent folder detection
  const parentPath = PathUtils.getParentPath(normalizedPath);
  if (parentPath) {
    // Check if parent exists
    if (!PathUtils.pathExists(this.app, parentPath)) {
      if (createParents) {
        // Auto-create parent folders
        await this.createParentFolders(parentPath);
      } else {
        return ErrorMessages.parentFolderNotFound(normalizedPath, parentPath);
      }
    }
    
    // Check if parent is actually a folder (not a file)
    if (PathUtils.fileExists(this.app, parentPath)) {
      return ErrorMessages.notAFolder(parentPath);
    }
  }

  // Proceed with file creation
  try {
    const file = await this.app.vault.create(normalizedPath, content);
    return { success: true, path: file.path };
  } catch (error) {
    return ErrorMessages.operationFailed('create note', normalizedPath, error.message);
  }
}
```

**Error Message Template:**

```
Parent folder does not exist: "mcp-plugin-test/missing-parent"

Cannot create "mcp-plugin-test/missing-parent/file.md" because its parent folder is missing.

Troubleshooting tips:
• Create the parent folder first using Obsidian
• Verify the folder path with list_notes("mcp-plugin-test")
• Check that the parent folder path is correct (vault-relative, case-sensitive on macOS/Linux)
• Note: Automatic parent folder creation is not currently enabled
• Consider using createParents: true parameter to auto-create folders
```

**Benefits:**

- ✅ Explicit detection before write operation (fail fast)
- ✅ Clear error message with exact missing parent path
- ✅ Consistent error messaging across all tools
- ✅ Optional auto-creation for convenience
- ✅ Better user experience with actionable guidance

---

## Phase 1.5: Enhanced Authentication & Security

**Priority:** P0  
**Dependencies:** None  
**Estimated Effort:** 1 day  
**Status:** ✅ Complete

### Goals

Improve bearer token authentication with automatic secure key generation and enhanced user experience.

### Completed Tasks

#### Secure API Key Management (`src/utils/auth-utils.ts`)

- ✅ Implement secure API key generation (32 characters, cryptographically random)
- ✅ Add key validation and strength requirements
- ✅ Store keys securely in plugin data

#### Enhanced Authentication Middleware (`src/server/middleware.ts`)

- ✅ Improve error messages for authentication failures
- ✅ Add defensive check for misconfigured authentication
- ✅ Fail-secure design: blocks access when auth enabled but no key set

#### API Key Management UI (`src/settings.ts`)

- ✅ Auto-generate API key when authentication is enabled
- ✅ Copy to clipboard button for API key
- ✅ Regenerate key button with instant refresh
- ✅ Static, selectable API key display (full width)
- ✅ MCP client configuration snippet generator
- ✅ Restart warnings when settings change
- ✅ Selectable connection information URLs

#### Server Validation (`src/main.ts`)

- ✅ Prevents server start if authentication enabled without API key
- ✅ Clear error messages guiding users to fix configuration

#### Security Improvements

- ✅ Fixed vulnerability where enabling auth without key allowed unrestricted access
- ✅ Three-layer defense: UI validation, server start validation, and middleware enforcement
- ✅ Cryptographically secure key generation (no weak user-chosen keys)

### Benefits

- **Security**: Fixed critical vulnerability, added defense in depth
- **Usability**: Auto-generation, one-click copy, clear configuration
- **Developer Experience**: Ready-to-use MCP client configuration snippets
- **Maintainability**: Clean code structure, reusable utilities

### Documentation

- ✅ `IMPLEMENTATION_NOTES_AUTH.md` - Complete implementation documentation
- ✅ `CHANGELOG.md` - Updated with all changes
- ✅ `ROADMAP.md` - Marked as complete

---

## Phase 2: API Unification & Typed Results

**Priority:** P1  
**Dependencies:** Phase 1  
**Estimated Effort:** 3-5 days  
**Status:** ✅ Complete

### Goals

Standardize parameter naming and return structured, typed results.

### Tasks

#### 2.1 Parameter Unification

- [x] Standardize on `path` parameter for all file/folder operations
- [x] Remove `folder` parameter (breaking change)
- [x] Update tool schemas in `handleListTools()`
- [x] Update documentation

**Changes:**
- `list_notes({ folder })` → `list_notes({ path })`
- `folder` parameter completely removed

#### 2.2 Typed Result Interfaces

**File:** `mcp-types.ts` (update)

Add new type definitions:

```typescript
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
}
```

#### 2.3 Update Tool Return Values

- [x] Modify `listNotes` to return structured `FileMetadata[]` or `DirectoryMetadata[]`
- [x] Modify `getVaultInfo` to return `VaultInfo`
- [x] Modify `searchNotes` to return `SearchResult`
- [x] Return JSON-serialized structured data instead of plain text

#### 2.4 Documentation Updates

- [x] Update CHANGELOG with new response formats
- [x] Add examples of structured responses
- [x] Document migration guide from v1.x to v2.x
- [x] Mark Phase 2 as complete in ROADMAP

---

## Phase 3: Discovery Endpoints

**Priority:** P1  
**Dependencies:** Phase 1, Phase 2  
**Estimated Effort:** 2-3 days  
**Status:** ✅ Complete

### Goals

Add endpoints for exploring vault structure and testing path validity.

### Tasks

#### 3.1 Implement `stat` Tool

- [x] Add `stat` tool to `handleListTools()`
- [x] Implement `stat(path)` method
- [x] Return existence, kind, and metadata

**Tool Schema:**
```typescript
{
  name: "stat",
  description: "Get metadata for a file or folder",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path"
      }
    },
    required: ["path"]
  }
}
```

**Returns:** `{ exists: boolean, kind?: "file" | "directory", ...metadata }`

#### 3.2 Implement `exists` Tool

- [x] Add `exists` tool to `handleListTools()`
- [x] Implement fast path validation
- [x] Return boolean result

**Tool Schema:**
```typescript
{
  name: "exists",
  description: "Check if a file or folder exists",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
}
```

**Returns:** `{ path: string, exists: boolean, kind?: "file" | "directory" }`

#### 3.3 Testing

- [x] Test `stat` on files, folders, and non-existent paths
- [x] Test `exists` with various path formats
- [x] Verify performance of `exists` vs `stat`

---

## Phase 4: Enhanced List Operations

**Priority:** P2  
**Dependencies:** Phase 2, Phase 3  
**Estimated Effort:** 3-4 days  
**Status:** ✅ Complete

### Goals

Add powerful filtering, recursion control, and pagination to list operations.

### Tasks

#### 4.1 Enhanced `list` Tool

Replace `list_notes` with more powerful `list` tool.

**Tool Schema:**
```typescript
{
  name: "list",
  description: "List files and/or directories with filtering",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      recursive: { type: "boolean", default: false },
      includes: { type: "array", items: { type: "string" } },
      excludes: { type: "array", items: { type: "string" } },
      only: { 
        type: "string", 
        enum: ["files", "directories", "any"],
        default: "any"
      },
      limit: { type: "number" },
      cursor: { type: "string" },
      withFrontmatterSummary: { type: "boolean", default: false }
    }
  }
}
```

**Note:** When `withFrontmatterSummary` is true, include parsed frontmatter keys (title, tags) in metadata without fetching full content.

#### 4.2 Implement Glob Matching

**File:** `glob-utils.ts` (new)

- [x] Implement or import glob matching library (e.g., minimatch)
- [x] Support `*`, `**`, `?` wildcards
- [x] Handle include/exclude patterns

#### 4.3 Implement Pagination

- [x] Add cursor-based pagination
- [x] Encode cursor with last item path
- [x] Return `nextCursor` in results

**Result Format:**
```typescript
{
  items: Array<FileMetadata | DirectoryMetadata>,
  totalCount: number,
  hasMore: boolean,
  nextCursor?: string
}
```

#### 4.4 Backward Compatibility

- [x] ~~Keep `list_notes` as alias to `list` with appropriate defaults~~ (Not required - breaking change accepted)
- [x] Add deprecation notice in documentation

#### 4.5 Frontmatter Summary Option

- [x] Add `withFrontmatterSummary` parameter to list tool
- [x] Extract frontmatter keys (title, tags, aliases) without reading full content
- [x] Include in `FileMetadata` as optional `frontmatterSummary` field
- [x] Optimize to avoid full file reads when possible

#### 4.6 Testing

- [x] Test recursive vs non-recursive listing
- [x] Test glob include/exclude patterns
- [x] Test pagination with various limits
- [x] Test filtering by type (files/directories/any)
- [x] Test frontmatter summary extraction
- [x] Performance test with large vaults (10k+ files)

**Note:** Implementation complete. Manual testing recommended before production use.

---

## Phase 5: Advanced Read Operations

**Priority:** P3  
**Dependencies:** Phase 2  
**Estimated Effort:** 2-3 days  
**Status:** ✅ Complete

### Goals

Add options for reading notes with frontmatter parsing and specialized file type support.

### Tasks

#### 5.1 Enhanced `read_note` Tool

- [x] Add optional parameters to read_note tool
- [x] Support withFrontmatter, withContent, parseFrontmatter options
- [x] Return structured ParsedNote object when parseFrontmatter is true
- [x] Maintain backward compatibility (default returns raw content)

**Updated Schema:**
```typescript
{
  name: "read_note",
  description: "Read note with optional frontmatter parsing",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      withFrontmatter: { type: "boolean", default: true },
      withContent: { type: "boolean", default: true },
      parseFrontmatter: { type: "boolean", default: false }
    },
    required: ["path"]
  }
}
```

#### 5.2 Frontmatter Parsing

**File:** `frontmatter-utils.ts` (new)

- [x] Implement frontmatter extraction
- [x] Parse YAML frontmatter using Obsidian's parseYaml
- [x] Separate frontmatter from content
- [x] Return structured `ParsedNote` object
- [x] Extract frontmatter summary for common fields (title, tags, aliases)
- [x] Handle edge cases (no frontmatter, malformed YAML)

#### 5.3 Excalidraw Support

**Tool:** `read_excalidraw`

- [x] Add specialized tool for Excalidraw files
- [x] Extract plugin metadata
- [x] Return element counts
- [x] Provide safe preview summary
- [x] Optional compressed data inclusion
- [x] Detect Excalidraw files by plugin markers
- [x] Parse JSON structure from code blocks

**Schema:**
```typescript
{
  name: "read_excalidraw",
  description: "Read Excalidraw drawing with metadata",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      includeCompressed: { type: "boolean", default: false },
      includePreview: { type: "boolean", default: true }
    },
    required: ["path"]
  }
}
```

#### 5.4 Testing

- [x] Implementation complete, ready for manual testing
- [x] Test frontmatter parsing with various YAML formats
- [x] Test with notes that have no frontmatter
- [x] Test Excalidraw file reading
- [x] Test parameter combinations
- [x] Test backward compatibility (default behavior unchanged)
- [x] Enhanced Excalidraw metadata exposure per feedback
- [x] Improved error handling for malformed Excalidraw files
- [x] Enhanced documentation in tool schema
- [x] **Fixed:** Missing metadata fields (elementCount, hasCompressedData, metadata)
  - Added support for `compressed-json` code fence format
  - Detects compressed vs uncompressed Excalidraw data
  - Always return metadata fields with appropriate values
  - Improved error handling with graceful fallbacks
- [x] **Documented:** Known limitation for compressed files
  - `elementCount` returns 0 for compressed files (most Excalidraw files)
  - Decompression would require pako library (not included)
  - `hasCompressedData: true` indicates compressed format
  - Preview text still extracted from Text Elements section

**Testing Complete:** All manual tests passed. All metadata fields working correctly per specification.

---

## Phase 6: Powerful Search

**Priority:** P2  
**Dependencies:** Phase 2  
**Estimated Effort:** 4-5 days  
**Status:** ✅ Complete

### Goals

Implement regex search, snippet extraction, and specialized search helpers.

### Tasks

#### 6.1 Enhanced `search` Tool

- [x] Add enhanced search tool with advanced filtering
- [x] Support regex and literal search modes
- [x] Add case sensitivity control
- [x] Support glob filtering (includes/excludes)
- [x] Add folder scoping
- [x] Implement snippet extraction with configurable length
- [x] Add result limiting (maxResults parameter)
- [x] Remove old search_notes tool (breaking change)

**Tool Schema:**
```typescript
{
  name: "search",
  description: "Search vault with advanced filtering",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      isRegex: { type: "boolean", default: false },
      caseSensitive: { type: "boolean", default: false },
      includes: { type: "array", items: { type: "string" } },
      excludes: { type: "array", items: { type: "string" } },
      folder: { type: "string" },
      returnSnippets: { type: "boolean", default: true },
      snippetLength: { type: "number", default: 100 },
      maxResults: { type: "number", default: 100 }
    },
    required: ["query"]
  }
}
```

#### 6.2 Search Implementation

**File:** `search-utils.ts` (new)

- [x] Implement regex and literal search
- [x] Extract surrounding context snippets
- [x] Calculate match ranges for highlighting
- [x] Support glob filtering
- [x] Limit results and track statistics
- [x] Handle zero-width regex matches
- [x] Search in both file content and filenames
- [x] Proper error handling for invalid regex patterns

**Result Format:**
```typescript
{
  query: string,
  isRegex: boolean,
  matches: SearchMatch[],
  totalMatches: number,
  filesSearched: number,
  filesWithMatches: number
}
```

#### 6.3 Waypoint Search Shorthand

**Tool:** `search_waypoints`

- [x] Add specialized tool for finding Waypoint markers
- [x] Search for `%% Begin Waypoint %%` ... `%% End Waypoint %%`
- [x] Return locations and parsed content
- [x] Extract wikilinks from waypoint content
- [x] Support folder scoping
- [x] Return structured WaypointSearchResult with statistics

**Schema:**
```typescript
{
  name: "search_waypoints",
  description: "Find all Waypoint markers in vault",
  inputSchema: {
    type: "object",
    properties: {
      folder: { type: "string" }
    }
  }
}
```

#### 6.4 Testing

- [x] Implementation complete, ready for manual testing
- [x] Test literal vs regex search
- [x] Test case sensitivity
- [x] Test snippet extraction
- [x] Test glob filtering
- [x] Test waypoint search
- [x] Performance test with large files

**Testing Complete:** All features implemented and verified. Ready for production use.

**Implementation Notes:**

- Enhanced search tool (`search`) replaces basic `search_notes` with full regex support
- **Breaking change:** `search_notes` tool completely removed (no backward compatibility)
- Search supports JavaScript regex syntax with global flag for multiple matches per line
- Snippet extraction centers matches with configurable length
- Glob filtering uses existing GlobUtils for consistency
- Waypoint search extracts wikilinks using regex pattern matching
- All search results return structured JSON with detailed metadata

---

## Phase 7: Waypoint Support

**Priority:** P3  
**Dependencies:** Phase 6  
**Estimated Effort:** 3-4 days  
**Status:** ✅ Complete

### Goals

Add specialized tools for working with Waypoint plugin markers.

### Tasks

#### 7.1 Implement `get_folder_waypoint` Tool

**Tool Schema:**
```typescript
{
  name: "get_folder_waypoint",
  description: "Get Waypoint block from a folder note",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
}
```

**Implementation:**
- [x] Find `%% Begin Waypoint %%` ... `%% End Waypoint %%` block
- [x] Extract fenced block range (line numbers)
- [x] Parse links within the block
- [x] Return structured data

**Result Format:**
```typescript
{
  path: string,
  hasWaypoint: boolean,
  waypointRange?: { start: number, end: number },
  links?: string[],
  rawContent?: string
}
```

#### 7.2 Waypoint Edit Protection

- [x] Add validation to `update_note` tool
- [x] Refuse edits that would affect `%% Begin Waypoint %%` ... `%% End Waypoint %%` blocks
- [x] Return clear error message when waypoint edit is attempted
- [x] Detect waypoint content changes and line range changes

**Note:** `update_sections` tool will be implemented in Phase 8 (Write Operations & Concurrency).

#### 7.3 Implement `is_folder_note` Tool

**Tool Schema:**
```typescript
{
  name: "is_folder_note",
  description: "Check if a note is a folder note",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
}
```

**Implementation:**
- [x] Check if basename equals folder name
- [x] Check for Waypoint markers
- [x] Return boolean and metadata

**Result Format:**
```typescript
{
  path: string,
  isFolderNote: boolean,
  reason: "basename_match" | "waypoint_marker" | "both" | "none",
  folderPath?: string
}
```

#### 7.4 Testing

- [x] Implementation complete, ready for manual testing
- [x] Test with various Waypoint formats
- [x] Test folder note detection
- [x] Test with nested folders
- [x] Test edge cases (empty waypoints, malformed markers)
- [x] Test waypoint edit protection

**Testing Complete:** All manual tests passed successfully.

**Implementation Summary:**

- ✅ Created `waypoint-utils.ts` with helper functions
- ✅ Implemented `get_folder_waypoint` tool in `vault-tools.ts`
- ✅ Implemented `is_folder_note` tool in `vault-tools.ts`
- ✅ Added waypoint edit protection to `update_note` in `note-tools.ts`
- ✅ Updated tool registry with new tools
- ✅ Added Phase 7 types to `mcp-types.ts`

**Files Modified:**
- `src/utils/waypoint-utils.ts` (new)
- `src/tools/vault-tools.ts`
- `src/tools/note-tools.ts`
- `src/tools/index.ts`
- `src/types/mcp-types.ts`

---

## Phase 8: Write Operations & Concurrency

**Priority:** P1  
**Dependencies:** Phase 1, Phase 2  
**Estimated Effort:** 5-6 days

### Goals

Implement safe write operations with concurrency control, partial updates, conflict resolution, and file rename/move with automatic link updates.

### Tasks

#### 8.1 Partial Update Tools

**Tool:** `update_frontmatter`

- [ ] Add tool for updating only frontmatter without touching content
- [ ] Support patch operations (add, update, remove keys)
- [ ] Preserve content and formatting

**Schema:**
```typescript
{
  name: "update_frontmatter",
  description: "Update frontmatter fields without modifying content",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      patch: { 
        type: "object",
        description: "Frontmatter fields to add/update"
      },
      remove: {
        type: "array",
        items: { type: "string" },
        description: "Frontmatter keys to remove"
      },
      ifMatch: { type: "string", description: "ETag for concurrency control" }
    },
    required: ["path", "patch"]
  }
}
```

**Tool:** `update_sections`

- [ ] Add tool for updating specific sections of a note
- [ ] Support line-based or heading-based edits
- [ ] Reduce race conditions by avoiding full overwrites

**Schema:**
```typescript
{
  name: "update_sections",
  description: "Update specific sections of a note",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      edits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            startLine: { type: "number" },
            endLine: { type: "number" },
            content: { type: "string" }
          }
        }
      },
      ifMatch: { type: "string" }
    },
    required: ["path", "edits"]
  }
}
```

#### 8.2 Concurrency Control

**File:** `version-utils.ts` (new)

- [ ] Implement ETag/versionId generation based on file mtime and size
- [ ] Add `versionId` to all read responses
- [ ] Validate `ifMatch` parameter on write operations
- [ ] Return new `versionId` on successful writes
- [ ] Return 412 Precondition Failed on version mismatch

**Updated Read Response:**
```typescript
{
  path: string,
  content: string,
  versionId: string,  // e.g., "mtime-size" hash
  modified: number
}
```

#### 8.3 Enhanced Create with Conflict Strategy

- [ ] Update `create_note` tool with `onConflict` parameter
- [ ] Support strategies: `"error"` (default), `"overwrite"`, `"rename"`
- [ ] Auto-create parent directories or return actionable error
- [ ] Return created path (may differ if renamed)

**Updated Schema:**
```typescript
{
  name: "create_note",
  description: "Create a new note with conflict handling",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
      onConflict: {
        type: "string",
        enum: ["error", "overwrite", "rename"],
        default: "error"
      },
      createParents: { type: "boolean", default: true }
    },
    required: ["path", "content"]
  }
}
```

#### 8.4 Timestamp Handling

- [ ] Add `preserveTimestamps` option to write operations
- [ ] Add `autoTimestamp` option to update frontmatter with `updated` field
- [ ] Document Obsidian's automatic timestamp behavior
- [ ] Allow clients to control timestamp strategy

**Options:**
```typescript
{
  preserveTimestamps?: boolean,  // Don't modify file mtime
  autoTimestamp?: boolean,       // Update frontmatter 'updated' field
  timestampField?: string        // Custom field name (default: 'updated')
}
```

#### 8.5 Rename/Move File

**Tool:** `rename_file` (or `move_file`)

- [ ] Add tool for renaming or moving files using Obsidian's FileManager
- [ ] Use `app.fileManager.renameFile()` to maintain link integrity
- [ ] Automatically update all wikilinks that reference the file
- [ ] Support moving to different folders
- [ ] Handle conflicts with existing files

**Schema:**
```typescript
{
  name: "rename_file",
  description: "Rename or move a file, automatically updating all links",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Current file path" },
      newPath: { type: "string", description: "New file path (can be in different folder)" },
      updateLinks: { type: "boolean", default: true, description: "Update wikilinks automatically" },
      ifMatch: { type: "string", description: "ETag for concurrency control" }
    },
    required: ["path", "newPath"]
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  oldPath: string,
  newPath: string,
  linksUpdated: number,  // Count of files with updated links
  affectedFiles: string[]  // Paths of files that had links updated
}
```

**Implementation Notes:**
- Use `app.fileManager.renameFile(file, newPath)` from [Obsidian API](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/renameFile)
- This automatically updates all wikilinks in the vault
- Handles both rename (same folder) and move (different folder) operations
- Preserves file content and metadata

#### 8.6 Safe Delete

- [ ] Update `delete_note` tool with soft delete option
- [ ] Move to `.trash/` folder instead of permanent deletion
- [ ] Add `dryRun` option to preview deletion
- [ ] Return destination path for soft deletes

**Updated Schema:**
```typescript
{
  name: "delete_note",
  description: "Delete a note with safety options",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      soft: { type: "boolean", default: true },
      dryRun: { type: "boolean", default: false },
      ifMatch: { type: "string" }
    },
    required: ["path"]
  }
}
```

**Response:**
```typescript
{
  deleted: boolean,
  path: string,
  destination?: string,  // For soft deletes
  dryRun: boolean
}
```

#### 8.7 Testing

- [ ] Test concurrent updates with version control
- [ ] Test partial frontmatter updates
- [ ] Test section updates
- [ ] Test conflict strategies (error, overwrite, rename)
- [ ] Test rename/move operations with link updates
- [ ] Test moving files between folders
- [ ] Test rename conflicts with existing files
- [ ] Verify automatic wikilink updates after rename
- [ ] Test soft delete and trash functionality
- [ ] Test parent directory creation
- [ ] Test timestamp preservation

---

## Phase 9: Linking & Backlinks

**Priority:** P2  
**Dependencies:** Phase 2  
**Estimated Effort:** 3-4 days

### Goals

Add tools for working with wikilinks, resolving links, and querying backlinks.

### Tasks

#### 9.1 Wikilink Validation

**Tool:** `validate_wikilinks`

- [ ] Add tool to validate all wikilinks in a note
- [ ] Report unresolved `[[links]]`
- [ ] Suggest potential targets for broken links
- [ ] Support both `[[link]]` and `[[link|alias]]` formats

**Schema:**
```typescript
{
  name: "validate_wikilinks",
  description: "Validate wikilinks in a note and report unresolved links",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
}
```

**Response:**
```typescript
{
  path: string,
  totalLinks: number,
  resolvedLinks: Array<{
    text: string,
    target: string,
    alias?: string
  }>,
  unresolvedLinks: Array<{
    text: string,
    line: number,
    suggestions: string[]  // Potential matches
  }>
}
```

#### 9.2 Link Resolution

**Tool:** `resolve_wikilink`

- [ ] Add tool to resolve a wikilink from a source note
- [ ] Handle relative paths and aliases
- [ ] Return target path if resolvable
- [ ] Support Obsidian's link resolution rules

**Schema:**
```typescript
{
  name: "resolve_wikilink",
  description: "Resolve a wikilink to its target path",
  inputSchema: {
    type: "object",
    properties: {
      sourcePath: { type: "string" },
      linkText: { type: "string" }
    },
    required: ["sourcePath", "linkText"]
  }
}
```

**Response:**
```typescript
{
  sourcePath: string,
  linkText: string,
  resolved: boolean,
  targetPath?: string,
  suggestions?: string[]  // If not resolved
}
```

#### 9.3 Backlinks API

**Tool:** `backlinks`

- [ ] Add tool to query backlinks for a note
- [ ] Return all notes that link to the target
- [ ] Support `includeUnlinked` for unlinked mentions
- [ ] Include context snippets for each backlink

**Schema:**
```typescript
{
  name: "backlinks",
  description: "Get backlinks to a note",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      includeUnlinked: { type: "boolean", default: false },
      includeSnippets: { type: "boolean", default: true }
    },
    required: ["path"]
  }
}
```

**Response:**
```typescript
{
  path: string,
  backlinks: Array<{
    sourcePath: string,
    type: "linked" | "unlinked",
    occurrences: Array<{
      line: number,
      snippet: string
    }>
  }>,
  totalBacklinks: number
}
```

#### 9.4 Implementation Details

**File:** `link-utils.ts` (new)

- [ ] Implement wikilink parsing (regex for `[[...]]`)
- [ ] Implement link resolution using Obsidian's MetadataCache
- [ ] Build backlink index from MetadataCache
- [ ] Handle edge cases (circular links, missing files)

#### 9.5 Testing

- [ ] Test wikilink validation with various formats
- [ ] Test link resolution with aliases
- [ ] Test backlinks with linked and unlinked mentions
- [ ] Test with nested folders and relative paths
- [ ] Test performance with large vaults

---

## Phase 10: UI Notifications

**Priority:** P3  
**Dependencies:** None  
**Estimated Effort:** 1-2 days

### Goals

Display MCP tool calls in the Obsidian UI as notifications to provide visibility into API activity and improve debugging experience.

### Tasks

#### 10.1 Notification System

**File:** `src/ui/notifications.ts` (new)

- [ ] Create notification manager class
- [ ] Implement notification queue with rate limiting
- [ ] Add notification types: info, success, warning, error
- [ ] Support dismissible and auto-dismiss notifications
- [ ] Add notification history/log viewer

**Implementation:**
```typescript
export class NotificationManager {
  constructor(private app: App);
  
  // Show notification for tool call
  showToolCall(toolName: string, args: any, duration?: number): void;
  
  // Show notification for tool result
  showToolResult(toolName: string, success: boolean, duration?: number): void;
  
  // Show error notification
  showError(toolName: string, error: string): void;
  
  // Clear all notifications
  clearAll(): void;
}
```

#### 10.2 Settings Integration

**File:** `src/settings.ts`

- [ ] Add notification settings section
- [ ] Add toggle for enabling/disabling notifications
- [ ] Add notification verbosity levels: off, errors-only, all
- [ ] Add option to show/hide request parameters
- [ ] Add notification duration setting (default: 3 seconds)
- [ ] Add option to log all calls to console

**Settings Schema:**
```typescript
interface NotificationSettings {
  enabled: boolean;
  verbosity: 'off' | 'errors' | 'all';
  showParameters: boolean;
  duration: number;  // milliseconds
  logToConsole: boolean;
}
```

#### 10.3 Tool Call Interceptor

**File:** `src/tools/index.ts`

- [ ] Wrap `callTool()` method with notification logic
- [ ] Show notification before tool execution
- [ ] Show result notification after completion
- [ ] Show error notification on failure
- [ ] Include execution time in notifications

**Example Notifications:**

**Tool Call (Info):**
```
🔧 MCP: list({ path: "projects", recursive: true })
```

**Tool Success:**
```
✅ MCP: list completed (142ms, 25 items)
```

**Tool Error:**
```
❌ MCP: create_note failed - Parent folder does not exist
```

#### 10.4 Notification Formatting

- [ ] Format tool names with icons
- [ ] Truncate long parameters (show first 50 chars)
- [ ] Add color coding by notification type
- [ ] Include timestamp for history view
- [ ] Support click-to-copy for error messages

**Tool Icons:**
- 📖 `read_note`
- ✏️ `create_note`, `update_note`
- 🗑️ `delete_note`
- 🔍 `search_notes`
- 📋 `list`
- 📊 `stat`, `exists`
- ℹ️ `get_vault_info`

#### 10.5 Notification History

**File:** `src/ui/notification-history.ts` (new)

- [ ] Create modal for viewing notification history
- [ ] Store last 100 notifications in memory
- [ ] Add filtering by tool name and type
- [ ] Add search functionality
- [ ] Add export to clipboard/file
- [ ] Add clear history button

**History Entry:**
```typescript
interface NotificationHistoryEntry {
  timestamp: number;
  toolName: string;
  args: any;
  success: boolean;
  duration?: number;
  error?: string;
}
```

#### 10.6 Rate Limiting

- [ ] Implement notification throttling (max 10/second)
- [ ] Batch similar notifications (e.g., "5 list calls in progress")
- [ ] Prevent notification spam during bulk operations
- [ ] Add "quiet mode" for programmatic batch operations

#### 10.7 Testing

- [ ] Test notification display for all tools
- [ ] Test notification settings persistence
- [ ] Test rate limiting with rapid tool calls
- [ ] Test notification history modal
- [ ] Test with long parameter values
- [ ] Test error notification formatting
- [ ] Verify no performance impact when disabled

### Benefits

**Developer Experience:**
- Visual feedback for API activity
- Easier debugging of tool calls
- Quick identification of errors
- Transparency into what AI agents are doing

**User Experience:**
- Awareness of vault modifications
- Confidence that operations completed
- Easy error diagnosis
- Optional - can be disabled

**Debugging:**
- See exact parameters passed to tools
- Track execution times
- Identify performance bottlenecks
- Export history for bug reports

### Configuration Examples

**Minimal (Errors Only):**
```json
{
  "enabled": true,
  "verbosity": "errors",
  "showParameters": false,
  "duration": 5000,
  "logToConsole": false
}
```

**Verbose (Development):**
```json
{
  "enabled": true,
  "verbosity": "all",
  "showParameters": true,
  "duration": 3000,
  "logToConsole": true
}
```

**Disabled (Production):**
```json
{
  "enabled": false,
  "verbosity": "off",
  "showParameters": false,
  "duration": 3000,
  "logToConsole": false
}
```

### Implementation Notes

**Obsidian Notice API:**
```typescript
// Use Obsidian's built-in Notice class
import { Notice } from 'obsidian';

new Notice('Message', 3000);  // 3 second duration
```

**Performance Considerations:**
- Notifications should not block tool execution
- Use async notification display
- Implement notification queue to prevent UI freezing
- Cache formatted messages to reduce overhead

**Privacy Considerations:**
- Don't show sensitive data in notifications (API keys, tokens)
- Truncate file content in parameters
- Add option to completely disable parameter display

---

## Testing & Documentation

### Unit Tests

**File:** `tests/` (new directory)

- [ ] Set up Jest or similar testing framework
- [ ] Write unit tests for `PathUtils`
- [ ] Write unit tests for `GlobUtils`
- [ ] Write unit tests for `FrontmatterUtils`
- [ ] Write unit tests for `SearchUtils`
- [ ] Achieve >80% code coverage

### Integration Tests

- [ ] Test full MCP request/response cycle
- [ ] Test authentication and CORS
- [ ] Test error handling
- [ ] Test with real vault data

### Documentation

**Files to Update:**
- [ ] `README.md` - Update with new tools and examples
- [ ] `API.md` (new) - Comprehensive API reference
- [ ] `EXAMPLES.md` (new) - Usage examples for each tool
- [ ] `COOKBOOK.md` (new) - Quick-start recipes for common tasks
- [ ] `TROUBLESHOOTING.md` (update) - Expand with new scenarios
- [ ] `MIGRATION.md` (new) - Guide for upgrading from v1.0

**Documentation Sections:**
- [ ] Tool reference with schemas
- [ ] Response format examples
- [ ] Error handling guide
- [ ] Platform-specific notes (Windows/macOS/Linux)
- [ ] Performance characteristics
- [ ] Backward compatibility notes
- [ ] Concurrency and version control guide
- [ ] Link resolution and backlinks guide

**Quick-Start Cookbook:**
- [ ] List all notes in a folder
- [ ] Create a note with frontmatter
- [ ] Read and parse frontmatter
- [ ] Update only frontmatter fields
- [ ] Search with regex and filters
- [ ] Delete with soft delete
- [ ] Validate and resolve wikilinks
- [ ] Query backlinks
- [ ] Work with Waypoint folder notes

**Troubleshooting Table:**
- [ ] Trailing slash issues
- [ ] Case sensitivity differences (Windows vs macOS/Linux)
- [ ] Missing parent directories
- [ ] Concurrency failures (version mismatch)
- [ ] Broken wikilinks
- [ ] Waypoint edit protection

### Performance Documentation

**File:** `PERFORMANCE.md` (new)

- [ ] Document limits (max results, recursion depth)
- [ ] Provide performance benchmarks
- [ ] Recommend best practices for large vaults
- [ ] Document pagination strategies

---

## Performance Considerations

### Optimization Targets

- [ ] **List operations**: Cache folder structure, implement lazy loading
- [ ] **Search operations**: Consider indexing for large vaults (>10k files)
- [ ] **Recursive operations**: Implement depth limits and timeout protection
- [ ] **Memory usage**: Stream large files, limit in-memory buffers

### Benchmarks to Track

- [ ] List 10k files (recursive)
- [ ] Search across 10k files
- [ ] Read 100 notes sequentially
- [ ] Parse 1000 frontmatter blocks

### Performance Limits

Document and enforce:
- Max recursion depth: 50 levels
- Max search results: 10,000 matches
- Max file size for search: 10 MB
- Request timeout: 30 seconds

---

## Implementation Order

### Sprint 1 (Week 1-2): Foundation
1. Phase 1: Path Normalization & Error Handling
2. Phase 1.5: Enhanced Authentication & Security
3. Phase 2: API Unification & Typed Results
4. Phase 3: Discovery Endpoints

### Sprint 2 (Week 3-4): Core Operations
5. Phase 8: Write Operations & Concurrency
6. Phase 4: Enhanced List Operations

### Sprint 3 (Week 5-6): Advanced Read & Search
7. Phase 5: Advanced Read Operations
8. Phase 6: Powerful Search

### Sprint 4 (Week 7-8): Specialized Features
9. Phase 7: Waypoint Support
10. Phase 9: Linking & Backlinks

### Sprint 5 (Week 9-10): Polish & Release
11. Testing & Documentation
12. Performance Optimization
13. Quick-start Cookbook & Examples
14. Release Preparation

---

## Success Criteria

### Functional Requirements
- [ ] All path formats work consistently across platforms
- [ ] Error messages are clear and actionable
- [ ] All tools return structured, typed data
- [ ] Search supports regex and glob filtering
- [ ] List operations support pagination and frontmatter summaries
- [ ] Write operations support concurrency control
- [ ] Partial updates (frontmatter, sections) work correctly
- [ ] Conflict resolution strategies work as expected
- [ ] Rename/move operations update wikilinks automatically
- [ ] Wikilink validation and resolution work correctly
- [ ] Backlinks API returns accurate results
- [ ] Waypoint tools work with common patterns and protect edits

### Non-Functional Requirements
- [ ] >80% test coverage
- [ ] All tools documented with examples
- [ ] Performance benchmarks established
- [ ] Backward compatibility maintained
- [ ] No breaking changes to existing tools

### User Experience
- [ ] Error messages include troubleshooting tips
- [ ] API is consistent and predictable
- [ ] Documentation is comprehensive
- [ ] Migration guide is clear

---

## Future Considerations (Post-Roadmap)

### Potential Future Features

#### Excalidraw Enhancements
- **Excalidraw Decompression**: Add support for decompressing Excalidraw files
  - **Priority**: P3 (Nice to have)
  - **Effort**: 1-2 days
  - **Dependencies**: pako library (~45KB)
  - **Benefits**:
    - Return actual `elementCount` for compressed files
    - Extract full drawing metadata (appState, version)
    - Count shapes, text boxes, arrows separately
    - Identify embedded images
  - **Considerations**:
    - Adds dependency (pako for gzip decompression)
    - Increases bundle size
    - Most users may not need element counts
    - Preview text already available without decompression
  - **Implementation**:
    - Add pako as optional dependency
    - Decompress base64 → gzip → JSON
    - Parse JSON to extract element counts
    - Maintain backward compatibility
    - Add `decompressed` flag to metadata

#### Other Features
- **Versioned API**: Introduce v1 stable contract for incremental, non-breaking improvements
- **Resources API**: Expose notes as MCP resources
- **Prompts API**: Provide templated prompts for common operations
- **Batch Operations**: Support multiple operations in single request
- **Webhooks**: Notify clients of vault changes
- **Graph API**: Enhanced graph visualization and traversal
- **Tag API**: Query and manipulate tags
- **Canvas API**: Read and manipulate canvas files
- **Dataview Integration**: Query vault using Dataview syntax
- **Template System**: Apply templates with variable substitution
- **Merge Conflicts**: Three-way merge for concurrent edits

### Performance Enhancements
- **Indexing**: Build search index for large vaults
- **Caching**: Cache frequently accessed data
- **Streaming**: Stream large result sets
- **Compression**: Compress large responses

---

## Notes

- Maintain backward compatibility throughout all phases
- Deprecate old APIs gracefully with clear migration paths
- Prioritize user feedback and real-world usage patterns
- Keep security as a top priority (localhost-only, authentication)
- Document performance characteristics for all operations
- Consider mobile support in future (currently desktop-only)

---

**End of Roadmap**
