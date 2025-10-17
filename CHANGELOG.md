# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

## [5.0.0] - 2025-10-16

### 🚀 Phase 6: Powerful Search

This release introduces a completely redesigned search system with regex support, advanced filtering, and specialized waypoint search capabilities.

#### Added

**New Tool: `search`**
- **Regex support** - Full JavaScript regex pattern matching with `isRegex` parameter
- **Case sensitivity control** - Toggle case-sensitive search with `caseSensitive` parameter
- **Advanced filtering**:
  - `includes` - Glob patterns to include specific files (e.g., `['*.md', 'projects/**']`)
  - `excludes` - Glob patterns to exclude files (e.g., `['.obsidian/**', '*.tmp']`)
  - `folder` - Limit search to specific folder path
- **Snippet extraction** - Configurable context snippets with `snippetLength` parameter
- **Result limiting** - Control maximum results with `maxResults` parameter (default: 100)
- **Snippet control** - Toggle snippet extraction with `returnSnippets` parameter
- Returns enhanced `SearchResult` with:
  - `query` - Search query string
  - `isRegex` - Boolean indicating regex mode
  - `matches` - Array of `SearchMatch` objects with line, column, snippet, and match ranges
  - `totalMatches` - Total number of matches found
  - `filesSearched` - Number of files searched
  - `filesWithMatches` - Number of files containing matches

**New Tool: `search_waypoints`**
- Specialized tool for finding Waypoint plugin markers
- Searches for `%% Begin Waypoint %%` ... `%% End Waypoint %%` blocks
- **Wikilink extraction** - Automatically extracts `[[wikilinks]]` from waypoint content
- **Folder scoping** - Optional `folder` parameter to limit search scope
- Returns structured `WaypointSearchResult` with:
  - `waypoints` - Array of waypoint locations with content and links
  - `totalWaypoints` - Total number of waypoints found
  - `filesSearched` - Number of files searched

**New Utilities (`src/utils/search-utils.ts`)**
- `SearchUtils` class for advanced search operations
- `search()` - Main search method with regex, filtering, and snippet extraction
- `searchInFile()` - Search within single file with match highlighting
- `searchInFilename()` - Search in file basenames
- `searchWaypoints()` - Specialized waypoint marker search
- Handles edge cases: zero-width regex matches, invalid patterns, large files

**Type Definitions (`src/types/mcp-types.ts`)**
- Updated `SearchResult` - Added `isRegex` field
- `WaypointResult` - Individual waypoint location with content and links
- `WaypointSearchResult` - Waypoint search results with statistics

**Implementation (`src/tools/vault-tools.ts`)**
- New `search()` method with full parameter support
- New `searchWaypoints()` method for waypoint discovery
- Updated `searchNotes()` to include `isRegex: false` in results

**Tool Registry (`src/tools/index.ts`)**
- Registered `search` tool with comprehensive schema
- Registered `search_waypoints` tool
- Marked `search_notes` as DEPRECATED (kept for backward compatibility)
- Updated callTool to handle new search tools

#### Improvements

- **Regex power** - Full JavaScript regex syntax support with global flag for multiple matches per line
- **Smart snippet extraction** - Centers matches in snippets with configurable length
- **Consistent filtering** - Uses existing GlobUtils for glob pattern matching
- **Filename search** - Searches both content and filenames automatically
- **Error handling** - Clear error messages for invalid regex patterns
- **Performance** - Efficient search with early termination when maxResults reached

#### Breaking Changes

- **`search_notes` tool removed** - Replaced by enhanced `search` tool
  - Old tool completely removed (no backward compatibility)
  - Use `search` tool with `isRegex: false` for equivalent literal search
  - Migration: Replace `search_notes` calls with `search` tool

#### Benefits

- **Powerful queries** - Use regex for complex search patterns (e.g., `^# Heading`, `TODO.*urgent`)
- **Precise control** - Fine-tune search with case sensitivity and glob filtering
- **Better results** - Context snippets with match highlighting for easier review
- **Waypoint discovery** - Find all folder notes and navigation structures
- **Cleaner API** - Single powerful search tool instead of multiple limited ones

---

## [4.0.0] - 2025-10-16

### 🚀 Phase 5: Advanced Read Operations

This release adds frontmatter parsing capabilities to `read_note` and introduces specialized support for Excalidraw files. All features have been manually tested and refined based on user feedback.

#### Added

**Enhanced Tool: `read_note`**
- **Frontmatter parsing** - New `parseFrontmatter` option to separate frontmatter from content
- **Structured response** - Returns `ParsedNote` object with parsed YAML frontmatter
- **Flexible options**:
  - `withFrontmatter` (default: true) - Include frontmatter in response
  - `withContent` (default: true) - Include full content in response
  - `parseFrontmatter` (default: false) - Parse and structure frontmatter
- **Backward compatible** - Default behavior unchanged (returns raw content)
- Returns structured JSON when `parseFrontmatter: true` with:
  - `path` - File path
  - `hasFrontmatter` - Boolean indicating presence
  - `frontmatter` - Raw YAML string
  - `parsedFrontmatter` - Parsed YAML object
  - `content` - Full file content
  - `contentWithoutFrontmatter` - Content excluding frontmatter

**New Tool: `read_excalidraw`**
- Specialized tool for reading Excalidraw drawing files
- **Metadata extraction** - Element count, compressed data status
- **Preview text** - Extract text elements without parsing full drawing
- **Optional compressed data** - Include full drawing data with `includeCompressed: true`
- Returns structured `ExcalidrawMetadata` with:
  - `path` - File path
  - `isExcalidraw` - Validation boolean
  - `elementCount` - Number of drawing elements
  - `hasCompressedData` - Boolean for compressed files
  - `metadata` - Drawing metadata (appState, version)
  - `preview` - Text elements preview (optional)
  - `compressedData` - Full drawing data (optional)

**New Utilities (`src/utils/frontmatter-utils.ts`)**
- `FrontmatterUtils` class for YAML parsing
- `extractFrontmatter()` - Extract and parse YAML frontmatter using Obsidian's parseYaml
- `extractFrontmatterSummary()` - Extract common fields (title, tags, aliases)
- `hasFrontmatter()` - Quick check for frontmatter presence
- `parseExcalidrawMetadata()` - Parse Excalidraw file structure
- Handles edge cases: no frontmatter, malformed YAML, invalid Excalidraw files

**Type Definitions (`src/types/mcp-types.ts`)**
- `ParsedNote` - Structured note with separated frontmatter
- `ExcalidrawMetadata` - Excalidraw file metadata structure

**Implementation (`src/tools/note-tools.ts`)**
- Enhanced `readNote()` method with options parameter
- New `readExcalidraw()` method for Excalidraw files
- Integrated frontmatter parsing with FrontmatterUtils
- Maintains backward compatibility for existing clients

**Tool Registry (`src/tools/index.ts`)**
- Updated `read_note` schema with new optional parameters
- Registered `read_excalidraw` tool with comprehensive schema
- Updated callTool to pass options to readNote and handle read_excalidraw

#### Improvements (Post-Testing)

- **Enhanced error handling** - Graceful handling of non-Excalidraw files with structured responses
- **Comprehensive documentation** - Detailed field descriptions in tool schema with explicit categorization
- **Full metadata exposure** - All Excalidraw metadata fields properly exposed per spec:
  - `elementCount` - Number of drawing elements (always returned)
  - `hasCompressedData` - Boolean for embedded images (always returned)
  - `metadata` - Object with appState and version (always returned)
  - `preview` - Text elements (conditional on includePreview)
  - `compressedData` - Full drawing data (conditional on includeCompressed)
- **Enhanced type definitions** - JSDoc comments on all ExcalidrawMetadata fields
- **Complete specification** - New EXCALIDRAW_METADATA_SPEC.md with comprehensive documentation

#### Bug Fixes (Post-Testing)

- **Fixed missing metadata fields** - Resolved issue where `elementCount`, `hasCompressedData`, and `metadata` were not returned
  - Added support for `compressed-json` code fence format (Excalidraw's actual format)
  - Detects compressed (base64) vs uncompressed JSON data
  - For compressed files: Returns `hasCompressedData: true` and `metadata.compressed: true`
  - For uncompressed files: Extracts actual element count and metadata
  - Multiple regex patterns to handle different Excalidraw formats
  - Always return metadata fields with appropriate values
- **Known Limitation:** `elementCount` returns 0 for compressed files
  - Most Excalidraw files use compressed base64 format by default
  - Decompression would require pako library (not included to minimize dependencies)
  - Text elements are still extracted in `preview` field
  - Use `hasCompressedData: true` to identify compressed files
  - This is expected behavior, not a bug

#### Benefits

- **Better frontmatter handling** - Separate frontmatter from content for easier processing
- **Excalidraw support** - First-class support for Excalidraw drawings with complete metadata
- **Flexible reading** - Choose what data to include in responses
- **Backward compatible** - Existing code continues to work unchanged
- **Type-safe** - Structured responses with proper TypeScript types
- **Robust** - Graceful error handling for edge cases

## [3.0.0] - 2025-10-16

### 🚀 Phase 4: Enhanced List Operations

This release replaces `list_notes` with a powerful new `list` tool featuring advanced filtering, recursion, pagination, and frontmatter summaries.

#### Breaking Changes

**Removed Tools**
- `list_notes` - Replaced with the more powerful `list` tool
  - **Migration:** Replace `list_notes({ path })` with `list({ path })`
  - The new `list` tool is backwards compatible for basic usage

#### Added

**New Tool: `list`**
- Advanced file/directory listing with comprehensive filtering options
- **Recursive listing** - Traverse entire directory trees with `recursive: true`
- **Glob pattern filtering** - Include/exclude patterns supporting `*`, `**`, `?`, `[abc]`, `{a,b}`
- **Type filtering** - Filter by `files`, `directories`, or `any`
- **Cursor-based pagination** - Handle large result sets efficiently with `limit` and `cursor`
- **Frontmatter summaries** - Extract title, tags, aliases without reading full content
- Returns structured `ListResult` with items, totalCount, hasMore, and nextCursor

**New Utilities (`src/utils/glob-utils.ts`)**
- `GlobUtils` class for pattern matching
- Supports wildcards: `*` (any chars except /), `**` (any chars including /), `?` (single char)
- Supports character classes: `[abc]`, alternatives: `{a,b,c}`
- `shouldInclude()` - Combined include/exclude filtering
- `matches()` - Test path against glob pattern

**Type Definitions (`src/types/mcp-types.ts`)**
- `FrontmatterSummary` - Parsed frontmatter fields (title, tags, aliases, custom fields)
- `FileMetadataWithFrontmatter` - Extended file metadata with optional frontmatter
- `ListResult` - Paginated list response structure

**Implementation (`src/tools/vault-tools.ts`)**
- `list(options)` method - Enhanced listing with all Phase 4 features
- `createFileMetadataWithFrontmatter()` - Efficient frontmatter extraction using metadata cache
- Recursive directory traversal
- Glob pattern filtering integration
- Cursor-based pagination logic

**Tool Registry (`src/tools/index.ts`)**
- Registered `list` tool with comprehensive schema
- Removed `list_notes` tool definition
- Updated call handler to route `list` requests

#### Features in Detail

**Recursive Listing**
```typescript
// List all markdown files in vault recursively
list({ recursive: true, includes: ["*.md"] })
```

**Glob Filtering**
```typescript
// Include only markdown files, exclude .obsidian folder
list({ 
  includes: ["*.md"], 
  excludes: [".obsidian/**"] 
})
```

**Type Filtering**
```typescript
// List only directories
list({ only: "directories" })
```

**Pagination**
```typescript
// First page
list({ limit: 50 })
// Next page using cursor
list({ limit: 50, cursor: "path/from/previous/response" })
```

**Frontmatter Summaries**
```typescript
// Get file list with frontmatter metadata
list({ 
  withFrontmatterSummary: true,
  includes: ["*.md"]
})
```

#### Example Response

```json
{
  "items": [
    {
      "kind": "directory",
      "name": "projects",
      "path": "projects",
      "childrenCount": 15,
      "modified": 1697500800000
    },
    {
      "kind": "file",
      "name": "README.md",
      "path": "README.md",
      "extension": "md",
      "size": 2048,
      "modified": 1697500800000,
      "created": 1697400000000,
      "frontmatterSummary": {
        "title": "Project Overview",
        "tags": ["documentation", "readme"],
        "aliases": ["index"]
      }
    }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

#### Performance

- Frontmatter extraction uses Obsidian's metadata cache (no file reads)
- Glob matching uses efficient regex compilation
- Pagination prevents memory issues with large vaults
- Recursive listing optimized for vault structure

---

## [2.1.0] - 2025-10-16

### ✨ Phase 3: Discovery Endpoints

This release adds new tools for exploring vault structure and testing path validity.

#### Added

**New Tools**
- `stat` - Get detailed metadata for a file or folder at a specific path
  - Returns existence status, kind (file/directory), and full metadata
  - Includes size, dates, child count, etc.
  - More detailed than `exists()` but slightly slower
- `exists` - Quickly check if a file or folder exists
  - Fast path validation without fetching full metadata
  - Returns existence status and kind only
  - Optimized for quick existence checks

**Type Definitions (`src/types/mcp-types.ts`)**
- `StatResult` - Structured result for stat operations (path, exists, kind, metadata)
- `ExistsResult` - Structured result for exists operations (path, exists, kind)

**Implementation (`src/tools/vault-tools.ts`)**
- `stat(path)` method - Comprehensive path metadata retrieval
- `exists(path)` method - Fast existence checking
- Both methods use PathUtils for consistent path normalization
- Both methods validate paths and return structured JSON

**Tool Registry (`src/tools/index.ts`)**
- Registered `stat` and `exists` tools with complete schemas
- Added call handlers for both new tools
- Comprehensive descriptions for AI agent usage

#### Use Cases

**`stat` Tool:**
- Verify a path exists before operations
- Get detailed file/folder information
- Check file sizes and modification dates
- Determine if a path is a file or directory

**`exists` Tool:**
- Quick existence checks before create operations
- Validate paths in batch operations
- Fast pre-flight checks
- Minimal overhead for simple validation

#### Example Responses

**stat (file exists):**
```json
{
  "path": "folder/note.md",
  "exists": true,
  "kind": "file",
  "metadata": {
    "kind": "file",
    "name": "note.md",
    "path": "folder/note.md",
    "extension": "md",
    "size": 1234,
    "modified": 1697500800000,
    "created": 1697400000000
  }
}
```

**exists (folder exists):**
```json
{
  "path": "projects",
  "exists": true,
  "kind": "directory"
}
```

**stat (path doesn't exist):**
```json
{
  "path": "missing/file.md",
  "exists": false
}
```

---

## [2.0.0] - 2025-10-16

### 🔧 Phase 2.1: Post-Testing Fixes

Based on testing feedback, the following improvements were made to the Phase 2 implementation:

#### Fixed

**Root Listing Semantics (`src/tools/vault-tools.ts`)**
- Clarified root path handling: `undefined`, `""` (empty string), or `"."` all represent the vault root
- Root listing now correctly returns direct children only (excludes vault root itself)
- Added explicit check to skip vault root folder (path === '')
- Improved code clarity with explicit `isRootPath` check

**Alphabetical Sorting**
- Fixed sorting to be case-insensitive for stable, consistent ordering
- Directories are sorted alphabetically (case-insensitive), then files alphabetically (case-insensitive)
- Ensures predictable order for names like "CTP Lancaster" and "Construction Game"

**Directory Metadata**
- Added logic to populate `modified` timestamp from filesystem if available
- Falls back to `0` when filesystem metadata is not available (which is typical for directories)
- Added documentation explaining when `modified` may be `0`
- **Note:** Obsidian's TFolder API doesn't include `stat` property, so directories will typically show `modified: 0`

**Documentation (`src/tools/index.ts`)**
- Updated `list_notes` description to document root path options (`""` or `"."`)
- Added explicit warning that leading slashes (e.g., `"/"` or `"/folder"`) are invalid
- Clarified that sorting is case-insensitive within each group
- Added note that only direct children are returned (non-recursive)

#### Technical Details

**Root Path Handling:**
```typescript
// All of these list the vault root:
list_notes()              // undefined
list_notes({ path: "" })  // empty string
list_notes({ path: "." }) // dot
```

**Invalid Paths:**
```typescript
// These will error:
list_notes({ path: "/" })       // leading slash
list_notes({ path: "/folder" }) // leading slash
```

---

### 🔄 Phase 2: API Unification & Typed Results (BREAKING CHANGES)

This release introduces structured, typed responses for all tools and unifies parameter naming. **Note: This is a breaking change as backwards compatibility is not maintained.**

#### Added

**Typed Result Interfaces (`src/types/mcp-types.ts`)**
- `FileMetadata` - Structured file information (kind, name, path, extension, size, modified, created)
- `DirectoryMetadata` - Structured directory information (kind, name, path, childrenCount, modified)
- `VaultInfo` - Structured vault information (name, path, totalFiles, totalFolders, markdownFiles, totalSize)
- `SearchMatch` - Detailed search match information (path, line, column, snippet, matchRanges)
- `SearchResult` - Comprehensive search results (query, matches, totalMatches, filesSearched, filesWithMatches)
- `ItemKind` - Type union for "file" | "directory"

**Enhanced Tool Responses**
- All tools now return structured JSON instead of plain text
- Consistent response format across all operations
- Machine-readable data for better integration

#### Changed

**`list_notes` Tool (BREAKING)**
- Parameter: `folder` → `path` (breaking change - `folder` parameter removed)
- Response: Now returns array of `FileMetadata` and `DirectoryMetadata` objects
- Behavior: Lists direct children only (non-recursive)
- Includes both files AND directories (not just markdown files)
- Sorted: directories first, then files, alphabetically
- Each item includes detailed metadata (size, dates, child count)

**`search_notes` Tool (BREAKING)**
- Response: Now returns structured `SearchResult` object
- Includes line numbers, column positions, and context snippets
- Provides match ranges for highlighting
- Tracks files searched and files with matches
- Filename matches indicated with line: 0

**`get_vault_info` Tool (BREAKING)**
- Response: Now returns structured `VaultInfo` object
- Added: `totalFolders` count
- Added: `totalSize` in bytes
- Renamed: `rootPath` → `path`

**Tool Descriptions**
- Updated all tool descriptions to reflect structured JSON responses
- Clarified return value formats
- Removed deprecated `folder` parameter

#### Implementation Details

**`src/tools/vault-tools.ts`**
- `searchNotes()` - Complete rewrite with line-by-line search and snippet extraction
- `getVaultInfo()` - Added folder counting and size calculation
- `listNotes()` - Rewritten to return structured metadata for files and directories
- Added `createFileMetadata()` helper method
- Added `createDirectoryMetadata()` helper method

**`src/tools/index.ts`**
- Updated tool schemas to use `path` parameter only
- Updated tool descriptions to document structured responses
- Modified `callTool()` to pass `path` parameter

#### Migration Guide

**Before (v1.x):**
```javascript
// list_notes returned plain text
"Found 3 notes:\nfile1.md\nfile2.md\nfile3.md"

// search_notes returned plain text
"Found 2 notes:\npath/to/note1.md\npath/to/note2.md"

// get_vault_info returned simple object
{ "name": "MyVault", "totalFiles": 100, "markdownFiles": 80, "rootPath": "/path" }
```

**After (v2.x):**
```javascript
// list_notes returns structured array
[
  { "kind": "directory", "name": "folder1", "path": "folder1", "childrenCount": 5, "modified": 0 },
  { "kind": "file", "name": "note.md", "path": "note.md", "extension": "md", "size": 1024, "modified": 1697472000000, "created": 1697472000000 }
]

// search_notes returns detailed matches
{
  "query": "TODO",
  "matches": [
    { "path": "note.md", "line": 5, "column": 10, "snippet": "...context around TODO item...", "matchRanges": [{ "start": 15, "end": 19 }] }
  ],
  "totalMatches": 1,
  "filesSearched": 100,
  "filesWithMatches": 1
}

// get_vault_info returns comprehensive info
{ "name": "MyVault", "path": "/path", "totalFiles": 100, "totalFolders": 20, "markdownFiles": 80, "totalSize": 5242880 }
```

#### Benefits
- **Machine-readable**: Structured JSON for easy parsing and integration
- **Detailed metadata**: Rich information for each file and directory
- **Search precision**: Line numbers, columns, and snippets for exact match location
- **Consistency**: Unified response format across all tools
- **Type safety**: Well-defined TypeScript interfaces

## [1.2.0] - 2025-10-16

### 📁 Enhanced Parent Folder Detection (Phase 1.5)

Improved `create_note` tool with explicit parent folder validation and optional automatic folder creation.

#### Added

**Parent Folder Validation (`src/tools/note-tools.ts`)**
- Explicit parent folder detection before file creation (fail-fast)
- New `createParents` parameter for automatic folder creation
- Recursive parent folder creation for deeply nested paths
- Validates parent is a folder (not a file)
- Clear error messages with actionable guidance

**Tool Schema Updates (`src/tools/index.ts`)**
- Added `createParents` boolean parameter to `create_note` tool
- Default: `false` (safe behavior - requires parent folders to exist)
- Optional: `true` (convenience - auto-creates missing parent folders)
- Updated tool description with usage examples

**Enhanced Error Messages (`src/utils/error-messages.ts`)**
- `parentFolderNotFound()` now suggests using `createParents: true`
- Provides example usage with auto-creation
- Computes grandparent path for better `list_notes()` suggestions
- Clear troubleshooting steps for missing parent folders

**Comprehensive Test Suite (`tests/parent-folder-detection.test.ts`)**
- 15 test cases covering all scenarios
- Tests explicit parent folder detection
- Tests recursive folder creation
- Tests error handling and edge cases
- Validates error message content

#### Changed
- `createNote()` signature: added optional `createParents` parameter
- Parent folder validation now happens before file creation attempt
- Error messages include `createParents` usage examples

#### Benefits
- **Fail-fast behavior**: Errors detected before attempting file creation
- **Flexibility**: Optional auto-creation with `createParents: true`
- **Robustness**: Handles deeply nested paths and all edge cases
- **Backward compatible**: Existing code continues to work (default: `false`)

### 🔐 Enhanced Authentication & Security (Phase 1.5)

This update significantly improves authentication security and user experience with automatic key generation and enhanced UI.

#### Added

**Automatic API Key Generation (`src/utils/auth-utils.ts`)**
- `generateApiKey()` - Cryptographically secure random key generation (32 characters)
- `validateApiKey()` - API key validation with strength requirements
- Uses `crypto.getRandomValues()` for secure randomness
- Alphanumeric + special characters (`-`, `_`) for URL-safe keys

**Enhanced Settings UI (`src/settings.ts`)**
- Auto-generate API key when authentication is enabled
- Copy to clipboard button for API key
- Regenerate key button with instant refresh
- Static, selectable API key display (full width)
- MCP client configuration snippet generator
  - Dynamically includes/excludes Authorization header based on auth status
  - Correct `mcpServers` format with `serverUrl` field
  - Copy configuration button for one-click copying
  - Partially selectable text for easy copying
- Restart warnings when authentication settings change
- Selectable connection information URLs

**Security Improvements (`src/server/middleware.ts`)**
- Defensive authentication check: rejects requests if auth enabled but no key set
- Improved error messages for authentication failures
- Fail-secure design: blocks access when misconfigured

**Server Validation (`src/main.ts`)**
- Prevents server start if authentication enabled without API key
- Clear error message guiding users to fix configuration
- Validation runs before server initialization

#### Changed
- API key field changed from user-editable to auto-generated display
- Configuration snippet now shows for both authenticated and non-authenticated setups
- Connection information URLs are now selectable

#### Security
- Fixed vulnerability where enabling authentication without API key allowed unrestricted access
- Three-layer defense: UI validation, server start validation, and middleware enforcement
- API keys are now always cryptographically secure (no weak user-chosen keys)

## [1.1.0] - 2025-10-16

### 🎯 Phase 1.1: Path Normalization & Error Handling

This release focuses on robustness, cross-platform compatibility, and significantly improved error messages.

#### Added

**Path Utilities (`src/utils/path-utils.ts`)**
- `PathUtils.normalizePath()` - Cross-platform path normalization (Windows/macOS/Linux)
- `PathUtils.isValidVaultPath()` - Path validation with security checks
- `PathUtils.resolveFile()` / `resolveFolder()` - Type-safe path resolution
- `PathUtils.fileExists()` / `folderExists()` - Existence checking
- `PathUtils.getPathType()` - Determine if path is file or folder
- `PathUtils.ensureMarkdownExtension()` - Auto-add .md extension
- `PathUtils.getParentPath()` / `getBasename()` - Path manipulation
- `PathUtils.joinPath()` - Safe path joining
- Handles backslashes, drive letters, trailing slashes automatically
- Prevents directory traversal attacks (`..` paths)

**Enhanced Error Messages (`src/utils/error-messages.ts`)**
- Context-aware error messages with troubleshooting tips
- Dynamic `list_notes()` suggestions based on path context
- Operation-specific guidance (read, create, update, delete)
- Clear examples of correct path formats
- Platform-specific notes (case sensitivity on macOS/Linux)
- `ErrorMessages.fileNotFound()` - File not found with discovery tips
- `ErrorMessages.folderNotFound()` - Folder not found with navigation tips
- `ErrorMessages.invalidPath()` - Invalid path with format examples
- `ErrorMessages.pathAlreadyExists()` - Conflict resolution guidance
- `ErrorMessages.parentFolderNotFound()` - Parent folder missing with verification steps
- `ErrorMessages.cannotDeleteFolder()` - Folder deletion attempt with alternatives
- `ErrorMessages.notAFile()` / `notAFolder()` - Type mismatch errors
- `ErrorMessages.operationFailed()` - Generic operation failures

**Testing Infrastructure**
- Jest testing framework configured
- 43 unit tests for PathUtils (all passing)
- Mock Obsidian API for testing (`tests/__mocks__/obsidian.ts`)
- Test coverage for cross-platform path handling
- Integration tests with mock App/Vault
- `npm test` / `npm run test:watch` / `npm run test:coverage` scripts

**Documentation**
- `docs/TOOL_SELECTION_GUIDE.md` - Comprehensive 400+ line guide
  - Decision table for tool selection
  - Path format guidelines (correct vs incorrect)
  - Common scenarios with step-by-step examples
  - Troubleshooting decision tree
  - Best practices checklist
  - Quick reference card
- `docs/ERROR_MESSAGE_IMPROVEMENTS.md` - Error message enhancement documentation
- `docs/TOOL_DESCRIPTION_IMPROVEMENTS.md` - AI agent tool description improvements
- `tests/README.md` - Testing setup and guidelines
- `PHASE_1.1_IMPLEMENTATION.md` - Complete implementation summary

#### Changed

**All Tool Implementations Enhanced**
- `readNote()` - Path validation, better error messages, folder detection
- `createNote()` - Path normalization, conflict detection, parent folder validation
- `updateNote()` - Enhanced validation, clearer error messages
- `deleteNote()` - Folder detection with specific error message
- `listNotes()` - Path validation, folder verification, better errors

**Tool Descriptions for AI Agents**
- All 7 MCP tool descriptions significantly enhanced
- Critical constraints stated upfront (e.g., "only files, NOT folders")
- Workflow guidance (e.g., "use list_notes() first if unsure")
- Path requirements clearly documented in every parameter
- Multiple concrete examples per tool
- Failure modes explicitly stated
- Self-documenting for AI agents without external docs

**Error Message Consistency**
- All errors now include vault-relative path reminders
- Case sensitivity noted for macOS/Linux
- Context-specific `list_notes()` commands
- Operation-appropriate tool suggestions
- Consistent formatting across all tools

#### Fixed

- **Cross-platform paths** - Windows backslashes now handled correctly
- **Path validation** - Prevents invalid characters and directory traversal
- **Delete folder error** - Now clearly states "cannot delete folders" instead of confusing message
- **Parent folder detection** - Clear message when parent folder missing during create
- **Error message contradictions** - All error headers and bodies now consistent

#### Technical Details

**New Dependencies**
- jest: ^29.x (dev)
- @types/jest: ^29.x (dev)
- ts-jest: ^29.x (dev)

**Test Coverage**
- 43 unit tests passing
- PathUtils: 100% coverage
- Cross-platform scenarios tested
- Mock Obsidian API for isolated testing

**Build**
- All TypeScript compilation successful
- No breaking changes to existing APIs
- Backward compatible with v1.0.0

#### Developer Experience

- Centralized path handling logic
- Type-safe path operations
- Comprehensive test suite
- Clear error messages reduce support burden
- Self-documenting code

---

## [1.0.0] - 2025-10-16

### 🎉 Initial Release

#### Added

**Core Features**
- MCP (Model Context Protocol) server implementation
- HTTP transport with Express.js
- JSON-RPC 2.0 message handling
- Protocol version 2024-11-05 support

**MCP Tools**
- `read_note` - Read note content from vault
- `create_note` - Create new notes
- `update_note` - Update existing notes
- `delete_note` - Delete notes
- `search_notes` - Search notes by content or filename
- `list_notes` - List all notes or notes in specific folder
- `get_vault_info` - Get vault metadata and statistics

**Server Features**
- Configurable HTTP server (default port: 3000)
- Localhost-only binding (127.0.0.1)
- Health check endpoint (`/health`)
- MCP endpoint (`/mcp`)
- Auto-start option

**Security**
- Origin header validation (DNS rebinding protection)
- Optional Bearer token authentication
- CORS configuration with allowed origins
- Request validation and error handling

**User Interface**
- Settings panel with full configuration
- Status bar indicator showing server state
- Ribbon icon for quick server toggle
- Start/Stop/Restart commands
- Real-time server status display
- Connection information display

**Documentation**
- Comprehensive README with examples
- Quick Start Guide
- Implementation Summary
- Test client script
- Example MCP requests
- Security considerations

**Developer Tools**
- TypeScript implementation
- esbuild bundler
- Test client for validation
- Health check endpoint

### Technical Details

**Dependencies**
- express: ^4.18.2
- cors: ^2.8.5
- obsidian: latest

**Build**
- TypeScript 4.7.4
- esbuild 0.17.3
- Output: 828KB bundled

**Compatibility**
- Obsidian minimum version: 0.15.0
- Desktop only (requires Node.js HTTP server)
- Protocol: MCP 2024-11-05

### Known Limitations

- Desktop only (not available on mobile)
- Single vault per server instance
- No WebSocket support (HTTP only)
- No SSL/TLS (localhost only)

---

## Future Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed implementation plans.

### Phase 1: Foundation (P0-P1)
- **Path Normalization** - Consistent path handling across platforms
- **Error Message Improvements** - Clear, actionable error messages with troubleshooting tips
- **Enhanced Authentication** - Secure API key management, multiple keys with labels, expiration, rate limiting, audit logging, and permission scopes
- **API Unification** - Standardize parameter naming and return structured, typed results
- **Discovery Endpoints** - Add `stat` and `exists` tools for exploring vault structure

### Phase 2: Enhanced Operations (P1-P2)
- **Write Operations & Concurrency** - ETag-based version control, partial updates (frontmatter, sections)
- **Conflict Resolution** - Create notes with conflict strategies (error, overwrite, rename)
- **File Rename/Move** - Rename or move files with automatic wikilink updates
- **Enhanced List Operations** - Filtering, recursion control, pagination, frontmatter summaries
- **Advanced Search** - Regex search, snippet extraction, glob filtering

### Phase 3: Advanced Features (P2-P3)
- **Frontmatter Parsing** - Read and update frontmatter without modifying content
- **Linking & Backlinks** - Wikilink validation, resolution, and backlink queries
- **Waypoint Support** - Tools for working with Waypoint plugin markers
- **Excalidraw Support** - Specialized tool for reading Excalidraw drawings

### Future Considerations
- **Resources API** - Expose notes as MCP resources
- **Prompts API** - Templated prompts for common operations
- **Batch Operations** - Multiple operations in single request
- **WebSocket Transport** - Real-time updates and notifications
- **Graph API** - Enhanced graph visualization and traversal
- **Tag & Canvas APIs** - Query tags and manipulate canvas files
- **Dataview Integration** - Query vault using Dataview syntax
- **Performance Enhancements** - Indexing, caching, streaming for large vaults

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.1.0 | 2025-10-16 | Phase 1.1: Path normalization, enhanced error messages, testing infrastructure |
| 1.0.0 | 2025-10-16 | Initial release |

---

## Upgrade Guide

### From 1.0.0 to 1.1.0

This is a backward-compatible update. Simply update the plugin:

1. Backup your settings (optional, but recommended)
2. Update the plugin files
3. Restart Obsidian or reload the plugin

**What's New:**
- Better error messages with troubleshooting tips
- Improved cross-platform path handling
- Enhanced tool descriptions for AI agents
- No configuration changes required

**Breaking Changes:** None - fully backward compatible

### From Development to 1.0.0

If you were using a development version:

1. Backup your settings
2. Disable the plugin
3. Delete the old plugin folder
4. Install version 1.0.0
5. Re-enable and reconfigure

### Breaking Changes

None (initial release)

---

## Support

For issues, questions, or contributions:
- Check the README.md for documentation
- Review QUICKSTART.md for setup help
- Check existing issues before creating new ones
- Include version number in bug reports

---

## Credits

- MCP Protocol: https://modelcontextprotocol.io
- Obsidian API: https://github.com/obsidianmd/obsidian-api
- Built with TypeScript, Express.js, and ❤️
