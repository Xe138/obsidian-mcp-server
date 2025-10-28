# ObsidianReviewBot Fixes Design

**Date:** 2025-10-28
**Status:** Approved
**PR:** https://github.com/obsidianmd/obsidian-releases/pull/8298

## Overview

This design addresses all required issues identified by ObsidianReviewBot for the MCP Server plugin submission to the Obsidian community plugin repository.

## Required Fixes

1. **Config path documentation** - Update hardcoded `.obsidian` examples to generic alternatives
2. **Command naming** - Remove "MCP Server" from command display names
3. **File deletion API** - Replace `vault.delete()` with `app.fileManager.trashFile()`
4. **Inline styles** - Extract 90+ JavaScript style assignments to CSS with semantic class names

## Implementation Strategy

**Approach:** Fix-by-fix across files - Complete one type of fix across all affected files before moving to the next fix type.

**Benefits:**
- Groups related changes together for clearer git history
- Easier to test each fix type independently
- Simpler code review with focused commits

## Fix Order and Details

### Fix 1: Config Path Documentation

**Files affected:** `src/tools/index.ts`

**Changes:**
- Line 235: Update exclude pattern example from `['.obsidian/**', '*.tmp']` to `['templates/**', '*.tmp']`
- Line 300: Same update for consistency

**Rationale:** Obsidian's configuration directory isn't necessarily `.obsidian` - users can configure this. Examples should use generic folders rather than system directories.

**Risk:** None - documentation only, no functional changes

### Fix 2: Command Naming

**Files affected:** `src/main.ts`

**Changes:**
- Line 54: "Start MCP Server" → "Start server"
- Line 62: "Stop MCP Server" → "Stop server"
- Line 70: "Restart MCP Server" → "Restart server"

**Note:** Command IDs remain unchanged (stable API requirement)

**Rationale:** Obsidian plugin guidelines state command names should not include the plugin name itself.

**Risk:** Low - purely cosmetic change to command palette display

### Fix 3: File Deletion API

**Files affected:** `src/tools/note-tools.ts`

**Changes:**
- Line 162: `await this.vault.delete(existingFile)` → `await this.fileManager.trashFile(existingFile)`
- Line 546: `await this.vault.delete(file)` → `await this.fileManager.trashFile(file)`

**Context:**
- Line 162: Overwrite conflict resolution when creating files
- Line 546: Permanent delete operation (when soft=false)

**Rationale:** Use `app.fileManager.trashFile()` instead of direct deletion to respect user's trash preferences configured in Obsidian settings.

**Risk:** Medium - changes deletion behavior, requires testing both scenarios

**Testing:**
- Verify overwrite conflict resolution still works
- Verify permanent delete operation respects user preferences
- Confirm files go to user's configured trash location

### Fix 4: Inline Styles to CSS

**Files affected:**
- `styles.css` (add new classes)
- `src/settings.ts` (remove inline styles, add CSS classes)

**New CSS Classes:**

```css
/* Authentication section */
.mcp-auth-section { margin-bottom: 20px; }
.mcp-auth-summary {
  font-size: 1.17em;
  font-weight: bold;
  margin-bottom: 12px;
  cursor: pointer;
}

/* API key display */
.mcp-key-display {
  padding: 12px;
  background-color: var(--background-secondary);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  word-break: break-all;
  user-select: all;
  cursor: text;
  margin-bottom: 16px;
}

/* Tab navigation */
.mcp-config-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.mcp-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.mcp-tab-active {
  border-bottom-color: var(--interactive-accent);
  font-weight: bold;
}

/* Config display */
.mcp-config-display {
  padding: 12px;
  background-color: var(--background-secondary);
  border-radius: 4px;
  font-size: 0.85em;
  overflow-x: auto;
  user-select: text;
  cursor: text;
  margin-bottom: 12px;
}

/* Helper text */
.mcp-file-path {
  padding: 8px;
  background-color: var(--background-secondary);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  margin-bottom: 12px;
  color: var(--text-muted);
}

.mcp-usage-note {
  font-size: 0.9em;
  color: var(--text-muted);
  font-style: italic;
}

/* Additional utility classes */
.mcp-heading {
  margin-top: 24px;
  margin-bottom: 12px;
}

.mcp-container { margin-bottom: 20px; }

.mcp-button-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.mcp-label {
  margin-bottom: 4px;
  font-size: 0.9em;
  color: var(--text-muted);
}
```

**Changes to settings.ts:**
- Remove all `.style.` property assignments (90+ lines)
- Add corresponding CSS class names using `.addClass()` or `className` property
- Preserve dynamic styling for tab active state (use conditional class application)

**Rationale:** Obsidian plugin guidelines require styles to be in CSS files rather than applied via JavaScript. This improves maintainability and follows platform conventions.

**Risk:** High - largest refactor, visual regression possible

**Testing:**
- Build and load in Obsidian
- Verify settings panel appearance unchanged in both light and dark themes
- Test all interactive elements: collapsible sections, tabs, buttons
- Confirm responsive behavior

## Testing Strategy

**After each fix:**
1. Run `npm test` - ensure no test failures
2. Run `npm run build` - verify TypeScript compilation
3. Check for linting issues

**Before final commit:**
1. Full test suite passes
2. Clean build with no warnings
3. Manual smoke test of all settings UI features
4. Visual verification in both light and dark themes

## Success Criteria

- All 4 ObsidianReviewBot required issues resolved
- No test regressions
- No visual regressions in settings panel
- Clean build with no TypeScript errors
- Ready for PR re-submission
