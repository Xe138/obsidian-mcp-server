# Obsidian MCP Server Plugin

An Obsidian plugin that exposes your vault operations via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) over HTTP. This allows AI assistants and other MCP clients to interact with your Obsidian vault programmatically.

## Features

- **HTTP MCP Server**: Runs an HTTP server implementing the MCP protocol
- **Vault Operations**: Exposes tools for reading, creating, updating, and deleting notes
- **Search Functionality**: Search notes by content or filename
- **Security**: Localhost-only binding, optional authentication, CORS configuration
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
   - **Enable CORS**: Allow cross-origin requests
   - **Allowed Origins**: Comma-separated list of allowed origins
   - **Enable Authentication**: Require API key for requests
   - **API Key**: Bearer token for authentication

3. Click "Start Server" or use the ribbon icon to toggle the server

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
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Using with Authentication

If authentication is enabled, include the API key in requests:
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

- **Localhost Only**: The server binds to `127.0.0.1` to prevent external access
- **Origin Validation**: Validates request origins to prevent DNS rebinding attacks
- **Optional Authentication**: Use API keys to restrict access
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

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint ./src/`

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

## API Documentation

See https://github.com/obsidianmd/obsidian-api
