# ObsidianReviewBot Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all required issues identified by ObsidianReviewBot for plugin submission to Obsidian community repository.

**Architecture:** Fix-by-fix approach across all affected files - complete one type of fix across all files before moving to next fix. Order: documentation → command naming → file deletion API → inline styles extraction.

**Tech Stack:** TypeScript, Obsidian API, CSS, Jest

---

## Task 1: Fix Config Path Documentation

**Files:**
- Modify: `src/tools/index.ts:235`
- Modify: `src/tools/index.ts:300`

**Step 1: Update first exclude pattern example (line 235)**

In `src/tools/index.ts`, find line 235 and change the example from `.obsidian/**` to a generic folder:

```typescript
description: "Glob patterns to exclude (e.g., ['templates/**', '*.tmp']). Files matching these patterns will be skipped. Takes precedence over includes."
```

**Step 2: Update second exclude pattern example (line 300)**

In `src/tools/index.ts`, find line 300 and make the same change:

```typescript
description: "Glob patterns to exclude (e.g., ['templates/**', '*.tmp']). Takes precedence over includes."
```

**Step 3: Verify changes**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

**Step 4: Commit**

```bash
git add src/tools/index.ts
git commit -m "fix: use generic folder in exclude pattern examples

- Replace .obsidian references with templates folder
- Obsidian config directory can be customized by users
- Addresses ObsidianReviewBot feedback"
```

---

## Task 2: Fix Command Names

**Files:**
- Modify: `src/main.ts:54`
- Modify: `src/main.ts:62`
- Modify: `src/main.ts:70`

**Step 1: Update "Start MCP Server" command name**

In `src/main.ts`, find the command registration at line 52-58:

```typescript
this.addCommand({
	id: 'start-mcp-server',
	name: 'Start server',
	callback: async () => {
		await this.startServer();
	}
});
```

**Step 2: Update "Stop MCP Server" command name**

In `src/main.ts`, find the command registration at line 60-66:

```typescript
this.addCommand({
	id: 'stop-mcp-server',
	name: 'Stop server',
	callback: async () => {
		await this.stopServer();
	}
});
```

**Step 3: Update "Restart MCP Server" command name**

In `src/main.ts`, find the command registration at line 68-74:

```typescript
this.addCommand({
	id: 'restart-mcp-server',
	name: 'Restart server',
	callback: async () => {
		await this.stopServer();
		await this.startServer();
	}
});
```

**Step 4: Verify changes**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

**Step 5: Run tests**

Run: `npm test`
Expected: All 716 tests pass

**Step 6: Commit**

```bash
git add src/main.ts
git commit -m "fix: remove plugin name from command display names

- 'Start MCP Server' → 'Start server'
- 'Stop MCP Server' → 'Stop server'
- 'Restart MCP Server' → 'Restart server'
- Command IDs unchanged (stable API)
- Addresses ObsidianReviewBot feedback"
```

---

## Task 3: Fix File Deletion API

**Files:**
- Modify: `src/tools/note-tools.ts:162`
- Modify: `src/tools/note-tools.ts:546`

**Step 1: Replace vault.delete() in overwrite scenario (line 162)**

In `src/tools/note-tools.ts`, find the overwrite conflict resolution code around line 157-163:

```typescript
} else if (onConflict === 'overwrite') {
	// Delete existing file before creating
	const existingFile = PathUtils.resolveFile(this.app, normalizedPath);
	/* istanbul ignore next */
	if (existingFile) {
		await this.fileManager.trashFile(existingFile);
	}
}
```

**Step 2: Replace vault.delete() in permanent delete (line 546)**

In `src/tools/note-tools.ts`, find the permanent deletion code around line 544-547:

```typescript
} else {
	// Permanent deletion
	await this.fileManager.trashFile(file);
}
```

**Step 3: Verify changes**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

**Step 4: Run tests**

Run: `npm test`
Expected: All 716 tests pass (the test mocks should handle both APIs)

**Step 5: Run specific note-tools tests**

Run: `npm test -- tests/note-tools.test.ts`
Expected: All note-tools tests pass, including:
- createNote with onConflict='overwrite'
- deleteNote with soft=false

**Step 6: Commit**

```bash
git add src/tools/note-tools.ts
git commit -m "fix: use fileManager.trashFile instead of vault.delete

- Replace vault.delete() with app.fileManager.trashFile()
- Respects user's trash preferences in Obsidian settings
- Applies to both overwrite conflicts and permanent deletes
- Addresses ObsidianReviewBot feedback"
```

---

## Task 4: Extract Inline Styles to CSS

**Files:**
- Modify: `styles.css` (add new classes)
- Modify: `src/settings.ts` (remove inline styles, add CSS classes)

**Step 1: Add CSS classes to styles.css**

Append the following CSS classes to `styles.css`:

```css
/* MCP Settings Panel Styles */

/* Authentication section */
.mcp-auth-section {
	margin-bottom: 20px;
}

.mcp-auth-summary {
	font-size: 1.17em;
	font-weight: bold;
	margin-bottom: 12px;
	cursor: pointer;
}

/* API key display */
.mcp-api-key-container {
	margin-bottom: 20px;
	margin-left: 0;
}

.mcp-button-group {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

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

/* Headings and containers */
.mcp-heading {
	margin-top: 24px;
	margin-bottom: 12px;
}

.mcp-container {
	margin-bottom: 20px;
}

/* Tab navigation */
.mcp-tab-container {
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
	font-weight: normal;
}

.mcp-tab-active {
	border-bottom-color: var(--interactive-accent);
	font-weight: bold;
}

/* Tab content */
.mcp-tab-content {
	margin-top: 16px;
}

/* Labels and helper text */
.mcp-label {
	margin-bottom: 4px;
	font-size: 0.9em;
	color: var(--text-muted);
}

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

/* Copy button spacing */
.mcp-copy-button {
	margin-bottom: 12px;
}

/* Notification section */
.mcp-notif-section {
	margin-bottom: 20px;
}

.mcp-notif-summary {
	font-size: 1.17em;
	font-weight: bold;
	margin-bottom: 12px;
	cursor: pointer;
}
```

**Step 2: Update authentication section in settings.ts (lines 199-205)**

In `src/settings.ts`, find the `displayAuthenticationDetails` method around line 199 and replace inline styles:

```typescript
const authDetails = containerEl.createEl('details', { cls: 'mcp-auth-section' });
authDetails.open = true;
const authSummary = authDetails.createEl('summary', {
	text: 'Authentication',
	cls: 'mcp-auth-summary'
});
```

**Step 3: Update API key container styles (lines 217-224)**

Replace:
```typescript
const apiKeyContainer = containerEl.createDiv({ cls: 'mcp-api-key-container' });
const apiKeyButtonContainer = apiKeyContainer.createDiv({ cls: 'mcp-button-group' });
```

**Step 4: Update key display container styles (lines 247-255)**

Replace:
```typescript
const keyDisplayContainer = apiKeyContainer.createDiv({
	text: apiKey,
	cls: 'mcp-key-display'
});
```

**Step 5: Update config section headings (lines 260-264)**

Replace:
```typescript
const configHeading = containerEl.createEl('h3', {
	text: 'Connection Configuration',
	cls: 'mcp-heading'
});
const configContainer = containerEl.createDiv({ cls: 'mcp-container' });
```

**Step 6: Update tab container styles (lines 271-285)**

Replace the tab container creation:
```typescript
const tabContainer = configContainer.createDiv({ cls: 'mcp-tab-container' });

const windsurfTab = tabContainer.createEl('button', {
	text: 'Windsurf',
	cls: this.activeConfigTab === 'windsurf' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
});

const claudeCodeTab = tabContainer.createEl('button', {
	text: 'Claude Code',
	cls: this.activeConfigTab === 'claude-code' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
});
```

**Step 7: Update tab content and labels (lines 311-327)**

Replace:
```typescript
const tabContent = configContainer.createDiv({ cls: 'mcp-tab-content' });

const fileLocationLabel = tabContent.createDiv({
	text: 'Configuration file location:',
	cls: 'mcp-label'
});

const filePathDisplay = tabContent.createDiv({
	text: filePath,
	cls: 'mcp-file-path'
});

const copyConfigButton = tabContent.createEl('button', {
	text: 'Copy to Clipboard',
	cls: 'mcp-copy-button'
});
```

**Step 8: Update config display (lines 339-346)**

Replace:
```typescript
const configDisplay = tabContent.createEl('pre', { cls: 'mcp-config-display' });

const usageNoteDisplay = tabContent.createDiv({
	text: usageNote,
	cls: 'mcp-usage-note'
});
```

**Step 9: Update notification section (lines 357-362)**

Replace:
```typescript
const notifDetails = containerEl.createEl('details', { cls: 'mcp-notif-section' });
notifDetails.open = false;
const notifSummary = notifDetails.createEl('summary', {
	text: 'Notification Settings',
	cls: 'mcp-notif-summary'
});
```

**Step 10: Update updateConfigTabDisplay method (lines 439-521)**

Find the `updateConfigTabDisplay` method and update the tab button styling to use CSS classes with conditional application:

```typescript
private updateConfigTabDisplay(containerEl: HTMLElement) {
	// ... existing code ...

	const tabContainer = containerEl.createDiv({ cls: 'mcp-tab-container' });

	const windsurfTab = tabContainer.createEl('button', {
		text: 'Windsurf',
		cls: this.activeConfigTab === 'windsurf' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
	});

	const claudeCodeTab = tabContainer.createEl('button', {
		text: 'Claude Code',
		cls: this.activeConfigTab === 'claude-code' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
	});

	// Update tab content with CSS classes
	const tabContent = containerEl.createDiv({ cls: 'mcp-tab-content' });

	const fileLocationLabel = tabContent.createDiv({
		text: 'Configuration file location:',
		cls: 'mcp-label'
	});

	const filePathDisplay = tabContent.createDiv({
		text: filePath,
		cls: 'mcp-file-path'
	});

	const copyConfigButton = tabContent.createEl('button', {
		text: 'Copy to Clipboard',
		cls: 'mcp-copy-button'
	});

	const configDisplay = tabContent.createEl('pre', { cls: 'mcp-config-display' });

	const usageNoteDisplay = tabContent.createDiv({
		text: usageNote,
		cls: 'mcp-usage-note'
	});
}
```

**Step 11: Verify all inline styles removed**

Run: `grep -n "\.style\." src/settings.ts`
Expected: No matches (or only legitimate dynamic styling that can't be in CSS)

**Step 12: Build and verify**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

**Step 13: Run tests**

Run: `npm test`
Expected: All 716 tests pass

**Step 14: Commit**

```bash
git add styles.css src/settings.ts
git commit -m "fix: extract inline styles to CSS with semantic classes

- Add mcp-* prefixed CSS classes for all settings UI elements
- Remove 90+ inline style assignments from settings.ts
- Use Obsidian CSS variables for theming compatibility
- Preserve dynamic tab active state with conditional classes
- Addresses ObsidianReviewBot feedback"
```

---

## Task 5: Final Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All 716 tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build, no errors, no warnings

**Step 3: Check git status**

Run: `git status`
Expected: Clean working tree, all changes committed

**Step 4: Review commit history**

Run: `git log --oneline -5`
Expected: See all 4 fix commits plus design doc commit

**Step 5: Manual testing checklist (if Obsidian available)**

If you can test in Obsidian:
1. Copy built files to `.obsidian/plugins/mcp-server/`
2. Reload Obsidian
3. Open Settings → MCP Server
4. Verify settings panel appearance identical to before
5. Test both light and dark themes
6. Verify collapsible sections work
7. Verify tab switching works
8. Test command palette shows updated command names

---

## Success Criteria

✅ All 4 ObsidianReviewBot required issues fixed
✅ No test regressions (716 tests passing)
✅ Clean TypeScript build
✅ Settings panel visually unchanged
✅ All changes committed with clear messages
✅ Ready for PR re-submission
