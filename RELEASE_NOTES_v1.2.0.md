# Release Notes - Version 1.2.0

**Release Date:** October 16, 2025

## Overview

Version 1.2.0 completes Phase 1.5 of the roadmap, adding enhanced parent folder detection and significantly improved authentication security.

## What's New

### 📁 Enhanced Parent Folder Detection

**New `createParents` Parameter**
- Added optional `createParents` parameter to `create_note` tool
- Default: `false` (safe behavior - requires parent folders to exist)
- When `true`: automatically creates missing parent folders recursively
- Handles deeply nested paths (e.g., `a/b/c/d/e/file.md`)

**Improved Error Handling**
- Explicit parent folder detection before file creation (fail-fast)
- Clear error messages with `createParents` usage examples
- Validates parent is a folder (not a file)
- Better troubleshooting guidance

**Example Usage:**
```typescript
// Auto-create missing parent folders
create_note({
  path: "projects/2024/reports/Q4.md",
  content: "# Q4 Report",
  createParents: true
})
```

### 🔐 Enhanced Authentication & Security

**Automatic API Key Generation**
- API keys are now auto-generated when authentication is enabled
- 32-character cryptographically secure keys using `crypto.getRandomValues()`
- No more weak user-chosen passwords

**Improved UI/UX**
- Copy to clipboard button for API key
- Regenerate key button with instant refresh
- Static, selectable API key display (full width)
- MCP client configuration snippet generator
  - Dynamically includes/excludes Authorization header
  - Correct `mcpServers` format with `serverUrl` field
  - Copy configuration button
  - Partially selectable text
- Restart warnings when authentication settings change
- Selectable connection information URLs

**Security Fixes**
- Fixed critical vulnerability where enabling authentication without API key allowed unrestricted access
- Three-layer defense: UI validation, server start validation, and middleware enforcement
- Fail-secure design: blocks access when misconfigured
- Improved error messages for authentication failures

**Configuration Example:**
```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "serverUrl": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

## Technical Details

### New Files
- `src/utils/auth-utils.ts` - API key generation and validation utilities
- `tests/parent-folder-detection.test.ts` - 15 comprehensive test cases
- `IMPLEMENTATION_NOTES_AUTH.md` - Authentication implementation documentation

### Modified Files
- `src/tools/note-tools.ts` - Enhanced `createNote()` with parent folder validation
- `src/tools/index.ts` - Updated `create_note` tool schema
- `src/server/middleware.ts` - Enhanced authentication middleware
- `src/main.ts` - Server start validation
- `src/settings.ts` - Complete UI overhaul for authentication
- `src/utils/error-messages.ts` - Enhanced parent folder error messages

### Testing
- 15 new test cases for parent folder detection
- All tests passing
- Build successful

## Breaking Changes

None. All changes are backward compatible.

## Upgrade Notes

1. **Authentication Users:**
   - If you have authentication enabled, your existing API key will continue to work
   - You can now regenerate keys easily from the settings UI
   - Use the new configuration snippet for easy MCP client setup

2. **create_note Users:**
   - Existing code continues to work (default: `createParents: false`)
   - Optionally add `createParents: true` for automatic folder creation

## Documentation

- ✅ CHANGELOG.md updated
- ✅ ROADMAP.md updated (Phase 1.5 marked complete)
- ✅ IMPLEMENTATION_NOTES_AUTH.md created
- ✅ IMPLEMENTATION_NOTES_v1.5.md (parent folder detection)

## Next Steps

Phase 2 (API Unification & Typed Results) is next on the roadmap.

## Contributors

This release includes improvements to security, usability, and robustness based on real-world usage and testing.
