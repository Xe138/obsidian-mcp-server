import { App, Modal } from 'obsidian';
import { NotificationHistoryEntry } from './notifications';

/**
 * Modal for viewing notification history
 */
export class NotificationHistoryModal extends Modal {
	private history: NotificationHistoryEntry[];
	private filteredHistory: NotificationHistoryEntry[];
	private filterTool: string = '';
	private filterType: 'all' | 'success' | 'error' = 'all';

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

		// Filters
		this.createFilters(contentEl);

		// History list
		this.createHistoryList(contentEl);

		// Actions
		this.createActions(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Create filter controls
	 */
	private createFilters(containerEl: HTMLElement): void {
		const filterContainer = containerEl.createDiv({ cls: 'mcp-history-filters' });
		filterContainer.style.marginBottom = '16px';
		filterContainer.style.display = 'flex';
		filterContainer.style.gap = '12px';
		filterContainer.style.flexWrap = 'wrap';

		// Tool name filter
		const toolFilterContainer = filterContainer.createDiv();
		toolFilterContainer.createEl('label', { text: 'Tool: ' });
		const toolInput = toolFilterContainer.createEl('input', {
			type: 'text',
			placeholder: 'Filter by tool name...'
		});
		toolInput.style.marginLeft = '4px';
		toolInput.style.padding = '4px 8px';
		toolInput.addEventListener('input', (e) => {
			this.filterTool = (e.target as HTMLInputElement).value.toLowerCase();
			this.applyFilters();
		});

		// Type filter
		const typeFilterContainer = filterContainer.createDiv();
		typeFilterContainer.createEl('label', { text: 'Type: ' });
		const typeSelect = typeFilterContainer.createEl('select');
		typeSelect.style.marginLeft = '4px';
		typeSelect.style.padding = '4px 8px';
		
		const allOption = typeSelect.createEl('option', { text: 'All', value: 'all' });
		const successOption = typeSelect.createEl('option', { text: 'Success', value: 'success' });
		const errorOption = typeSelect.createEl('option', { text: 'Error', value: 'error' });
		
		typeSelect.addEventListener('change', (e) => {
			this.filterType = (e.target as HTMLSelectElement).value as 'all' | 'success' | 'error';
			this.applyFilters();
		});

		// Results count
		const countEl = filterContainer.createDiv({ cls: 'mcp-history-count' });
		countEl.style.marginLeft = 'auto';
		countEl.style.alignSelf = 'center';
		countEl.textContent = `${this.filteredHistory.length} entries`;
	}

	/**
	 * Create history list
	 */
	private createHistoryList(containerEl: HTMLElement): void {
		const listContainer = containerEl.createDiv({ cls: 'mcp-history-list' });
		listContainer.style.maxHeight = '400px';
		listContainer.style.overflowY = 'auto';
		listContainer.style.marginBottom = '16px';
		listContainer.style.border = '1px solid var(--background-modifier-border)';
		listContainer.style.borderRadius = '4px';

		if (this.filteredHistory.length === 0) {
			const emptyEl = listContainer.createDiv({ cls: 'mcp-history-empty' });
			emptyEl.style.padding = '24px';
			emptyEl.style.textAlign = 'center';
			emptyEl.style.color = 'var(--text-muted)';
			emptyEl.textContent = 'No entries found';
			return;
		}

		this.filteredHistory.forEach((entry, index) => {
			const entryEl = listContainer.createDiv({ cls: 'mcp-history-entry' });
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

		// Re-render
		this.onOpen();
	}
}
