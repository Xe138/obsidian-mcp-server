# Obsidian MCP Server Plugin

An Obsidian plugin that makes your vault accessible via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) over HTTP. This allows AI assistants and other MCP clients to interact with your Obsidian vault programmatically.

## Features

- **HTTP MCP Server**: Runs an HTTP server implementing the MCP protocol
- **Vault Operations**: Exposes tools for reading, creating, updating, and deleting notes
- **Search Functionality**: Search notes by content or filename
- **Security**: Localhost-only binding, mandatory authentication, encrypted API key storage
- **Easy Configuration**: Simple settings UI with server status and controls

## Available MCP Tools

### Note Operations
- `read_note` - Read the content of a note with optional frontmatter parsing
- `create_note` - Create a new note with conflict handling strategies
- `update_note` - Update an existing note (full content replacement)
- `delete_note` - Delete a note (soft delete to .trash or permanent)
- `update_frontmatter` - Update frontmatter fields without modifying note content
- `update_sections` - Update specific sections of a note by line range
- `rename_file` - Rename or move a file with automatic wikilink updates
- `read_excalidraw` - Read Excalidraw drawing files with metadata extraction (currently limited to uncompressed format; compressed format support is planned)

### Vault Operations
- `search` - Search vault with advanced filtering, regex support, and snippet extraction
- `search_waypoints` - Find all Waypoint plugin markers in the vault
- `list` - List files and/or directories with advanced filtering and pagination
- `stat` - Get detailed metadata for a file or folder
- `exists` - Check if a file or folder exists at a specific path
- `get_vault_info` - Get vault metadata (name, path, file counts, total size)

### Waypoint Integration
- `get_folder_waypoint` - Get Waypoint block from a folder note
- `is_folder_note` - Check if a note is a folder note

### Link Management
- `validate_wikilinks` - Validate all wikilinks in a note and report unresolved links
- `resolve_wikilink` - Resolve a single wikilink from a source note to its target path
- `backlinks` - Get all backlinks to a note with optional unlinked mentions

## Installation

### From Source

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone <repository-url> obsidian-mcp-server
   cd obsidian-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian Settings → Community Plugins

## Configuration

1. Open Obsidian Settings → MCP Server
2. Configure the following options:
   - **Port**: HTTP server port (default: 3000)
   - **Auto-start**: Automatically start server on Obsidian launch
   - **API Key**: Auto-generated, encrypted authentication token (can regenerate in settings)

3. Click "Start Server" or use the ribbon icon to toggle the server

### Authentication

An API key is automatically generated when you first install the plugin and is encrypted using your system's secure credential storage (macOS Keychain, Windows Credential Manager, Linux Secret Service where available).

## Usage

### Starting the Server

- **Via Ribbon Icon**: Click the server icon in the left sidebar
- **Via Command Palette**: Run "Start MCP Server"
- **Auto-start**: Enable in settings to start automatically

### Connecting an MCP Client

The server exposes an MCP endpoint at:
```
http://127.0.0.1:3000/mcp
```

Example client configuration (e.g., for Claude Desktop):
```json
{
  "mcpServers": {
    "obsidian": {
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Get your API key from the plugin settings. All requests must include the Bearer token:
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Example MCP Requests

### Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "example-client",
      "version": "1.0.0"
    }
  }
}
```

### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Read a Note
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_note",
    "arguments": {
      "path": "folder/note.md"
    }
  }
}
```

### Create a Note
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_note",
    "arguments": {
      "path": "new-note.md",
      "content": "# New Note\n\nThis is the content."
    }
  }
}
```

### Search Notes
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "search term"
    }
  }
}
```

## Security Considerations

The plugin implements multiple security layers:

- **Network binding**: Server binds to `127.0.0.1` only (no external access)
- **Host header validation**: Prevents DNS rebinding attacks
- **CORS policy**: Fixed localhost-only policy allows web-based clients on `localhost` or `127.0.0.1` (any port)
- **Mandatory authentication**: All requests require Bearer token
- **Encrypted storage**: API keys encrypted using system keychain when available
- **Desktop Only**: This plugin only works on desktop (not mobile) due to HTTP server requirements

## Development

### Building from Source

```bash
npm install
npm run dev    # Watch mode for development
npm run build  # Production build
```
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```