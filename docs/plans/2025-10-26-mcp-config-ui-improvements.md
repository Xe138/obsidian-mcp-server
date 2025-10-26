# MCP Configuration UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tab-based MCP client configuration UI with single-click copy for Windsurf and Claude Code configurations.

**Architecture:** Extend the existing settings UI to replace the nested MCP configuration section with a tab-based interface. Add helper methods to generate client-specific configurations dynamically. Use component state to track active tab without persisting to settings.

**Tech Stack:** TypeScript, Obsidian Plugin API, HTML/CSS for UI

---

## Task 1: Add Tab State and Configuration Generator

**Files:**
- Modify: `src/settings.ts:6-13` (class properties)
- Modify: `src/settings.ts:70-76` (display method initialization)

**Step 1: Add activeConfigTab property to class**

In `src/settings.ts`, add the tab state property after line 8:

```typescript
export class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;
	private notificationDetailsEl: HTMLDetailsElement | null = null;
	private activeConfigTab: 'windsurf' | 'claude-code' = 'windsurf';
```

**Step 2: Add configuration generator helper method**

Add this method after the `renderNotificationSettings` method (after line 68):

```typescript
/**
 * Generate client-specific MCP configuration
 */
private generateConfigForClient(client: 'windsurf' | 'claude-code'): {
	filePath: string;
	config: object;
	usageNote: string;
} {
	const port = this.plugin.settings.port;
	const apiKey = this.plugin.settings.apiKey || 'YOUR_API_KEY_HERE';

	if (client === 'windsurf') {
		return {
			filePath: '~/.windsurf/config.json',
			config: {
				"mcpServers": {
					"obsidian": {
						"serverUrl": `http://127.0.0.1:${port}/mcp`,
						"headers": {
							"Authorization": `Bearer ${apiKey}`
						}
					}
				}
			},
			usageNote: 'After copying, paste into the config file and restart Windsurf.'
		};
	} else { // claude-code
		return {
			filePath: '~/.claude.json',
			config: {
				"mcpServers": {
					"obsidian": {
						"type": "http",
						"url": `http://127.0.0.1:${port}/mcp`,
						"headers": {
							"Authorization": `Bearer ${apiKey}`
						}
					}
				}
			},
			usageNote: 'After copying, paste into the config file and restart Claude Code.'
		};
	}
}
```

**Step 3: Initialize tab state in display method**

In the `display()` method, after line 76 (clearing notificationDetailsEl), add:

```typescript
// Reset tab state for fresh render
this.activeConfigTab = 'windsurf';
```

**Step 4: Run type check**

Run: `npm run build`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "feat: add tab state and config generator for MCP clients"
```

---

## Task 2: Rename Authentication Section

**Files:**
- Modify: `src/settings.ts:146-153`

**Step 1: Update section title**

Change line 153 from:
```typescript
authSummary.setText('Authentication');
```

To:
```typescript
authSummary.setText('Authentication & Configuration');
```

**Step 2: Run type check**

Run: `npm run build`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/settings.ts
git commit -m "feat: rename Authentication section to Authentication & Configuration"
```

---

## Task 3: Remove Nested MCP Configuration Details Element

**Files:**
- Modify: `src/settings.ts:203-211`

**Step 1: Remove nested details wrapper**

Delete lines 204-211 (the nested `<details>` element and its summary):

```typescript
// DELETE THESE LINES:
const configDetails = authDetails.createEl('details');
configDetails.style.marginTop = '16px';
const configSummary = configDetails.createEl('summary');
configSummary.style.fontSize = '1em';
configSummary.style.fontWeight = 'bold';
configSummary.style.marginBottom = '8px';
configSummary.style.cursor = 'pointer';
configSummary.setText('MCP Client Configuration');
```

**Step 2: Add section heading instead**

After line 202 (after the API key display), add:

```typescript
// MCP Client Configuration heading
const configHeading = authDetails.createEl('h4', {text: 'MCP Client Configuration'});
configHeading.style.marginTop = '24px';
configHeading.style.marginBottom = '12px';
```

**Step 3: Update parent container reference**

On line 213, change `configDetails` to `authDetails`:

Before:
```typescript
const configContainer = configDetails.createDiv({cls: 'mcp-config-snippet'});
```

After:
```typescript
const configContainer = authDetails.createDiv({cls: 'mcp-config-snippet'});
```

**Step 4: Run type check**

Run: `npm run build`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: remove nested MCP config details element"
```

---

## Task 4: Replace Single Config with Tab Buttons

**Files:**
- Modify: `src/settings.ts:213-255`

**Step 1: Replace description with tab container**

Delete lines 216-221 (the config description paragraph).

Replace with tab button container:

```typescript
// Tab buttons for switching between clients
const tabContainer = configContainer.createDiv({cls: 'mcp-config-tabs'});
tabContainer.style.display = 'flex';
tabContainer.style.gap = '8px';
tabContainer.style.marginBottom = '16px';
tabContainer.style.borderBottom = '1px solid var(--background-modifier-border)';

// Windsurf tab button
const windsurfTab = tabContainer.createEl('button', {text: 'Windsurf'});
windsurfTab.style.padding = '8px 16px';
windsurfTab.style.border = 'none';
windsurfTab.style.background = 'none';
windsurfTab.style.cursor = 'pointer';
windsurfTab.style.borderBottom = this.activeConfigTab === 'windsurf'
	? '2px solid var(--interactive-accent)'
	: '2px solid transparent';
windsurfTab.style.fontWeight = this.activeConfigTab === 'windsurf' ? 'bold' : 'normal';
windsurfTab.addEventListener('click', () => {
	this.activeConfigTab = 'windsurf';
	this.display();
});

// Claude Code tab button
const claudeCodeTab = tabContainer.createEl('button', {text: 'Claude Code'});
claudeCodeTab.style.padding = '8px 16px';
claudeCodeTab.style.border = 'none';
claudeCodeTab.style.background = 'none';
claudeCodeTab.style.cursor = 'pointer';
claudeCodeTab.style.borderBottom = this.activeConfigTab === 'claude-code'
	? '2px solid var(--interactive-accent)'
	: '2px solid transparent';
claudeCodeTab.style.fontWeight = this.activeConfigTab === 'claude-code' ? 'bold' : 'normal';
claudeCodeTab.addEventListener('click', () => {
	this.activeConfigTab = 'claude-code';
	this.display();
});
```

**Step 2: Run type check**

Run: `npm run build`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/settings.ts
git commit -m "feat: add tab buttons for MCP client selection"
```

---

## Task 5: Replace Static Config with Dynamic Tab Content

**Files:**
- Modify: `src/settings.ts:224-255`

**Step 1: Delete old config generation and display code**

Delete lines 224-255 (old mcpConfig object, button container, and config display).

**Step 2: Add dynamic config content area**

Replace with:

```typescript
// Get configuration for active tab
const {filePath, config, usageNote} = this.generateConfigForClient(this.activeConfigTab);

// Tab content area
const tabContent = configContainer.createDiv({cls: 'mcp-config-content'});
tabContent.style.marginTop = '16px';

// File location label
const fileLocationLabel = tabContent.createEl('p', {text: 'Configuration file location:'});
fileLocationLabel.style.marginBottom = '4px';
fileLocationLabel.style.fontSize = '0.9em';
fileLocationLabel.style.color = 'var(--text-muted)';

// File path display
const filePathDisplay = tabContent.createEl('div', {text: filePath});
filePathDisplay.style.padding = '8px';
filePathDisplay.style.backgroundColor = 'var(--background-secondary)';
filePathDisplay.style.borderRadius = '4px';
filePathDisplay.style.fontFamily = 'monospace';
filePathDisplay.style.fontSize = '0.9em';
filePathDisplay.style.marginBottom = '12px';
filePathDisplay.style.color = 'var(--text-muted)';

// Copy button
const copyConfigButton = tabContent.createEl('button', {text: '📋 Copy Configuration'});
copyConfigButton.style.marginBottom = '12px';
copyConfigButton.addEventListener('click', async () => {
	await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
	new Notice('✅ Configuration copied to clipboard');
});

// Config JSON display
const configDisplay = tabContent.createEl('pre');
configDisplay.style.padding = '12px';
configDisplay.style.backgroundColor = 'var(--background-secondary)';
configDisplay.style.borderRadius = '4px';
configDisplay.style.fontSize = '0.85em';
configDisplay.style.overflowX = 'auto';
configDisplay.style.userSelect = 'text';
configDisplay.style.cursor = 'text';
configDisplay.style.marginBottom = '12px';
configDisplay.textContent = JSON.stringify(config, null, 2);

// Usage note
const usageNoteDisplay = tabContent.createEl('p', {text: usageNote});
usageNoteDisplay.style.fontSize = '0.9em';
usageNoteDisplay.style.color = 'var(--text-muted)';
usageNoteDisplay.style.fontStyle = 'italic';
```

**Step 3: Run type check**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/settings.ts
git commit -m "feat: implement dynamic tab content with client-specific configs"
```

---

## Task 6: Manual Testing

**Files:**
- Test: Manual testing in Obsidian

**Step 1: Build the plugin**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Copy plugin to test vault**

Assuming you have a test vault at `~/test-vault/.obsidian/plugins/obsidian-mcp-server/`:

Run:
```bash
cp main.js manifest.json styles.css ~/test-vault/.obsidian/plugins/obsidian-mcp-server/
```

**Step 3: Test in Obsidian**

1. Open test vault in Obsidian
2. Reload Obsidian (Ctrl/Cmd + R)
3. Go to Settings → MCP Server Settings
4. Verify "Authentication & Configuration" section appears
5. Expand the section
6. Verify two tabs: "Windsurf" and "Claude Code"
7. Click "Windsurf" tab - verify config shows with serverUrl
8. Click "Claude Code" tab - verify config shows with type: "http"
9. Click "Copy Configuration" on each tab
10. Verify clipboard contains correct JSON for each client
11. Verify port number matches setting
12. Verify API key appears in both configs

**Step 4: Document test results**

If all tests pass, proceed. If any issues found, fix before continuing.

**Step 5: Commit test confirmation**

```bash
git commit --allow-empty -m "test: verify MCP config UI improvements work correctly"
```

---

## Task 7: Run Automated Tests

**Files:**
- Test: `tests/*.test.ts`

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (579 tests, 0 failures)

**Step 2: Verify no regressions**

The settings UI changes should not affect any existing tests since they only modify presentation layer.

Expected: All existing tests still pass

**Step 3: Commit if tests pass**

```bash
git commit --allow-empty -m "test: verify no regressions from UI changes"
```

---

## Task 8: Update Design Document Status

**Files:**
- Modify: `docs/plans/2025-10-26-mcp-config-ui-improvements-design.md:4`

**Step 1: Update status**

Change line 4 from:
```markdown
**Status:** Approved
```

To:
```markdown
**Status:** Implemented
```

**Step 2: Commit**

```bash
git add docs/plans/2025-10-26-mcp-config-ui-improvements-design.md
git commit -m "docs: mark MCP config UI improvements as implemented"
```

---

## Task 9: Final Verification

**Files:**
- Test: All components

**Step 1: Build production version**

Run: `npm run build`
Expected: Clean build with no errors or warnings

**Step 2: Run tests one final time**

Run: `npm test`
Expected: 579 tests passing, 0 failures

**Step 3: Verify git status is clean**

Run: `git status`
Expected: Working tree clean, on branch feature/mcp-config-ui-improvements

**Step 4: Review commit history**

Run: `git log --oneline`
Expected: Clean series of focused commits following conventional commit format

**Step 5: Push branch**

Run: `git push -u origin feature/mcp-config-ui-improvements`
Expected: Branch pushed successfully

---

## Next Steps

After implementation is complete:

1. **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to complete the workflow
2. Options include: merge to main, create PR, or clean up worktree
3. Follow the finishing-a-development-branch skill for structured completion

## Notes

- All commits use conventional commit format: `feat:`, `refactor:`, `test:`, `docs:`
- No breaking changes to existing functionality
- No changes to plugin settings schema
- Pure UI presentation changes
- Tab state is ephemeral (not persisted)
- Configurations are generated dynamically from current settings
