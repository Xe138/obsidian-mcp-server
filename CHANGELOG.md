# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.1.4] - 2025-12-20

### Fixed
- **Template Literal Type Safety**: Fixed type error in `notifications.ts` where `args.recursive` could produce `[object Object]` when stringified
  - Added explicit `String()` coercion for unknown types in template literals

- **File Deletion API**: Replaced `Vault.trash()` with `FileManager.trashFile()` per Obsidian guidelines
  - All file deletions now respect user's configured deletion preference (system trash or `.trash/` folder)
  - Removed unused `trash()` method from `IVaultAdapter` interface and `VaultAdapter` class
  - Both soft and regular delete operations now use the same user-preferred deletion method

### Changed
- `delete_note` destination field now returns `'trash'` instead of `.trash/{filename}` since actual location depends on user settings

---

## [1.1.3] - 2025-12-16

### Fixed
- **Sentence Case**: Fixed remaining UI text violations
  - `main.ts`: "Toggle MCP Server" → "Toggle MCP server"
  - `settings.ts`: "Authentication & Configuration" → "Authentication & configuration"
  - `settings.ts`: "UI Notifications" → "UI notifications"

- **Promise Handling**: Improved async/promise patterns per Obsidian guidelines
  - `main.ts`: Changed `async onunload()` to synchronous with `void this.stopServer()`
  - `routes.ts`: Wrapped async Express handler with void IIFE pattern
  - `mcp-server.ts`: Promise rejection now always uses Error instance

- **Async/Await Cleanup**: Removed `async` from 7 methods that contained no `await`:
  - `mcp-server.ts`: `handleInitialize`, `handleListTools`
  - `vault-tools.ts`: `getVaultInfo`, `listNotes`, `createFileMetadataWithFrontmatter`, `exists`, `resolveWikilink`
  - `link-utils.ts`: `validateLinks`

- **Type Safety**: Replaced `any` types with `Record<string, unknown>` and removed eslint-disable directives
  - `mcp-server.ts`: Tool arguments type
  - `tools/index.ts`: `callTool` args parameter
  - `notifications.ts`: `args` interface field, `showToolCall` parameter, `formatArgs` parameter

- **Import Statements**: Eliminated forbidden `require()` imports
  - `crypto-adapter.ts`: Replaced `require('crypto')` with `globalThis.crypto`
  - `encryption-utils.ts`: Replaced bare `require('electron')` with `window.require` pattern

### Changed
- Updated test mocks to match new synchronous method signatures and import patterns

---

## [1.1.2] - 2025-11-15

### Fixed
- **Code Review Issues**: Addressed all issues from Obsidian plugin submission review
  - **Type Safety**: Added eslint-disable comments with justifications for all necessary `any` types in JSON-RPC tool argument handling
  - **Command IDs**: Removed redundant plugin name prefix from command identifiers (BREAKING CHANGE):
    - `start-mcp-server` → `start-server`
    - `stop-mcp-server` → `stop-server`
    - `restart-mcp-server` → `restart-server`
  - **Promise Handling**: Added `void` operator for intentional fire-and-forget promise in notification queue processing
  - **ESLint Directives**: Added descriptive explanations to all eslint-disable comments
  - **Switch Statement Scope**: Wrapped case blocks in braces to fix lexical declaration warnings in glob pattern matcher
  - **Regular Expression**: Added eslint-disable comment for control character validation in Windows path checking
  - **Type Definitions**: Changed empty object type `{}` to `object` in MCP capabilities interface
  - **Import Statements**: Added comprehensive justifications for `require()` usage in Electron/Node.js modules (synchronous access required)
  - **Code Cleanup**: Removed unused imports (`MCPPluginSettings`, `TFile`, `VaultInfo`)

### Changed
- Command IDs simplified to remove redundant plugin identifier (may affect users with custom hotkeys)

### Documentation
- Enhanced inline code documentation for ESLint suppressions and require() statements
- Added detailed rationale for synchronous module loading requirements in Obsidian plugin context

---

## [1.1.1] - 2025-11-07

### Fixed
- **Type Safety**: Replaced all `any` types with properly defined TypeScript interfaces and types throughout the codebase
  - Defined `ElectronSafeStorage` interface for Electron's safeStorage API
  - Created `LegacySettings` interface for settings migration
  - Defined `JSONValue`, `JSONRPCParams`, and `JSONSchemaProperty` types for JSON-RPC and MCP protocol
  - Created `YAMLValue` and `FrontmatterValue` types for frontmatter handling
  - Updated middleware to use proper Express types (`NextFunction`, `JSONRPCResponse`)
- **Console Logging**: Removed all `console.log` statements to comply with Obsidian plugin submission requirements
  - Replaced user-controlled logging with `console.debug` for optional tool call logging
  - Only `console.warn`, `console.error`, and `console.debug` methods remain
- **Promise Handling**: Fixed async callback handling in DOM event listeners
  - Wrapped async event handlers with void IIFE pattern to properly handle promises in void contexts
  - Fixed 7 event listeners in settings UI and notification history
- **Import Statements**: Improved `require()` usage with proper TypeScript typing and ESLint directives
  - Added type assertions for Electron and Node.js crypto modules
  - Included justification comments for necessary `require()` usage
- **Settings UI**: Replaced direct DOM `createElement()` calls with Obsidian's `Setting.setHeading()` API
  - Updated all heading elements in settings tab to use official API
- **Text Formatting**: Applied sentence case to all user-facing text per Obsidian UI guidelines
  - Updated command names, setting labels, button text, and notice messages
- **Code Quality**: Various cleanup improvements
  - Removed unused `vault.delete()` method in favor of `trashFile()`
  - Fixed regex character class format from `\x00-\x1F` to `\u0000-\u001F` for clarity
  - Verified no unused imports, variables, or switch case scoping issues

### Documentation
- Added comprehensive verification report documenting all fixes for plugin submission review

---

## [1.1.0] - 2025-10-30

### Added
- **Word Count**: `create_note`, `update_note`, and `update_sections` now automatically return word count for the note content
  - Excludes YAML frontmatter and Obsidian comments (`%% ... %%`) from word count
  - Includes all other content (code blocks, inline code, headings, lists, etc.)
- **Link Validation**: `create_note`, `update_note`, and `update_sections` now automatically validate all wikilinks and embeds
  - Validates basic wikilinks (`[[Note]]`), heading links (`[[Note#Heading]]`), and embeds (`![[file.ext]]`)
  - Categorizes links as: valid, broken notes (note doesn't exist), or broken headings (note exists but heading missing)
  - Returns detailed broken link information including line number and context snippet
  - Provides human-readable summary (e.g., "15 links: 12 valid, 2 broken notes, 1 broken heading")
  - Can be disabled via `validateLinks: false` parameter for performance-critical operations
- **Word Count for Read Operations**: Extended word count support to read operations
  - `read_note` now automatically includes `wordCount` when returning content (with `withContent` or `parseFrontmatter` options)
  - `stat` supports optional `includeWordCount` parameter to compute word count (with performance warning)
  - `list` supports optional `includeWordCount` parameter to compute word count for all files (with performance warning)
  - All read operations use the same word counting rules as write operations (excludes frontmatter and Obsidian comments)
  - Best-effort error handling: unreadable files are skipped in batch operations without failing the entire request

### Changed
- `create_note`, `update_note`, and `update_sections` response format now includes `wordCount` and optional `linkValidation` fields
- `updateNote` now returns structured JSON response instead of simple success message (includes success, path, versionId, modified, wordCount, linkValidation)
- `read_note` response now includes `wordCount` field when returning content
- `stat` response includes optional `wordCount` field in metadata when `includeWordCount: true`
- `list` response includes optional `wordCount` field for each file when `includeWordCount: true`
- Type definitions updated: `ParsedNote` and `FileMetadata` interfaces now include optional `wordCount?: number` field

---

## [1.0.1] - 2025-10-28

### Fixed
- Updated config path examples from `.obsidian/**` to `templates/**` in tool descriptions to avoid implying hardcoded configuration directory paths
- Removed "MCP Server" from command display names per Obsidian plugin guidelines (commands now show as "Start server", "Stop server", etc.)
- Replaced deprecated `vault.delete()` with `app.fileManager.trashFile()` to respect user's trash preferences configured in Obsidian settings
- Extracted all inline JavaScript styles to semantic CSS classes with `mcp-*` namespace for better maintainability and Obsidian plugin compliance
- Applied CSS extraction to notification history modal for consistency

### Changed
- Command palette entries now display shorter names without redundant plugin name prefix
- File deletion operations now respect user's configured trash location (system trash or `.trash/` folder)
- Settings panel and notification history UI now use centralized CSS classes instead of inline styles

---

## [1.0.0] - 2025-10-26

### 🎉 Initial Public Release

The Obsidian MCP Server plugin is now publicly available! This plugin exposes your Obsidian vault via the Model Context Protocol (MCP) over HTTP, enabling AI assistants and other MCP clients to interact with your vault programmatically.

#### Core Features

**MCP Server**
- HTTP server implementing MCP protocol version 2024-11-05
- JSON-RPC 2.0 message handling
- Localhost-only binding (127.0.0.1) for security
- Configurable port (default: 3000)
- Auto-start option

**Note Operations**
- `read_note` - Read note content with optional frontmatter parsing
- `create_note` - Create notes with conflict handling (error/overwrite/rename)
- `update_note` - Update existing notes with concurrency control
- `delete_note` - Delete notes (soft delete to .trash or permanent)
- `update_frontmatter` - Update frontmatter fields without modifying content
- `update_sections` - Update specific sections by line range
- `rename_file` - Rename or move files with automatic wikilink updates
- `read_excalidraw` - Read Excalidraw drawing files with metadata

**Vault Operations**
- `search` - Advanced search with regex, glob filtering, and snippets
- `search_waypoints` - Find Waypoint plugin markers
- `list` - List files/directories with filtering and pagination
- `stat` - Get detailed file/folder metadata
- `exists` - Quick existence check
- `get_vault_info` - Vault metadata and statistics

**Waypoint Integration**
- `get_folder_waypoint` - Extract Waypoint blocks from folder notes
- `is_folder_note` - Detect folder notes
- Automatic waypoint edit protection

**Link Management**
- `validate_wikilinks` - Validate all links in a note
- `resolve_wikilink` - Resolve single wikilink to target path
- `backlinks` - Get backlinks with optional unlinked mentions

**Security**
- Mandatory Bearer token authentication
- Auto-generated, cryptographically secure API keys (32 characters)
- API keys encrypted using system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Host header validation (DNS rebinding protection)
- CORS policy fixed to localhost-only origins
- Desktop-only (requires Node.js HTTP server)

**User Interface**
- Settings panel with full configuration
- Status bar indicator showing server state
- Ribbon icon for quick server toggle
- Start/Stop/Restart commands
- Real-time connection information
- Copy API key and configuration snippets
- Notification system for tool calls (optional)
- Notification history viewer

**Developer Experience**
- Cross-platform path handling (Windows/macOS/Linux)
- Comprehensive error messages with troubleshooting tips
- Path validation and normalization utilities
- Concurrency control via ETag-based versioning
- Type-safe TypeScript implementation
- Extensive test coverage
- Well-documented codebase

#### Technical Details

**Dependencies**
- express: ^4.18.2
- cors: ^2.8.5
- obsidian: latest

**Build**
- TypeScript 4.7.4
- esbuild 0.17.3
- Jest 30.2.0 for testing

**Compatibility**
- Obsidian minimum version: 0.15.0
- Desktop only (not available on mobile)
- Protocol: MCP 2024-11-05

#### Known Limitations

- Desktop only (requires Node.js HTTP server)
- Single vault per server instance
- HTTP only (no WebSocket support)
- Localhost-only (no SSL/TLS)
- Excalidraw support limited to uncompressed format (compressed format planned)

---

## Future Roadmap

### Planned Features

**Resources API**
- Expose notes as MCP resources
- Real-time resource updates

**Prompts API**
- Templated prompts for common operations
- Custom prompt registration

**Batch Operations**
- Multiple operations in single request
- Transactional batching

**WebSocket Transport**
- Real-time updates and notifications
- Bidirectional communication

**Enhanced Graph API**
- Graph visualization data
- Advanced graph traversal

**Tag & Canvas APIs**
- Query and manage tags
- Manipulate canvas files

**Dataview Integration**
- Query vault using Dataview syntax
- Advanced data queries

**Performance Enhancements**
- Indexing for faster searches
- Caching for frequently accessed notes
- Streaming for large files

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Report bugs and request features]
- Documentation: See README.md and CLAUDE.md
- Include version number (1.0.0) in bug reports

---

## Credits

- MCP Protocol: https://modelcontextprotocol.io
- Obsidian API: https://github.com/obsidianmd/obsidian-api
- Built with TypeScript, Express.js, and dedication to quality
