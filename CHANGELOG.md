# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

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
| 1.0.0 | 2025-10-16 | Initial release |

---

## Upgrade Guide

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
