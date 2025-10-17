# Quick Start Guide

## 🚀 Getting Started

### 1. Enable the Plugin

1. Open Obsidian
2. Go to **Settings** → **Community Plugins**
3. Find **MCP Server** in the list
4. Toggle it **ON**

### 2. Start the Server

**Option A: Via Ribbon Icon**
- Click the server icon (📡) in the left sidebar

**Option B: Via Command Palette**
- Press `Ctrl/Cmd + P`
- Type "Start MCP Server"
- Press Enter

**Option C: Auto-start**
- Go to **Settings** → **MCP Server**
- Enable "Auto-start server"
- Server will start automatically when Obsidian launches

### 3. Verify Server is Running

Check the status bar at the bottom of Obsidian:
- **Running**: `MCP: Running (3000)`
- **Stopped**: `MCP: Stopped`

Or visit: http://127.0.0.1:3000/health

### 4. Test the Connection

Run the test client:
```bash
node test-client.js
```

Expected output:
```
🧪 Testing Obsidian MCP Server

Server: http://127.0.0.1:3000/mcp
API Key: None

1️⃣  Testing initialize...
✅ Initialize successful
   Server: obsidian-mcp-server 1.0.0
   Protocol: 2024-11-05

2️⃣  Testing tools/list...
✅ Tools list successful
   Found 7 tools:
   - read_note: Read the content of a note from the Obsidian vault
   - create_note: Create a new note in the Obsidian vault
   ...

🎉 All tests passed!
```

## 🔧 Configuration

### Basic Settings

Go to **Settings** → **MCP Server**:

| Setting | Default | Description |
|---------|---------|-------------|
| Port | 3000 | HTTP server port |
| Auto-start | Off | Start server on Obsidian launch |
| Enable CORS | On | Allow cross-origin requests |
| Allowed Origins | * | Comma-separated list of allowed origins |

### Security Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Authentication | Off | Require API key for requests |
| API Key | (empty) | Bearer token for authentication |

## 🔌 Connect an MCP Client

### Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add:
```json
{
  "mcpServers": {
    "obsidian": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

Restart Claude Desktop.

### Other MCP Clients

Use the endpoint: `http://127.0.0.1:3000/mcp`

## 📝 Available Tools

Once connected, you can use these tools:

- **read_note** - Read note content
- **create_note** - Create a new note
- **update_note** - Update existing note
- **delete_note** - Delete a note
- **search_notes** - Search vault by query
- **list_notes** - List all notes or notes in a folder
- **get_vault_info** - Get vault metadata

## 🔒 Using Authentication

1. Enable authentication in settings
2. Set an API key (e.g., `my-secret-key-123`)
3. Include in requests:

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer my-secret-key-123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Or in Claude Desktop config:
```json
{
  "mcpServers": {
    "obsidian": {
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer my-secret-key-123"
      }
    }
  }
}
```

## ❓ Troubleshooting

### Server won't start

**Error: Port already in use**
- Change the port in settings
- Or stop the process using port 3000

**Error: Cannot find module**
- Run `npm install` in the plugin directory
- Rebuild with `npm run build`

### Cannot connect from client

**Check server is running**
- Look at status bar: should show "MCP: Running (3000)"
- Visit http://127.0.0.1:3000/health

**Check firewall**
- Ensure localhost connections are allowed
- Server only binds to 127.0.0.1 (localhost)

**Check authentication**
- If enabled, ensure API key is correct
- Check Authorization header format

### Tools not working

**Path errors**
- Use relative paths from vault root
- Example: `folder/note.md` not `/full/path/to/note.md`

**Permission errors**
- Ensure Obsidian has file system access
- Check vault is not read-only

## 🎯 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the [MCP Protocol Documentation](https://modelcontextprotocol.io)
- Check example requests in the README
- Customize settings for your workflow

## 💡 Tips

- Use the ribbon icon for quick server toggle
- Enable auto-start for seamless integration
- Use authentication for additional security
- Monitor the status bar for server state
- Check Obsidian console (Ctrl+Shift+I) for detailed logs
