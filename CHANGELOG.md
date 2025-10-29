# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
