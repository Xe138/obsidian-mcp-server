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
		this.updateResultsCount();
	}

	/**
	 * Create history list container (called once)
	 */
	private createHistoryListContainer(containerEl: HTMLElement): void {
		this.listContainerEl = containerEl.createDiv({ cls: 'mcp-history-list' });

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
			emptyEl.textContent = 'No entries found';
			return;
		}

		this.filteredHistory.forEach((entry, index) => {
			const entryEl = this.listContainerEl!.createDiv({ cls: 'mcp-history-entry' });

			// Add border class to all entries except the last one
			if (index < this.filteredHistory.length - 1) {
				entryEl.addClass('mcp-history-entry-border');
			}

			// Header row
			const headerEl = entryEl.createDiv({ cls: 'mcp-history-entry-header' });

			// Tool name and status
			const titleEl = headerEl.createDiv();
			const statusIcon = entry.success ? '✅' : '❌';
			const toolName = titleEl.createEl('strong', { text: `${statusIcon} ${entry.toolName}` });

			// Add dynamic color class based on success/error
			toolName.addClass(entry.success ? 'mcp-history-entry-title-success' : 'mcp-history-entry-title-error');

			// Timestamp and duration
			const metaEl = headerEl.createDiv({ cls: 'mcp-history-entry-header-meta' });
			const timestamp = new Date(entry.timestamp).toLocaleTimeString();
			const durationStr = entry.duration ? ` • ${entry.duration}ms` : '';
			metaEl.textContent = `${timestamp}${durationStr}`;

			// Arguments
			if (entry.args && Object.keys(entry.args).length > 0) {
				const argsEl = entryEl.createDiv({ cls: 'mcp-history-entry-args' });
				argsEl.textContent = JSON.stringify(entry.args, null, 2);
			}

			// Error message
			if (!entry.success && entry.error) {
				const errorEl = entryEl.createDiv({ cls: 'mcp-history-entry-error' });
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
