# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that exposes vault operations via the Model Context Protocol (MCP) over HTTP. It runs an Express server within Obsidian to enable AI assistants and other MCP clients to interact with the vault programmatically.

## Development Commands

### Building and Development
```bash
npm install              # Install dependencies
npm run dev             # Watch mode for development (auto-rebuild on changes)
npm run build           # Production build (runs type check + esbuild)
```

### Testing
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Type Checking
The build command includes TypeScript type checking via `tsc -noEmit -skipLibCheck`.

### Installing in Obsidian
After building, the plugin outputs `main.js` to the root directory. To test in Obsidian:
1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/obsidian-mcp-server/` directory
2. Reload Obsidian (Ctrl/Cmd + R in dev mode)
3. Enable the plugin in Settings → Community Plugins

## Architecture

### High-Level Structure

The codebase follows a layered architecture:

```
src/
├── main.ts                    # Plugin entry point (MCPServerPlugin)
├── server/                    # HTTP server layer
│   ├── mcp-server.ts         # Express server + MCP protocol handler
│   ├── routes.ts             # Route setup
│   └── middleware.ts         # Auth, CORS, origin validation
├── tools/                     # MCP tool implementations
│   ├── index.ts              # ToolRegistry - routes tool calls
│   ├── note-tools.ts         # File operations (CRUD)
│   └── vault-tools.ts        # Vault operations (search, list, metadata)
├── utils/                     # Shared utilities
│   ├── path-utils.ts         # Path validation and normalization
│   ├── frontmatter-utils.ts  # YAML frontmatter parsing
│   ├── search-utils.ts       # Search and regex utilities
│   ├── link-utils.ts         # Wikilink resolution
│   ├── waypoint-utils.ts     # Waypoint plugin integration
│   ├── glob-utils.ts         # Glob pattern matching
│   ├── version-utils.ts      # ETag/versionId for concurrency control
│   └── error-messages.ts     # Consistent error messaging
├── ui/                        # User interface components
│   ├── notifications.ts      # NotificationManager for tool call notifications
│   └── notification-history.ts # History modal
├── types/                     # TypeScript type definitions
│   ├── mcp-types.ts          # MCP protocol types
│   └── settings-types.ts     # Plugin settings
└── settings.ts                # Settings UI tab
```

### Key Components

#### 1. MCPServerPlugin (src/main.ts)
- Main plugin class that extends Obsidian's `Plugin`
- Lifecycle management: starts/stops HTTP server
- Registers commands and ribbon icons
- Manages plugin settings and notification system

#### 2. MCPServer (src/server/mcp-server.ts)
- Wraps Express HTTP server
- Handles JSON-RPC 2.0 requests per MCP protocol
- Routes to ToolRegistry for tool execution
- Supports methods: `initialize`, `tools/list`, `tools/call`, `ping`
- Binds to `127.0.0.1` only for security

#### 3. ToolRegistry (src/tools/index.ts)
- Central registry of all available MCP tools
- Dispatches tool calls to NoteTools or VaultTools
- Manages NotificationManager integration
- Returns tool definitions with JSON schemas

#### 4. NoteTools (src/tools/note-tools.ts)
- File-level CRUD operations
- Tools: `read_note`, `create_note`, `update_note`, `delete_note`, `update_frontmatter`, `update_sections`, `rename_file`, `read_excalidraw`
- Implements concurrency control via versionId/ETag system
- Handles conflict strategies for creates

#### 5. VaultTools (src/tools/vault-tools.ts)
- Vault-wide operations
- Tools: `search`, `list`, `stat`, `exists`, `get_vault_info`, `search_waypoints`, `get_folder_waypoint`, `is_folder_note`, `validate_wikilinks`, `resolve_wikilink`, `backlinks`
- Advanced search with regex and glob filtering
- Wikilink resolution using Obsidian's MetadataCache

### Important Patterns

#### Path Handling
- All paths are vault-relative (no leading slash)
- PathUtils validates paths against leading/trailing slashes, absolute paths, and `..` traversal
- Path normalization handles cross-platform differences

#### Concurrency Control
- VersionUtils generates ETags based on file mtime + size
- `ifMatch` parameter on write operations enables optimistic locking
- Prevents lost updates when multiple clients modify the same file

#### Error Handling
- ErrorMessages utility provides consistent error formatting
- All tool results return `CallToolResult` with structured content
- `isError: true` flag indicates failures

#### Frontmatter
- FrontmatterUtils parses YAML frontmatter using regex
- `update_frontmatter` enables surgical metadata updates without full file rewrites
- Reduces race conditions vs full content updates

#### Wikilinks
- LinkUtils handles wikilink resolution via Obsidian's MetadataCache
- Supports heading links (`[[note#heading]]`) and aliases (`[[note|alias]]`)
- `validate_wikilinks` checks all links in a note
- `backlinks` uses MetadataCache for reverse link lookup

#### Search
- SearchUtils implements multi-file search with regex support
- GlobUtils provides file filtering via glob patterns
- Returns structured results with line/column positions and snippets

## Testing

Tests are located in `tests/` and use Jest with ts-jest. The test setup includes:
- Mock Obsidian API in `tests/__mocks__/obsidian.ts`
- Test files follow `*.test.ts` naming convention
- Coverage excludes type definition files

## MCP Protocol Implementation

The server implements MCP version `2024-11-05`:
- JSON-RPC 2.0 over HTTP POST to `/mcp` endpoint
- Capabilities: `{ tools: {} }`
- All tool schemas defined in ToolRegistry.getToolDefinitions()
- Tool call results use MCP's content array format with text/image types

## Security Model

- Server binds to `127.0.0.1` only (no external access)
- Host header validation prevents DNS rebinding attacks
- CORS fixed to localhost-only origins (`http(s)://localhost:*`, `http(s)://127.0.0.1:*`)
- **Mandatory authentication** via Bearer token (auto-generated on first install)
- API keys encrypted using Electron's safeStorage API (system keychain: macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Encryption falls back to plaintext on systems without secure storage (e.g., Linux without keyring)

## Settings

MCPPluginSettings (src/types/settings-types.ts):
- `port`: HTTP server port (default: 3000)
- `autoStart`: Start server on plugin load
- `apiKey`: Required authentication token (encrypted at rest using Electron's safeStorage)
- `enableAuth`: Always true (kept for backward compatibility during migration)
- `notificationsEnabled`: Show tool call notifications in Obsidian UI
- `showParameters`: Include parameters in notifications
- `notificationDuration`: Auto-dismiss time for notifications
- `logToConsole`: Log tool calls to console

**Removed settings** (as of implementation plan 2025-10-25):
- `enableCORS`: CORS is now always enabled with fixed localhost-only policy
- `allowedOrigins`: Origin allowlist removed, only localhost origins allowed

## Waypoint Plugin Integration

The plugin has special support for the Waypoint community plugin:
- Waypoints are comment blocks: `%% Begin Waypoint %% ... %% End Waypoint %%`
- Used to auto-generate folder indexes
- `search_waypoints`: Find all waypoints in vault
- `get_folder_waypoint`: Extract waypoint from specific folder note
- `is_folder_note`: Detect folder notes by basename match or waypoint presence

## Development Guidelines

### Code Organization Best Practices

- **Keep `main.ts` minimal** - Focus only on plugin lifecycle (onload, onunload, command registration)
- **Delegate feature logic to separate modules** - All functionality lives in dedicated modules under `src/`
- **Split large files** - If any file exceeds ~200-300 lines, break it into smaller, focused modules
- **Use clear module boundaries** - Each file should have a single, well-defined responsibility
- **Use TypeScript strict mode** - The project uses `"strict": true`
- **Prefer async/await** over promise chains
- **Handle errors gracefully** - Provide helpful error messages to users

### Performance Considerations

- **Keep startup light** - Defer heavy work until needed; avoid long-running tasks during `onload`
- **Batch disk access** - Avoid excessive vault scans
- **Debounce/throttle expensive operations** - Especially for file system event handlers
- **Be mindful of memory** on mobile platforms (though this plugin is desktop-only)

### Platform Compatibility

This plugin is **desktop-only** (`isDesktopOnly: true`) because it uses Node.js HTTP server (Express). If extending to mobile:
- Avoid Node/Electron APIs
- Don't assume desktop-only behavior
- Test on iOS and Android

### Security and Privacy

- **Default to local/offline operation** - This plugin already binds to localhost only
- **No hidden telemetry** - Don't collect analytics without explicit opt-in
- **Never execute remote code** - Don't fetch and eval scripts
- **Minimize scope** - Read/write only what's necessary inside the vault
- **Do not access files outside the vault**
- **Respect user privacy** - Don't collect vault contents without consent
- **Clean up resources** - Use `this.register*` helpers so the plugin unloads safely

### UI/UX Guidelines

- **Use sentence case** for headings, buttons, and titles
- **Use bold** to indicate literal UI labels in documentation
- **Use arrow notation** for navigation: "Settings → Community plugins"
- **Prefer "select"** for user interactions
- Keep in-app strings short, consistent, and free of jargon

### Versioning and Releases

- Use **Semantic Versioning** (SemVer) for `version` in `manifest.json`
- Update `versions.json` to map plugin version → minimum Obsidian app version
- **Never change the plugin `id`** after release
- **Never rename command IDs** after release - they are stable API
- Create GitHub releases with tags that **exactly match** `manifest.json` version (no `v` prefix)
- Attach required assets to releases: `manifest.json`, `main.js`, `styles.css`

### Build Artifacts

- **Never commit build artifacts** to version control (`main.js`, `node_modules/`, etc.)
- All TypeScript must bundle into a single `main.js` file via esbuild
- Release artifacts must be at the top level of the plugin folder

### Command Stability

- **Add commands with stable IDs** - don't rename once released
- Commands are registered in `src/main.ts` with IDs like `start-mcp-server`, `stop-mcp-server`, etc.

## References

- **Obsidian API docs**: https://docs.obsidian.md
- **Developer policies**: https://docs.obsidian.md/Developer+policies
- **Plugin guidelines**: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- **Sample plugin**: https://github.com/obsidianmd/obsidian-sample-plugin
- **Manifest validation**: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml
