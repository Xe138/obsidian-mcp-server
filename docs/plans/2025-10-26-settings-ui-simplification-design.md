# Settings UI Simplification Design

**Date:** 2025-10-26
**Status:** Approved

## Overview

Streamline the MCP Server settings UI to reduce visual clutter while preserving all functionality. Use progressive disclosure (collapsible sections) to show only essential controls by default, with advanced settings available on-demand.

## Goals

- Remove encryption-related messaging that clutters the UI
- Remove redundant network security disclosure
- Collapse advanced sections (Authentication, UI Notifications) by default
- Simplify all descriptive text
- Improve information hierarchy with Server Status at top

## Design Decisions

### Structure Changes

**New UI hierarchy:**
```
MCP Server Settings
├── Server Status (h3) - MOVED TO TOP
│   ├── Status indicator
│   └── Control buttons
├── Auto-start server [toggle]
├── Port [text input]
├── ▶ Authentication [collapsible, COLLAPSED by default]
│   ├── API Key Management
│   ├── [Copy Key] [Regenerate Key] buttons
│   ├── Key display
│   └── ▶ MCP Client Configuration [nested collapsible, COLLAPSED]
└── ▶ UI Notifications [collapsible, COLLAPSED by default]
    └── [Conditional notification settings]
```

**Default collapsed view shows only:**
- Server Status with controls
- Auto-start toggle
- Port setting
- ▶ Authentication (collapsed)
- ▶ UI Notifications (collapsed)

### Removals

**Removed elements:**
1. Network security disclosure box (lines 22-30)
   - "⚠️ This plugin runs a local HTTP server..."
2. Encryption description paragraph (lines 64-69)
   - "Your API key is encrypted and stored securely..."
3. Encryption status indicator (lines 72-79)
   - "🔒 Encryption: Available" / "⚠️ Encryption: Unavailable"
4. "Connection Information" section (lines 213-226)
   - Redundant with MCP config JSON

### Progressive Disclosure Implementation

**Use HTML `<details>` and `<summary>` elements:**
- Native browser functionality (no JavaScript needed)
- Accessible (keyboard navigation, screen readers)
- Auto-managed expand/collapse indicators (▶/▼)
- Session-persistent state

**Collapsible sections:**
1. **Authentication** - collapsed by default
   - Contains API key management and MCP config
2. **MCP Client Configuration** - nested collapsible, collapsed by default
   - Contains JSON config snippet
3. **UI Notifications** - collapsed by default
   - Contains all notification settings

### Text Simplification

**Updated descriptions:**

| Setting | Current | Simplified |
|---------|---------|------------|
| Auto-start | "Automatically start the MCP server when Obsidian launches" | "Start server when Obsidian launches" |
| Port | "Port number for the HTTP server (requires restart)" | "Server port (restart required)" |
| API Key | "Use this key in the Authorization header as Bearer token" | "Use as Bearer token in Authorization header" |
| Enable notifications | "Show notifications when MCP tools are called (request only, no completion notifications)" | "Show when MCP tools are called" |
| Duration | "How long notifications stay visible (milliseconds)" | "Duration in milliseconds" |
| Log to console | "Also log tool calls to browser console" | "Log tool calls to console" |
| MCP config intro | "Add this configuration to your MCP client (e.g., Claude Desktop, Cline):" | "Add to your MCP client config:" |

**Status messages:**

| Type | Current | Simplified |
|------|---------|------------|
| Running | `✅ Server is running on http://127.0.0.1:${port}/mcp` | `✅ Running on port ${port}` |
| Stopped | `⭕ Server is stopped` | `⭕ Stopped` |

**Notices kept as-is:**
- "⚠️ Server restart required for port changes to take effect"
- "⚠️ Server restart required for API key changes to take effect"
- "✅ API key copied to clipboard"
- "✅ New API key generated"
- "✅ Configuration copied to clipboard"

### Implementation Details

**Files changed:**
- `src/settings.ts` - single file modification

**No functionality changes:**
- All settings remain functional
- All buttons and controls preserved
- All styling preserved (colors, padding, backgrounds, fonts)
- User-select and cursor styles maintained for copyable elements

**HTML structure:**
```html
<details>
  <summary>Section Title</summary>
  <!-- Section content -->
</details>
```

## User Experience Impact

**Before (current UI):**
- Long scrolling page with all sections expanded
- Encryption warnings and technical details visible
- Network security disclosure takes prominent space
- Important controls buried in middle of page

**After (simplified UI):**
- Compact default view with 5 visible items
- Server controls immediately accessible at top
- Advanced settings one click away
- Clean, focused interface for common tasks

## Non-Goals

- No changes to settings functionality or data storage
- No removal of capabilities (just reorganization)
- No changes to MCP protocol implementation
- No changes to notification system behavior

## Testing Considerations

- Verify all collapsible sections expand/collapse correctly
- Verify nested collapsible (MCP config inside Authentication) works
- Verify all buttons and controls remain functional
- Verify text inputs and toggles save correctly
- Test with server running and stopped states
- Test with notifications enabled and disabled
