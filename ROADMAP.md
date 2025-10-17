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

| Priority | Category | Estimated Effort |
|----------|----------|------------------|
| **P0** | Path Normalization | 1-2 days |
| **P0** | Error Message Improvements | 1 day |
| **P0** | Enhanced Authentication | 2-3 days |
| **P1** | API Unification | 2-3 days |
| **P1** | Typed Results | 1-2 days |
| **P1** | Discovery Endpoints | 2-3 days |
| **P1** | Write Operations & Concurrency | 5-6 days |
| **P2** | List Ergonomics | 3-4 days |
| **P2** | Enhanced Search | 4-5 days |
| **P2** | Linking & Backlinks | 3-4 days |
| **P3** | Advanced Read Operations | 2-3 days |
| **P3** | Waypoint Support | 3-4 days |

**Total Estimated Effort:** 29-42 days

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

- [ ] Create utility module for path operations
- [ ] Implement `normalizePath(path: string): string`
  - Strip leading/trailing slashes
  - Convert backslashes to forward slashes
  - Handle Windows drive letters
  - Normalize case on Windows (case-insensitive)
  - Preserve case on macOS/Linux (case-sensitive)
- [ ] Implement `isValidVaultPath(path: string): boolean`
- [ ] Implement `resolveVaultPath(app: App, path: string): TFile | TFolder | null`
- [ ] Add unit tests for path normalization

#### 1.2 Update All Tool Implementations

- [ ] Replace direct `getAbstractFileByPath` calls with `PathUtils.resolveFile/Folder`
- [ ] Update `readNote`, `createNote`, `updateNote`, `deleteNote`, `listNotes`
- [ ] Add path normalization to all endpoints

#### 1.3 Enhanced Error Messages

**File:** `error-messages.ts` (new)

- [ ] Create error message templates with helpful guidance
- [ ] Include suggested next actions
- [ ] Add links to documentation examples
- [ ] Implement `fileNotFound()`, `folderNotFound()`, `invalidPath()` helpers

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

- [ ] Test with Windows paths (backslashes, drive letters)
- [ ] Test with macOS paths (case-sensitive)
- [ ] Test with Linux paths
- [ ] Test trailing slash handling
- [ ] Test error message clarity

---

## Phase 1.5: Enhanced Authentication & Security

**Priority:** P0  
**Dependencies:** None  
**Estimated Effort:** 2-3 days

### Goals

Improve bearer token authentication with secure key management, token rotation, and multiple authentication methods.

### Tasks

#### 1.5.1 Secure API Key Management

**File:** `auth-utils.ts` (new)

- [ ] Implement secure API key generation
- [ ] Add key validation and strength requirements
- [ ] Support multiple API keys with labels/names
- [ ] Add key expiration and rotation
- [ ] Store keys securely in plugin data

**Key Requirements:**
- Minimum length: 32 characters
- Cryptographically random generation
- Optional expiration dates
- Human-readable labels for identification

#### 1.5.2 Enhanced Authentication Middleware

**File:** `src/server/middleware.ts` (update)

- [ ] Add request rate limiting per API key
- [ ] Implement request logging with authentication context
- [ ] Add support for multiple authentication schemes
- [ ] Improve error messages for authentication failures
- [ ] Add authentication attempt tracking

**Authentication Schemes:**
- Bearer token (existing, enhanced)
- API key in custom header (e.g., `X-API-Key`)
- Query parameter authentication (for testing only)

#### 1.5.3 API Key Management UI

**File:** `src/settings.ts` (update)

- [ ] Add API key generation button with secure random generation
- [ ] Display list of active API keys with labels
- [ ] Add key creation/deletion interface
- [ ] Show key creation date and last used timestamp
- [ ] Add key expiration management
- [ ] Implement key visibility toggle (show/hide)
- [ ] Add "Copy to clipboard" functionality

**UI Improvements:**
```typescript
// Settings panel additions
- "Generate New API Key" button
- Key list with:
  - Label/name
  - Created date
  - Last used timestamp
  - Expiration date (if set)
  - Revoke button
- Key strength indicator
- Security best practices notice
```

#### 1.5.4 Authentication Audit Log

**File:** `auth-log.ts` (new)

- [ ] Log authentication attempts (success/failure)
- [ ] Track API key usage statistics
- [ ] Add configurable log retention
- [ ] Provide audit log export
- [ ] Display recent authentication activity in settings

**Log Format:**
```typescript
{
  timestamp: number,
  keyLabel: string,
  success: boolean,
  ipAddress: string,
  endpoint: string,
  errorReason?: string
}
```

#### 1.5.5 Security Enhancements

- [ ] Add HTTPS requirement option (reject HTTP in production)
- [ ] Implement request signing for additional security
- [ ] Add IP allowlist/blocklist option
- [ ] Support for read-only API keys (restrict to read operations)
- [ ] Add permission scopes per API key

**Permission Scopes:**
- `read` - Read operations only
- `write` - Create, update, delete operations
- `admin` - Server configuration access
- `all` - Full access (default)

#### 1.5.6 Documentation Updates

- [ ] Document API key generation best practices
- [ ] Add authentication examples for different clients
- [ ] Document security considerations
- [ ] Add troubleshooting guide for auth issues
- [ ] Document permission scopes and their usage

#### 1.5.7 Testing

- [ ] Test API key generation and validation
- [ ] Test multiple API keys with different scopes
- [ ] Test key expiration and rotation
- [ ] Test rate limiting per key
- [ ] Test authentication failure scenarios
- [ ] Test audit logging
- [ ] Security audit of authentication implementation

---

## Phase 2: API Unification & Typed Results

**Priority:** P1  
**Dependencies:** Phase 1  
**Estimated Effort:** 3-5 days

### Goals

Standardize parameter naming and return structured, typed results.

### Tasks

#### 2.1 Parameter Unification

- [ ] Standardize on `path` parameter for all file/folder operations
- [ ] Keep `folder` as deprecated alias for backward compatibility
- [ ] Update tool schemas in `handleListTools()`
- [ ] Add deprecation warnings to documentation

**Changes:**
- `list_notes({ folder })` → `list_notes({ path })`
- Document `folder` as deprecated but still functional

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

- [ ] Modify `listNotes` to return structured `FileMetadata[]` or `DirectoryMetadata[]`
- [ ] Modify `getVaultInfo` to return `VaultInfo`
- [ ] Modify `searchNotes` to return `SearchResult`
- [ ] Return JSON-serialized structured data instead of plain text

#### 2.4 Documentation Updates

- [ ] Update README with new response formats
- [ ] Add examples of structured responses
- [ ] Document backward compatibility notes

---

## Phase 3: Discovery Endpoints

**Priority:** P1  
**Dependencies:** Phase 1, Phase 2  
**Estimated Effort:** 2-3 days

### Goals

Add endpoints for exploring vault structure and testing path validity.

### Tasks

#### 3.1 Implement `stat` Tool

- [ ] Add `stat` tool to `handleListTools()`
- [ ] Implement `stat(path)` method
- [ ] Return existence, kind, and metadata

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

- [ ] Add `exists` tool to `handleListTools()`
- [ ] Implement fast path validation
- [ ] Return boolean result

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

- [ ] Test `stat` on files, folders, and non-existent paths
- [ ] Test `exists` with various path formats
- [ ] Verify performance of `exists` vs `stat`

---

## Phase 4: Enhanced List Operations

**Priority:** P2  
**Dependencies:** Phase 2, Phase 3  
**Estimated Effort:** 3-4 days

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

- [ ] Implement or import glob matching library (e.g., minimatch)
- [ ] Support `*`, `**`, `?` wildcards
- [ ] Handle include/exclude patterns

#### 4.3 Implement Pagination

- [ ] Add cursor-based pagination
- [ ] Encode cursor with last item path
- [ ] Return `nextCursor` in results

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

- [ ] Keep `list_notes` as alias to `list` with appropriate defaults
- [ ] Add deprecation notice in documentation

#### 4.5 Frontmatter Summary Option

- [ ] Add `withFrontmatterSummary` parameter to list tool
- [ ] Extract frontmatter keys (title, tags, aliases) without reading full content
- [ ] Include in `FileMetadata` as optional `frontmatterSummary` field
- [ ] Optimize to avoid full file reads when possible

#### 4.6 Testing

- [ ] Test recursive vs non-recursive listing
- [ ] Test glob include/exclude patterns
- [ ] Test pagination with various limits
- [ ] Test filtering by type (files/directories/any)
- [ ] Test frontmatter summary extraction
- [ ] Performance test with large vaults (10k+ files)

---

## Phase 5: Advanced Read Operations

**Priority:** P3  
**Dependencies:** Phase 2  
**Estimated Effort:** 2-3 days

### Goals

Add options for reading notes with frontmatter parsing and specialized file type support.

### Tasks

#### 5.1 Enhanced `read_note` Tool

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

- [ ] Implement frontmatter extraction
- [ ] Parse YAML frontmatter
- [ ] Separate frontmatter from content
- [ ] Return structured `ParsedNote` object

#### 5.3 Excalidraw Support

**Tool:** `read_excalidraw`

- [ ] Add specialized tool for Excalidraw files
- [ ] Extract plugin metadata
- [ ] Return element counts
- [ ] Provide safe preview summary
- [ ] Optional compressed data inclusion

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

- [ ] Test frontmatter parsing with various YAML formats
- [ ] Test with notes that have no frontmatter
- [ ] Test Excalidraw file reading
- [ ] Test parameter combinations

---

## Phase 6: Powerful Search

**Priority:** P2  
**Dependencies:** Phase 2  
**Estimated Effort:** 4-5 days

### Goals

Implement regex search, snippet extraction, and specialized search helpers.

### Tasks

#### 6.1 Enhanced `search` Tool

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

- [ ] Implement regex and literal search
- [ ] Extract surrounding context snippets
- [ ] Calculate match ranges for highlighting
- [ ] Support glob filtering
- [ ] Limit results and track statistics

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

- [ ] Add specialized tool for finding Waypoint markers
- [ ] Search for `%% Begin Waypoint %%` ... `%% End Waypoint %%`
- [ ] Return locations and parsed content

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

- [ ] Test literal vs regex search
- [ ] Test case sensitivity
- [ ] Test snippet extraction
- [ ] Test glob filtering
- [ ] Test waypoint search
- [ ] Performance test with large files

---

## Phase 7: Waypoint Support

**Priority:** P3  
**Dependencies:** Phase 6  
**Estimated Effort:** 3-4 days

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
- [ ] Find `%% Begin Waypoint %%` ... `%% End Waypoint %%` block
- [ ] Extract fenced block range (line numbers)
- [ ] Parse links within the block
- [ ] Return structured data

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

- [ ] Add validation to `update_note` and `update_sections` tools
- [ ] Refuse edits that would affect `%% Begin Waypoint %%` ... `%% End Waypoint %%` blocks
- [ ] Return clear error message when waypoint edit is attempted
- [ ] Provide option to force edit with explicit `allowWaypointEdit: true` flag

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
- [ ] Check if basename equals folder name
- [ ] Check for Waypoint markers
- [ ] Return boolean and metadata

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

- [ ] Test with various Waypoint formats
- [ ] Test folder note detection
- [ ] Test with nested folders
- [ ] Test edge cases (empty waypoints, malformed markers)

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
