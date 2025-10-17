# Troubleshooting Guide

## Plugin Won't Load

### Check Required Files

Ensure these files exist in the plugin directory:
```bash
ls -la /path/to/vault/.obsidian/plugins/obsidian-mcp-server/
```

Required files:
- ✅ `main.js` (should be ~846KB)
- ✅ `manifest.json`
- ✅ `styles.css`

### Check Obsidian Console

1. Open Obsidian
2. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. Go to the **Console** tab
4. Look for errors related to `obsidian-mcp-server`

Common errors:
- **Module not found**: Rebuild the plugin with `npm run build`
- **Syntax error**: Check the build completed successfully
- **Permission error**: Ensure files are readable

### Verify Plugin is Enabled

1. Go to **Settings** → **Community Plugins**
2. Find **MCP Server** in the list
3. Ensure the toggle is **ON**
4. If not visible, click **Reload** or restart Obsidian

### Check Manifest

Verify `manifest.json` contains:
```json
{
  "id": "obsidian-mcp-server",
  "name": "MCP Server",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Exposes Obsidian vault operations via Model Context Protocol (MCP) over HTTP",
  "author": "",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

### Rebuild from Source

If the plugin still won't load:

```bash
cd /path/to/vault/.obsidian/plugins/obsidian-mcp-server
npm install
npm run build
```

Then restart Obsidian.

### Check Obsidian Version

This plugin requires:
- **Minimum Obsidian version**: 0.15.0
- **Desktop only** (not mobile)

Check your version:
1. **Settings** → **About**
2. Look for "Current version"

### Verify Node.js Built-ins

The plugin uses Node.js modules (http, express). Ensure you're running on desktop Obsidian, not mobile.

## Plugin Loads But Shows No Info

### Check Plugin Description

If the plugin appears in the list but shows no description:

1. Check `manifest.json` has a `description` field
2. Restart Obsidian
3. Try disabling and re-enabling the plugin

### Check for Errors on Load

1. Open Console (`Ctrl+Shift+I`)
2. Disable the plugin
3. Re-enable it
4. Watch for errors in console

## Server Won't Start

### Port Already in Use

**Error**: "Port 3000 is already in use"

**Solution**:
1. Go to **Settings** → **MCP Server**
2. Change port to something else (e.g., 3001, 3002)
3. Try starting again

Or find and kill the process using port 3000:
```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Module Not Found

**Error**: "Cannot find module 'express'" or similar

**Solution**:
```bash
cd /path/to/vault/.obsidian/plugins/obsidian-mcp-server
npm install
npm run build
```

Restart Obsidian.

### Permission Denied

**Error**: "EACCES" or "Permission denied"

**Solution**:
- Try a different port (above 1024)
- Check firewall settings
- Run Obsidian with appropriate permissions

## Server Starts But Can't Connect

### Check Server is Running

Look at the status bar (bottom of Obsidian):
- Should show: `MCP: Running (3000)`
- If shows: `MCP: Stopped` - server isn't running

### Test Health Endpoint

Open browser or use curl:
```bash
curl http://127.0.0.1:3000/health
```

Should return:
```json
{"status":"ok","timestamp":1234567890}
```

### Check Localhost Binding

The server only binds to `127.0.0.1` (localhost). You cannot connect from:
- Other computers on the network
- External IP addresses
- Public internet

This is by design for security.

### Test MCP Endpoint

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'
```

Should return:
```json
{"jsonrpc":"2.0","id":1,"result":{}}
```

## Authentication Issues

### Wrong API Key

**Error**: 401 Unauthorized

**Solution**:
- Check API key in settings matches what you're sending
- Ensure format is: `Authorization: Bearer YOUR_API_KEY`
- Try disabling authentication temporarily to test

### CORS Errors

**Error**: "CORS policy" in browser console

**Solution**:
1. Go to **Settings** → **MCP Server**
2. Ensure "Enable CORS" is **ON**
3. Check "Allowed Origins" includes your origin or `*`
4. Restart server

## Tools Not Working

### Path Errors

**Error**: "Note not found"

**Solution**:
- Use relative paths from vault root
- Example: `folder/note.md` not `/full/path/to/note.md`
- Don't include vault name in path

### Permission Errors

**Error**: "EACCES" or "Permission denied"

**Solution**:
- Check file permissions in vault
- Ensure Obsidian has file system access
- Check vault is not read-only

### Search Returns Nothing

**Issue**: `search_notes` returns no results

**Solution**:
- Check query is not empty
- Search is case-insensitive
- Searches both filename and content
- Try simpler query

## Getting Help

### Collect Debug Information

When reporting issues, include:

1. **Obsidian version**: Settings → About
2. **Plugin version**: Check manifest.json
3. **Operating System**: Windows/Mac/Linux
4. **Error messages**: From console (Ctrl+Shift+I)
5. **Steps to reproduce**: What you did before the error

### Console Logs

Enable detailed logging:
1. Open Console (`Ctrl+Shift+I`)
2. Try the failing operation
3. Copy all red error messages
4. Include in your report

### Test Client Output

Run the test client and include output:
```bash
node test-client.js
```

### Check GitHub Issues

Before creating a new issue:
1. Search existing issues
2. Check if it's already reported
3. See if there's a workaround

## Common Solutions

### "Have you tried turning it off and on again?"

Seriously, this fixes many issues:
1. Stop the server
2. Disable the plugin
3. Restart Obsidian
4. Enable the plugin
5. Start the server

### Clean Reinstall

If all else fails:
```bash
# Backup settings first!
cd /path/to/vault/.obsidian/plugins
rm -rf obsidian-mcp-server
# Re-install plugin
cd obsidian-mcp-server
npm install
npm run build
```

Restart Obsidian.

### Reset Settings

If settings are corrupted:
1. Stop server
2. Disable plugin
3. Delete `/path/to/vault/.obsidian/plugins/obsidian-mcp-server/data.json`
4. Re-enable plugin
5. Reconfigure settings

## Still Having Issues?

1. Check the README.md for documentation
2. Review QUICKSTART.md for setup steps
3. Run the test client to verify server
4. Check Obsidian console for errors
5. Try a clean rebuild
6. Create a GitHub issue with debug info
