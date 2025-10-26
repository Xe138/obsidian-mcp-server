# Notification UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three UX issues in the MCP notification system: unclear message format, settings collapse on toggle, and broken modal filters.

**Architecture:** Targeted surgical fixes - update notification message format in NotificationManager, implement targeted DOM updates in settings tab to prevent collapse, refactor modal filters to use Obsidian Setting components and eliminate destructive re-renders.

**Tech Stack:** TypeScript, Obsidian API (Notice, Setting, Modal), Jest for testing

---

## Task 1: Update Notification Message Format

**Files:**
- Modify: `src/ui/notifications.ts:77-94` (showToolCall method)
- Modify: `src/ui/notifications.ts:140-177` (formatArgs method)
- Test: `tests/notifications.test.ts` (new file)

**Step 1: Write failing test for new notification format**

Create `tests/notifications.test.ts`:

```typescript
import { App } from 'obsidian';
import { NotificationManager } from '../src/ui/notifications';
import { MCPPluginSettings } from '../src/types/settings-types';

describe('NotificationManager', () => {
	let app: App;
	let settings: MCPPluginSettings;
	let manager: NotificationManager;

	beforeEach(() => {
		app = {} as App;
		settings = {
			port: 3000,
			autoStart: false,
			apiKey: 'test-key',
			notificationsEnabled: true,
			showParameters: true,
			notificationDuration: 3000,
			logToConsole: false
		};
		manager = new NotificationManager(app, settings);
	});

	describe('showToolCall', () => {
		it('should format message with MCP Tool Called label and newline when parameters shown', () => {
			const mockNotice = jest.fn();
			(global as any).Notice = mockNotice;

			manager.showToolCall('read_note', { path: 'daily/2025-01-15.md' });

			expect(mockNotice).toHaveBeenCalledWith(
				expect.stringContaining('📖 MCP Tool Called: read_note\npath: "daily/2025-01-15.md"'),
				3000
			);
		});

		it('should format message without newline when parameters hidden', () => {
			settings.showParameters = false;
			manager = new NotificationManager(app, settings);
			const mockNotice = jest.fn();
			(global as any).Notice = mockNotice;

			manager.showToolCall('read_note', { path: 'daily/2025-01-15.md' });

			expect(mockNotice).toHaveBeenCalledWith(
				'📖 MCP Tool Called: read_note',
				3000
			);
		});

		it('should format multiple parameters correctly', () => {
			const mockNotice = jest.fn();
			(global as any).Notice = mockNotice;

			manager.showToolCall('search', {
				query: 'test query',
				folder: 'notes',
				recursive: true
			});

			expect(mockNotice).toHaveBeenCalledWith(
				expect.stringContaining('🔍 MCP Tool Called: search\nquery: "test query", folder: "notes", recursive: true'),
				3000
			);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/notifications.test.ts`
Expected: FAIL with test failures showing old format `🔧 MCP: read_note`

**Step 3: Update formatArgs to return unwrapped parameter string**

In `src/ui/notifications.ts`, modify the `formatArgs` method (lines 140-177):

```typescript
/**
 * Format arguments for display
 */
private formatArgs(args: any): string {
	if (!this.settings.showParameters) {
		return '';
	}

	if (!args || Object.keys(args).length === 0) {
		return '';
	}

	try {
		// Extract key parameters for display
		const keyParams: string[] = [];

		if (args.path) {
			keyParams.push(`path: "${this.truncateString(args.path, 30)}"`);
		}
		if (args.query) {
			keyParams.push(`query: "${this.truncateString(args.query, 30)}"`);
		}
		if (args.folder) {
			keyParams.push(`folder: "${this.truncateString(args.folder, 30)}"`);
		}
		if (args.recursive !== undefined) {
			keyParams.push(`recursive: ${args.recursive}`);
		}

		// If no key params, show first 50 chars of JSON
		if (keyParams.length === 0) {
			const json = JSON.stringify(args);
			return this.truncateString(json, 50);
		}

		return keyParams.join(', ');
	} catch (e) {
		return '';
	}
}
```

**Step 4: Update showToolCall to use new format**

In `src/ui/notifications.ts`, modify the `showToolCall` method (lines 77-94):

```typescript
/**
 * Show notification for tool call start
 */
showToolCall(toolName: string, args: any, duration?: number): void {
	if (!this.shouldShowNotification()) {
		return;
	}

	const icon = TOOL_ICONS[toolName] || '🔧';
	const argsStr = this.formatArgs(args);
	const message = argsStr
		? `${icon} MCP Tool Called: ${toolName}\n${argsStr}`
		: `${icon} MCP Tool Called: ${toolName}`;

	this.queueNotification(() => {
		new Notice(message, duration || this.settings.notificationDuration);
	});

	// Log to console if enabled
	if (this.settings.logToConsole) {
		console.log(`[MCP] Tool call: ${toolName}`, args);
	}
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- tests/notifications.test.ts`
Expected: PASS - all notification format tests pass

**Step 6: Run full test suite**

Run: `npm test`
Expected: PASS - all 569+ tests pass

**Step 7: Commit**

```bash
git add src/ui/notifications.ts tests/notifications.test.ts
git commit -m "feat: improve notification message clarity with MCP Tool Called label

- Update notification format to multi-line with explicit label
- First line: 'MCP Tool Called: tool_name'
- Second line: parameters (if enabled)
- Add comprehensive tests for notification formatting

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Fix Settings Section Collapse on Toggle

**Files:**
- Modify: `src/settings.ts:6-12` (add instance variable)
- Modify: `src/settings.ts:198-272` (notification section rendering)
- Test: Manual testing (UI component, hard to unit test)

**Step 1: Add instance variable for notification details element**

In `src/settings.ts`, add to the class properties (after line 7):

```typescript
export class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;
	private notificationDetailsEl: HTMLDetailsElement | null = null;

	constructor(app: App, plugin: MCPServerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
```

**Step 2: Store reference when creating notification section**

In `src/settings.ts`, modify the notification section creation (around line 199):

```typescript
// Notification Settings
const notifDetails = containerEl.createEl('details');
notifDetails.style.marginBottom = '20px';
const notifSummary = notifDetails.createEl('summary');
notifSummary.style.fontSize = '1.17em';
notifSummary.style.fontWeight = 'bold';
notifSummary.style.marginBottom = '12px';
notifSummary.style.cursor = 'pointer';
notifSummary.setText('UI Notifications');

// Store reference for targeted updates
this.notificationDetailsEl = notifDetails;
```

**Step 3: Create updateNotificationSection helper method**

In `src/settings.ts`, add new method after the `display()` method:

```typescript
/**
 * Update only the notification section without re-rendering entire page
 */
private updateNotificationSection(): void {
	if (!this.notificationDetailsEl) {
		// Fallback to full re-render if reference lost
		this.display();
		return;
	}

	// Store current open state
	const wasOpen = this.notificationDetailsEl.open;

	// Find and remove all child elements except the summary
	const summary = this.notificationDetailsEl.querySelector('summary');
	while (this.notificationDetailsEl.lastChild && this.notificationDetailsEl.lastChild !== summary) {
		this.notificationDetailsEl.removeChild(this.notificationDetailsEl.lastChild);
	}

	// Rebuild notification settings
	if (this.plugin.settings.notificationsEnabled) {
		// Show parameters
		new Setting(this.notificationDetailsEl)
			.setName('Show parameters')
			.setDesc('Include tool parameters in notifications')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showParameters)
				.onChange(async (value) => {
					this.plugin.settings.showParameters = value;
					await this.plugin.saveSettings();
					this.plugin.updateNotificationManager();
				}));

		// Notification duration
		new Setting(this.notificationDetailsEl)
			.setName('Notification duration')
			.setDesc('Duration in milliseconds')
			.addText(text => text
				.setPlaceholder('3000')
				.setValue(String(this.plugin.settings.notificationDuration))
				.onChange(async (value) => {
					const duration = parseInt(value);
					if (!isNaN(duration) && duration > 0) {
						this.plugin.settings.notificationDuration = duration;
						await this.plugin.saveSettings();
						this.plugin.updateNotificationManager();
					}
				}));

		// Log to console
		new Setting(this.notificationDetailsEl)
			.setName('Log to console')
			.setDesc('Log tool calls to console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.logToConsole)
				.onChange(async (value) => {
					this.plugin.settings.logToConsole = value;
					await this.plugin.saveSettings();
					this.plugin.updateNotificationManager();
				}));

		// View history button
		new Setting(this.notificationDetailsEl)
			.setName('Notification history')
			.setDesc('View recent MCP tool calls')
			.addButton(button => button
				.setButtonText('View History')
				.onClick(() => {
					this.plugin.showNotificationHistory();
				}));
	}

	// Restore open state
	this.notificationDetailsEl.open = wasOpen;
}
```

**Step 4: Update toggle handler to use targeted update**

In `src/settings.ts`, modify the "Enable notifications" toggle handler (around line 214):

```typescript
// Enable notifications
new Setting(notifDetails)
	.setName('Enable notifications')
	.setDesc('Show when MCP tools are called')
	.addToggle(toggle => toggle
		.setValue(this.plugin.settings.notificationsEnabled)
		.onChange(async (value) => {
			this.plugin.settings.notificationsEnabled = value;
			await this.plugin.saveSettings();
			this.plugin.updateNotificationManager();
			this.updateNotificationSection(); // Changed from this.display()
		}));
```

**Step 5: Manual testing**

Manual test steps:
1. Build: `npm run build`
2. Copy `main.js`, `manifest.json`, `styles.css` to test vault
3. Reload Obsidian
4. Open plugin settings
5. Expand "UI Notifications" section
6. Toggle "Enable notifications" off - verify section stays open
7. Toggle "Enable notifications" on - verify section stays open
8. Verify subsettings appear/disappear correctly

**Step 6: Commit**

```bash
git add src/settings.ts
git commit -m "fix: prevent notification settings section from collapsing on toggle

- Add targeted DOM update method for notification section
- Store reference to details element during initial render
- Replace full page re-render with targeted subsection update
- Preserve open/closed state during updates

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Fix Modal Filter Controls

**Files:**
- Modify: `src/ui/notification-history.ts:7-16` (add DOM reference properties)
- Modify: `src/ui/notification-history.ts:19-35` (onOpen method)
- Modify: `src/ui/notification-history.ts:44-87` (createFilters method)
- Modify: `src/ui/notification-history.ts:89-161` (refactor list rendering)
- Modify: `src/ui/notification-history.ts:193-214` (applyFilters method)
- Test: Manual testing (Modal UI component)

**Step 1: Add DOM reference instance variables**

In `src/ui/notification-history.ts`, update class properties (lines 7-16):

```typescript
export class NotificationHistoryModal extends Modal {
	private history: NotificationHistoryEntry[];
	private filteredHistory: NotificationHistoryEntry[];
	private filterTool: string = '';
	private filterType: 'all' | 'success' | 'error' = 'all';

	// DOM element references for targeted updates
	private listContainerEl: HTMLElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(app: App, history: NotificationHistoryEntry[]) {
		super(app);
		this.history = history;
		this.filteredHistory = [...history];
	}
```

**Step 2: Simplify onOpen to avoid re-rendering**

In `src/ui/notification-history.ts`, modify `onOpen` method (lines 19-35):

```typescript
onOpen() {
	const { contentEl } = this;
	contentEl.empty();
	contentEl.addClass('mcp-notification-history-modal');

	// Title
	contentEl.createEl('h2', { text: 'MCP Notification History' });

	// Filters (create once, never recreate)
	this.createFilters(contentEl);

	// History list (will be updated via reference)
	this.createHistoryListContainer(contentEl);

	// Actions
	this.createActions(contentEl);
}
```

**Step 3: Refactor createFilters to use Setting components**

In `src/ui/notification-history.ts`, replace the `createFilters` method (lines 44-87):

```typescript
/**
 * Create filter controls using Obsidian Setting components
 */
private createFilters(containerEl: HTMLElement): void {
	const filterContainer = containerEl.createDiv({ cls: 'mcp-history-filters' });
	filterContainer.style.marginBottom = '16px';

	// Tool name filter using Setting component
	new Setting(filterContainer)
		.setName('Tool filter')
		.setDesc('Filter by tool name')
		.addText(text => text
			.setPlaceholder('Enter tool name...')
			.setValue(this.filterTool)
			.onChange((value) => {
				this.filterTool = value.toLowerCase();
				this.applyFilters();
			}));

	// Type filter using Setting component
	new Setting(filterContainer)
		.setName('Status filter')
		.setDesc('Filter by success or error')
		.addDropdown(dropdown => dropdown
			.addOption('all', 'All')
			.addOption('success', 'Success')
			.addOption('error', 'Error')
			.setValue(this.filterType)
			.onChange((value) => {
				this.filterType = value as 'all' | 'success' | 'error';
				this.applyFilters();
			}));

	// Results count
	this.countEl = filterContainer.createDiv({ cls: 'mcp-history-count' });
	this.countEl.style.marginTop = '8px';
	this.countEl.style.fontSize = '0.9em';
	this.countEl.style.color = 'var(--text-muted)';
	this.updateResultsCount();
}
```

**Step 4: Create container and separate update method**

In `src/ui/notification-history.ts`, replace `createHistoryList` with two methods:

```typescript
/**
 * Create history list container (called once)
 */
private createHistoryListContainer(containerEl: HTMLElement): void {
	this.listContainerEl = containerEl.createDiv({ cls: 'mcp-history-list' });
	this.listContainerEl.style.maxHeight = '400px';
	this.listContainerEl.style.overflowY = 'auto';
	this.listContainerEl.style.marginBottom = '16px';
	this.listContainerEl.style.border = '1px solid var(--background-modifier-border)';
	this.listContainerEl.style.borderRadius = '4px';

	// Initial render
	this.updateHistoryList();
}

/**
 * Update history list contents (called on filter changes)
 */
private updateHistoryList(): void {
	if (!this.listContainerEl) return;

	// Clear existing content
	this.listContainerEl.empty();

	if (this.filteredHistory.length === 0) {
		const emptyEl = this.listContainerEl.createDiv({ cls: 'mcp-history-empty' });
		emptyEl.style.padding = '24px';
		emptyEl.style.textAlign = 'center';
		emptyEl.style.color = 'var(--text-muted)';
		emptyEl.textContent = 'No entries found';
		return;
	}

	this.filteredHistory.forEach((entry, index) => {
		const entryEl = this.listContainerEl!.createDiv({ cls: 'mcp-history-entry' });
		entryEl.style.padding = '12px';
		entryEl.style.borderBottom = index < this.filteredHistory.length - 1
			? '1px solid var(--background-modifier-border)'
			: 'none';

		// Header row
		const headerEl = entryEl.createDiv({ cls: 'mcp-history-entry-header' });
		headerEl.style.display = 'flex';
		headerEl.style.justifyContent = 'space-between';
		headerEl.style.marginBottom = '8px';

		// Tool name and status
		const titleEl = headerEl.createDiv();
		const statusIcon = entry.success ? '✅' : '❌';
		const toolName = titleEl.createEl('strong', { text: `${statusIcon} ${entry.toolName}` });
		toolName.style.color = entry.success ? 'var(--text-success)' : 'var(--text-error)';

		// Timestamp and duration
		const metaEl = headerEl.createDiv();
		metaEl.style.fontSize = '0.85em';
		metaEl.style.color = 'var(--text-muted)';
		const timestamp = new Date(entry.timestamp).toLocaleTimeString();
		const durationStr = entry.duration ? ` • ${entry.duration}ms` : '';
		metaEl.textContent = `${timestamp}${durationStr}`;

		// Arguments
		if (entry.args && Object.keys(entry.args).length > 0) {
			const argsEl = entryEl.createDiv({ cls: 'mcp-history-entry-args' });
			argsEl.style.fontSize = '0.85em';
			argsEl.style.fontFamily = 'monospace';
			argsEl.style.backgroundColor = 'var(--background-secondary)';
			argsEl.style.padding = '8px';
			argsEl.style.borderRadius = '4px';
			argsEl.style.marginBottom = '8px';
			argsEl.style.overflowX = 'auto';
			argsEl.textContent = JSON.stringify(entry.args, null, 2);
		}

		// Error message
		if (!entry.success && entry.error) {
			const errorEl = entryEl.createDiv({ cls: 'mcp-history-entry-error' });
			errorEl.style.fontSize = '0.85em';
			errorEl.style.color = 'var(--text-error)';
			errorEl.style.backgroundColor = 'var(--background-secondary)';
			errorEl.style.padding = '8px';
			errorEl.style.borderRadius = '4px';
			errorEl.style.fontFamily = 'monospace';
			errorEl.textContent = entry.error;
		}
	});
}

/**
 * Update results count display
 */
private updateResultsCount(): void {
	if (!this.countEl) return;
	this.countEl.textContent = `${this.filteredHistory.length} of ${this.history.length} entries`;
}
```

**Step 5: Update applyFilters to use targeted updates**

In `src/ui/notification-history.ts`, replace the `applyFilters` method (lines 193-214):

```typescript
/**
 * Apply filters to history
 */
private applyFilters(): void {
	this.filteredHistory = this.history.filter(entry => {
		// Tool name filter
		if (this.filterTool && !entry.toolName.toLowerCase().includes(this.filterTool)) {
			return false;
		}

		// Type filter
		if (this.filterType === 'success' && !entry.success) {
			return false;
		}
		if (this.filterType === 'error' && entry.success) {
			return false;
		}

		return true;
	});

	// Update only the affected UI elements
	this.updateHistoryList();
	this.updateResultsCount();
}
```

**Step 6: Add missing import**

In `src/ui/notification-history.ts`, update imports at the top:

```typescript
import { App, Modal, Setting } from 'obsidian';
import { NotificationHistoryEntry } from './notifications';
```

**Step 7: Manual testing**

Manual test steps:
1. Build: `npm run build`
2. Copy `main.js` to test vault
3. Reload Obsidian
4. Trigger some MCP tool calls (with different tools, some successes, some errors)
5. Open notification history modal
6. Test tool filter:
   - Type "read" - verify only read_* tools show
   - Clear filter - verify all entries return
7. Test status filter:
   - Select "Success" - verify only successful calls show
   - Select "Error" - verify only failed calls show
   - Select "All" - verify all entries return
8. Test combined filters
9. Verify results count updates correctly

**Step 8: Commit**

```bash
git add src/ui/notification-history.ts
git commit -m "fix: repair broken filter controls in notification history modal

- Replace raw HTML inputs with Obsidian Setting components
- Add DOM element references for targeted updates
- Eliminate destructive re-render on filter changes
- Update only list container and count on filter apply
- Fix tool filter input not accepting text
- Fix status dropdown not showing selection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (569+ tests)

**Step 2: Run type checking**

Run: `npm run build`
Expected: No TypeScript errors, successful build

**Step 3: Manual end-to-end testing**

Complete manual test checklist:
- [ ] Notifications display with "MCP Tool Called:" label
- [ ] Notifications show parameters on second line when enabled
- [ ] Notifications show single line when parameters disabled
- [ ] Toggling notifications on/off keeps section open
- [ ] Tool filter in history modal accepts text and filters
- [ ] Status dropdown in history modal shows selection
- [ ] Combined filters work correctly
- [ ] Results count updates correctly
- [ ] No regressions in existing functionality

**Step 4: Review commits**

Run: `git log --oneline master..HEAD`
Expected: See 3 clean commits for the 3 tasks

**Step 5: Ready for merge/PR**

The implementation is complete and ready for:
- Merge to master (if sole developer)
- Pull request (if team workflow)
- Use @superpowers:finishing-a-development-branch skill for next steps

---

## Implementation Notes

**TDD Applied:**
- Task 1 includes comprehensive test coverage for notification formatting
- Tasks 2-3 are UI components best tested manually
- All changes maintain existing test suite (569 tests pass)

**DRY Applied:**
- Reusable `updateNotificationSection()` method for settings updates
- Reusable `updateHistoryList()` and `updateResultsCount()` for modal updates
- Shared filter logic in `applyFilters()`

**YAGNI Applied:**
- No premature optimizations or extra features
- Minimal changes to fix reported issues
- No refactoring beyond what's needed

**Commits:**
- Frequent, focused commits (one per task)
- Clear commit messages with context
- Each commit is independently valuable

**Testing Strategy:**
- Unit tests for business logic (notification formatting)
- Manual testing for UI interactions (unavoidable with Obsidian API)
- Full test suite verification at each step
