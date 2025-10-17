# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

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
