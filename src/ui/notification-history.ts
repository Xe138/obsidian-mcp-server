import { App, Modal, Setting } from 'obsidian';
import { NotificationHistoryEntry } from './notifications';

/**
 * Modal for viewing notification history
 */
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

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.listContainerEl = null;
		this.countEl = null;
	}

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

	/**
	 * Create action buttons
	 */
	private createActions(containerEl: HTMLElement): void {
		const actionsContainer = containerEl.createDiv({ cls: 'mcp-history-actions' });
		actionsContainer.style.display = 'flex';
		actionsContainer.style.gap = '8px';
		actionsContainer.style.justifyContent = 'flex-end';

		// Export button
		const exportButton = actionsContainer.createEl('button', { text: 'Export to Clipboard' });
		exportButton.addEventListener('click', async () => {
			const exportData = JSON.stringify(this.filteredHistory, null, 2);
			await navigator.clipboard.writeText(exportData);
			// Show temporary success message
			exportButton.textContent = '✅ Copied!';
			setTimeout(() => {
				exportButton.textContent = 'Export to Clipboard';
			}, 2000);
		});

		// Close button
		const closeButton = actionsContainer.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

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
}
