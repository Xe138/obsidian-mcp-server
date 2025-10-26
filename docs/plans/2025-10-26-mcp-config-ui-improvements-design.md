# MCP Configuration UI Improvements - Design Document

**Date:** 2025-10-26
**Status:** Implemented
**Author:** Design brainstorming session

## Overview

Improve the MCP configuration UI in the Obsidian plugin settings to make it easier for users to configure different MCP clients. The current configuration is nested under Authentication and only shows a single Windsurf example. This design adds tab-based navigation to show client-specific configurations that are complete and ready to copy with a single click.

## Goals

- **Ease of use:** Single-click copy of complete, ready-to-paste configurations
- **Multi-client support:** Provide configurations for Windsurf and Claude Code
- **Clear guidance:** Show file location and usage instructions inline
- **Better organization:** Combine Authentication and MCP Configuration into one collapsible section without nesting

## Success Criteria

- Each config is complete with API key and port pre-populated
- One-click copy button for immediate paste into the client's config location
- Clear indication of where each config should be pasted
- Tab interface allows easy switching between client configs

## Design

### Overall Structure

**Current state:** MCP Configuration is nested inside Authentication (settings.ts:204-255)

**New structure:**
```
Settings Page
├── Server Status (unchanged)
├── Auto-start setting (unchanged)
├── Port setting (unchanged)
├── Authentication & Configuration ← Renamed from "Authentication"
│   ├── API Key Management (unchanged)
│   ├── MCP Client Configuration ← No longer nested, same level as API Key
│   │   ├── Tab: Windsurf
│   │   └── Tab: Claude Code
└── UI Notifications (unchanged)
```

**Key changes:**
1. Rename "Authentication" section to "Authentication & Configuration"
2. Remove the nested `<details>` element for "MCP Client Configuration"
3. Place "MCP Client Configuration" at the same level as "API Key Management"
4. Add tab interface to switch between client configs

### Tab Interface Design

**Visual structure:**
```
┌─────────────────────────────────────────────────┐
│ [Windsurf] [Claude Code]                        │ ← Tab buttons
├─────────────────────────────────────────────────┤
│ Configuration file location:                    │
│ ~/.windsurf/config.json                         │ ← File path
│                                                  │
│ [📋 Copy Configuration]                         │ ← Copy button
│                                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ {                                           ││
│ │   "mcpServers": {                           ││
│ │     "obsidian": { ... }                     ││ ← JSON config
│ │   }                                          ││
│ │ }                                            ││
│ └─────────────────────────────────────────────┘│
│                                                  │
│ After copying, paste into the config file       │ ← Usage note
│ and restart the MCP client.                     │
└─────────────────────────────────────────────────┘
```

**Tab switching:**
- Button-based tabs (not native `<details>` elements)
- Only one tab's content visible at a time
- Active tab gets visual highlight (background color + border)
- Clicking a tab switches the displayed configuration

**Content for each tab:**
1. Configuration file location path
2. Copy button
3. Complete JSON configuration (pre-formatted, monospace)
4. Brief usage note

### Client-Specific Configurations

#### 1. Windsurf Tab

**File location:** `~/.windsurf/config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "obsidian": {
      "serverUrl": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer <actual-api-key>"
      }
    }
  }
}
```

**Usage note:** "After copying, paste into the config file and restart Windsurf."

**Dynamic values:**
- Port: `this.plugin.settings.port`
- API Key: `this.plugin.settings.apiKey`

#### 2. Claude Code Tab

**File location:** `~/.claude.json`

**Configuration:**
```json
{
  "mcpServers": {
    "obsidian": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer <actual-api-key>"
      }
    }
  }
}
```

**Usage note:** "After copying, paste into the config file and restart Claude Code."

**Dynamic values:**
- Port: `this.plugin.settings.port`
- API Key: `this.plugin.settings.apiKey`

**Key difference from Windsurf:**
- Adds `"type": "http"` field
- Uses same URL format as Windsurf

#### Note on Claude Desktop

Claude Desktop configuration is omitted for now as it has not been tested with HTTP transport.

## Implementation Details

### HTML/CSS Structure

**Tab buttons:**
- Container with `display: flex` for horizontal layout
- Active tab styling: distinct background + border-bottom
- Inactive tabs: subtle hover effect
- Consistent spacing and padding

**Content area:**
- Consistent padding and background color
- File path in monospace font with muted color
- Pre-formatted text block for JSON with syntax preservation
- Copy button with icon for clear affordance

### Component State

**Tab state management:**
- Add `activeConfigTab` property to `MCPServerSettingTab` class
- Type: `'windsurf' | 'claude-code'`
- Default: `'windsurf'`
- No need to persist in settings (ephemeral UI state)

**Rendering strategy:**
- Re-render only the config content area when tab changes
- Keep tab buttons static
- Avoid full page re-render for tab switches

### Configuration Generation

**Helper method:**
```typescript
generateConfigForClient(client: 'windsurf' | 'claude-code'): {
  filePath: string;
  config: object;
  usageNote: string;
}
```

**Returns:**
- `filePath`: Configuration file location for the client
- `config`: Complete JSON configuration object
- `usageNote`: Brief usage instructions

**Dynamic interpolation:**
- API key from `this.plugin.settings.apiKey`
- Port from `this.plugin.settings.port`
- Generated at render time to always reflect current settings

## Migration Notes

### Code Changes in settings.ts

1. **Line 146-153:** Rename section
   - Change "Authentication" to "Authentication & Configuration"

2. **Line 204-211:** Remove nested details
   - Remove the `<details>` wrapper for "MCP Client Configuration"
   - Keep "MCP Client Configuration" as a heading/label

3. **Line 213-255:** Replace single config with tabs
   - Remove current single Windsurf config display
   - Add tab button container
   - Add tab content rendering logic
   - Implement tab switching

4. **Add helper method:** `generateConfigForClient()`
   - Generate client-specific configurations
   - Return structured data for rendering

5. **Add state property:** `activeConfigTab`
   - Track which tab is selected
   - Default to 'windsurf'

### Backward Compatibility

- No breaking changes to settings structure
- No changes to stored settings (API key, port, etc.)
- Only UI presentation changes

## Testing Considerations

- Verify both tab configs copy correctly to clipboard
- Test with different API keys and ports
- Ensure tab switching works smoothly
- Verify JSON formatting is preserved in clipboard
- Test that configs work when pasted into actual client config files

## Future Enhancements

- Add Claude Desktop configuration once HTTP transport is tested
- Add validation to check if config files exist
- Add "Open config file" button that launches the file in system editor
- Add config file templates for other MCP clients
- Show detected MCP clients on the system
