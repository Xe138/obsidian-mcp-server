# Settings UI Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Streamline the MCP Server settings UI by removing clutter and using progressive disclosure to collapse advanced sections.

**Architecture:** Single-file modification to `src/settings.ts` using HTML `<details>/<summary>` elements for collapsible sections. Move Server Status to top, remove encryption messaging, simplify all descriptive text.

**Tech Stack:** TypeScript, Obsidian Plugin API, HTML details/summary elements

---

## Task 1: Remove Encryption Messaging and Network Disclosure

**Files:**
- Modify: `src/settings.ts:22-30` (network disclosure)
- Modify: `src/settings.ts:64-79` (encryption description and status)

**Step 1: Remove network disclosure box**

Remove lines 22-30 (the network security disclosure):

```typescript
// DELETE THESE LINES (22-30):
// Network disclosure
const disclosureEl = containerEl.createEl('div', {cls: 'mcp-disclosure'});
disclosureEl.createEl('p', {
    text: '⚠️ This plugin runs a local HTTP server to expose vault operations via the Model Context Protocol (MCP). The server only accepts connections from localhost (127.0.0.1) for security.'
});
disclosureEl.style.backgroundColor = 'var(--background-secondary)';
disclosureEl.style.padding = '12px';
disclosureEl.style.marginBottom = '16px';
disclosureEl.style.borderRadius = '4px';
```

**Step 2: Remove encryption description and status**

Remove lines 64-79 (authentication description and encryption status indicator):

```typescript
// DELETE THESE LINES (64-79):
const authDesc = containerEl.createEl('p', {
    text: 'Authentication is required for all requests. Your API key is encrypted and stored securely using your system\'s credential storage.'
});
authDesc.style.fontSize = '0.9em';
authDesc.style.color = 'var(--text-muted)';
authDesc.style.marginBottom = '16px';

// Show encryption status
const encryptionStatus = containerEl.createEl('p', {
    text: isEncryptionAvailable()
        ? '🔒 Encryption: Available (using system keychain)'
        : '⚠️ Encryption: Unavailable (API key stored in plaintext)'
});
encryptionStatus.style.fontSize = '0.85em';
encryptionStatus.style.marginBottom = '12px';
encryptionStatus.style.fontStyle = 'italic';
```

**Step 3: Remove unused import**

Remove the `isEncryptionAvailable` import from line 5:

```typescript
// CHANGE THIS LINE (5):
import { isEncryptionAvailable } from './utils/encryption-utils';

// TO (remove the import entirely - it's no longer used):
// (delete line 5)
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: remove encryption messaging and network disclosure from settings UI"
```

---

## Task 2: Move Server Status to Top and Simplify Text

**Files:**
- Modify: `src/settings.ts:176-226` (server status section)
- Modify: `src/settings.ts:33-59` (setting descriptions)

**Step 1: Cut the Server Status section**

Find and cut lines 176-226 (the entire "Server status" section including the h3, status display, control buttons, and connection information).

**Step 2: Paste Server Status after the h2 title**

Insert the Server Status section immediately after line 20 (after `containerEl.createEl('h2', {text: 'MCP Server Settings'});`).

**Step 3: Simplify Server Status messages**

Update the status messages to be more concise:

```typescript
// CHANGE THIS (around line 182-186 after move):
statusEl.createEl('p', {
    text: isRunning
        ? `✅ Server is running on http://127.0.0.1:${this.plugin.settings.port}/mcp`
        : '⭕ Server is stopped'
});

// TO:
statusEl.createEl('p', {
    text: isRunning
        ? `✅ Running on port ${this.plugin.settings.port}`
        : '⭕ Stopped'
});
```

**Step 4: Remove "Connection Information" section**

Remove the "Connection Information" section (originally lines 213-226):

```typescript
// DELETE THIS ENTIRE SECTION:
// Connection info
if (isRunning) {
    containerEl.createEl('h3', {text: 'Connection Information'});

    const infoEl = containerEl.createEl('div', {cls: 'mcp-connection-info'});
    infoEl.createEl('p', {text: 'MCP Endpoint:'});
    const mcpEndpoint = infoEl.createEl('code', {text: `http://127.0.0.1:${this.plugin.settings.port}/mcp`});
    mcpEndpoint.style.userSelect = 'all';
    mcpEndpoint.style.cursor = 'text';

    infoEl.createEl('p', {text: 'Health Check:'});
    const healthEndpoint = infoEl.createEl('code', {text: `http://127.0.0.1:${this.plugin.settings.port}/health`});
    healthEndpoint.style.userSelect = 'all';
    healthEndpoint.style.cursor = 'text';
}
```

**Step 5: Simplify Auto-start description**

```typescript
// CHANGE THIS (line 35):
.setDesc('Automatically start the MCP server when Obsidian launches')

// TO:
.setDesc('Start server when Obsidian launches')
```

**Step 6: Simplify Port description**

```typescript
// CHANGE THIS (line 46):
.setDesc('Port number for the HTTP server (requires restart)')

// TO:
.setDesc('Server port (restart required)')
```

**Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 8: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: move server status to top and simplify setting descriptions"
```

---

## Task 3: Make Authentication Section Collapsible

**Files:**
- Modify: `src/settings.ts:62-128` (authentication section)

**Step 1: Wrap Authentication section in details/summary**

Replace the h3 heading with a details/summary structure:

```typescript
// CHANGE THIS (line 62):
containerEl.createEl('h3', {text: 'Authentication'});

// TO:
const authDetails = containerEl.createEl('details');
authDetails.style.marginBottom = '20px';
const authSummary = authDetails.createEl('summary');
authSummary.style.fontSize = '1.17em';
authSummary.style.fontWeight = 'bold';
authSummary.style.marginBottom = '12px';
authSummary.style.cursor = 'pointer';
authSummary.setText('Authentication');
```

**Step 2: Update all containerEl references to authDetails**

Within the Authentication section (lines 82-128), change all `containerEl.createEl` and `containerEl.createDiv` to use `authDetails` instead:

```typescript
// CHANGE PATTERN:
new Setting(containerEl)

// TO:
new Setting(authDetails)

// AND CHANGE:
const apiKeyContainer = containerEl.createDiv({cls: 'mcp-api-key-section'});

// TO:
const apiKeyContainer = authDetails.createDiv({cls: 'mcp-api-key-section'});
```

**Step 3: Simplify API Key Management description**

```typescript
// CHANGE THIS (around line 84):
.setDesc('Use this key in the Authorization header as Bearer token')

// TO:
.setDesc('Use as Bearer token in Authorization header')
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: make authentication section collapsible"
```

---

## Task 4: Make MCP Client Configuration Collapsible (Nested)

**Files:**
- Modify: `src/settings.ts:129-175` (MCP client configuration section)

**Step 1: Wrap MCP Config in nested details/summary**

Replace the h3 heading with a nested details/summary structure inside the authDetails:

```typescript
// CHANGE THIS (line 130):
containerEl.createEl('h3', {text: 'MCP Client Configuration'});

const configContainer = containerEl.createDiv({cls: 'mcp-config-snippet'});

// TO:
const configDetails = authDetails.createEl('details');
configDetails.style.marginTop = '16px';
const configSummary = configDetails.createEl('summary');
configSummary.style.fontSize = '1em';
configSummary.style.fontWeight = 'bold';
configSummary.style.marginBottom = '8px';
configSummary.style.cursor = 'pointer';
configSummary.setText('MCP Client Configuration');

const configContainer = configDetails.createDiv({cls: 'mcp-config-snippet'});
```

**Step 2: Simplify config description**

```typescript
// CHANGE THIS (around line 136):
const configDesc = configContainer.createEl('p', {
    text: 'Add this configuration to your MCP client (e.g., Claude Desktop, Cline):'
});

// TO:
const configDesc = configContainer.createEl('p', {
    text: 'Add to your MCP client config:'
});
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: make MCP client configuration collapsible within authentication"
```

---

## Task 5: Make UI Notifications Section Collapsible

**Files:**
- Modify: `src/settings.ts:228-302` (notification settings section)

**Step 1: Wrap Notifications section in details/summary**

Replace the h3 heading and description with a details/summary structure:

```typescript
// CHANGE THIS (lines 229-236):
containerEl.createEl('h3', {text: 'UI Notifications'});

const notifDesc = containerEl.createEl('p', {
    text: 'Display notifications in Obsidian UI when MCP tools are called. Useful for monitoring API activity and debugging.'
});
notifDesc.style.fontSize = '0.9em';
notifDesc.style.color = 'var(--text-muted)';
notifDesc.style.marginBottom = '12px';

// TO:
const notifDetails = containerEl.createEl('details');
notifDetails.style.marginBottom = '20px';
const notifSummary = notifDetails.createEl('summary');
notifSummary.style.fontSize = '1.17em';
notifSummary.style.fontWeight = 'bold';
notifSummary.style.marginBottom = '12px';
notifSummary.style.cursor = 'pointer';
notifSummary.setText('UI Notifications');
```

**Step 2: Update all containerEl references to notifDetails**

Within the Notifications section (lines 238-302), change all `new Setting(containerEl)` to use `notifDetails`:

```typescript
// CHANGE PATTERN:
new Setting(containerEl)

// TO:
new Setting(notifDetails)
```

**Step 3: Simplify notification setting descriptions**

```typescript
// CHANGE THIS (around line 241):
.setDesc('Show notifications when MCP tools are called (request only, no completion notifications)')

// TO:
.setDesc('Show when MCP tools are called')

// AND CHANGE THIS (around line 269):
.setDesc('How long notifications stay visible (milliseconds)')

// TO:
.setDesc('Duration in milliseconds')

// AND CHANGE THIS (around line 284):
.setDesc('Also log tool calls to browser console')

// TO:
.setDesc('Log tool calls to console')
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: make UI notifications section collapsible and simplify descriptions"
```

---

## Task 6: Final Verification and Testing

**Files:**
- Test: All settings UI functionality

**Step 1: Run full test suite**

Run: `npm test`
Expected: All 569 tests pass

**Step 2: Build production bundle**

Run: `npm run build`
Expected: Build succeeds, `main.js` created

**Step 3: Manual testing checklist**

Create a manual testing checklist (you don't need to execute this, document it for the implementer):

```markdown
Manual Testing Checklist:
- [ ] Settings tab opens without errors
- [ ] Server Status section appears at top
- [ ] Auto-start and Port settings visible and functional
- [ ] Authentication section collapsed by default
- [ ] Authentication section expands when clicked
- [ ] API key copy/regenerate buttons work
- [ ] MCP Client Configuration collapsed within Authentication
- [ ] MCP Client Configuration expands when clicked
- [ ] Config copy button works
- [ ] UI Notifications section collapsed by default
- [ ] UI Notifications section expands when clicked
- [ ] All notification sub-settings work when enabled
- [ ] No encryption messages visible anywhere
- [ ] No network disclosure visible
- [ ] Status messages show simplified text
- [ ] Server start/stop/restart buttons work
```

**Step 4: Commit testing notes**

```bash
git add docs/plans/2025-10-26-simplify-settings-ui.md
git commit -m "docs: add manual testing checklist for settings UI"
```

---

## Implementation Notes

**Total estimated time:** 30-45 minutes

**Key principles:**
- **YAGNI:** Remove all unnecessary messaging and disclosure text
- **DRY:** Reuse details/summary pattern for all collapsible sections
- **Progressive disclosure:** Default to collapsed state for advanced sections

**Potential issues:**
- Details/summary styling may need adjustment for Obsidian theme compatibility
- Ensure cursor styles work correctly for summary elements
- Verify nested details (MCP Config inside Auth) expands/collapses independently

**Testing strategy:**
- Unit tests shouldn't be affected (UI only change)
- Manual testing critical for verifying collapsible behavior
- Test in both light and dark themes if possible
