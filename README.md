# Obsidian MCP Server Plugin

An Obsidian plugin that makes your vault accessible via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) over HTTP. This allows AI assistants and other MCP clients to interact with your Obsidian vault programmatically.

**Version:** 1.0.0 | **Tested with:** Obsidian v1.9.14 | **License:** MIT

> **⚠️ Security Notice**
>
> This plugin runs an HTTP server that exposes your vault's contents to MCP clients (like AI assistants). While the server is localhost-only with mandatory authentication, be aware that any client with your API key can read, create, modify, and delete files in your vault. Only share your API key with trusted applications.

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

### From Obsidian Community Plugins

> **Note:** This plugin is awaiting approval for the Community Plugins directory. Once approved, it will be available for one-click installation.

When available:
1. Open Obsidian Settings → Community Plugins
2. Select **Browse** and search for "MCP Server"
3. Click **Install**
4. Enable the plugin

### From Source

**Prerequisites:** Node.js and npm must be installed on your system.

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone https://github.com/Xe138/obsidian-mcp-server.git obsidian-mcp-server
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

**To get your API key:**
1. Open Obsidian Settings → MCP Server
2. Find the **API Key** field in the Authentication section
3. Click the copy icon to copy your API key to the clipboard
4. Replace `YOUR_API_KEY` in the examples below with your actual key

All requests must include the Bearer token:
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

## Troubleshooting

### Server won't start

**Port already in use:**
- Another application is using port 3000
- Change the port in Settings → MCP Server → Port
- Common alternatives: 3001, 8080, 8000

**Permission denied:**
- On Linux/macOS, ports below 1024 require root privileges
- Use a port number above 1024 (default 3000 is fine)

### Authentication failures

**Invalid API key:**
- Copy the API key again from Settings → MCP Server
- Ensure you're including the full key with no extra spaces
- Try regenerating the API key using the "Regenerate API Key" button

**401 Unauthorized:**
- Check that the `Authorization` header is properly formatted: `Bearer YOUR_API_KEY`
- Verify there's a space between "Bearer" and the key

### Connection issues

**Cannot connect to server:**
- Verify the server is running (check the ribbon icon or status in settings)
- Ensure you're using `http://127.0.0.1:3000/mcp` (not `localhost` on some systems)
- Check that no firewall is blocking local connections

**CORS errors:**
- The server only accepts requests from localhost origins
- If using a web-based client, ensure it's running on `localhost` or `127.0.0.1`

### General issues

**Plugin not loading:**
- Ensure you've enabled the plugin in Settings → Community Plugins
- Try disabling and re-enabling the plugin
- Check the Developer Console (Ctrl+Shift+I) for error messages

**Changes not taking effect:**
- Reload Obsidian (Ctrl/Cmd + R)
- If building from source, ensure `npm run build` completed successfully

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

## Contributing

Contributions are welcome! If you'd like to contribute to this plugin:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub:

**GitHub Issues:** https://github.com/Xe138/obsidian-mcp-server/issues

When reporting bugs, please include:
- Obsidian version
- Plugin version
- Steps to reproduce the issue
- Any error messages from the Developer Console (Ctrl+Shift+I)

## Support

If you find this plugin helpful, consider supporting its development:

**Buy Me a Coffee:** https://buymeacoffee.com/xe138

## License

This project is licensed under the MIT License. See the repository for full license details.