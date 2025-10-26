import { App, Notice } from 'obsidian';
import { MCPPluginSettings } from '../types/settings-types';

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
	timestamp: number;
	toolName: string;
	args: any;
	success: boolean;
	duration?: number;
	error?: string;
}

/**
 * Tool icon mapping
 */
const TOOL_ICONS: Record<string, string> = {
	read_note: '📖',
	read_excalidraw: '📖',
	create_note: '✏️',
	update_note: '✏️',
	update_frontmatter: '✏️',
	update_sections: '✏️',
	delete_note: '🗑️',
	rename_file: '📝',
	search: '🔍',
	search_waypoints: '🔍',
	list: '📋',
	list_notes: '📋',
	stat: '📊',
	exists: '📊',
	get_vault_info: 'ℹ️',
	get_folder_waypoint: '🗺️',
	is_folder_note: '📁',
	validate_wikilinks: '🔗',
	resolve_wikilink: '🔗',
	backlinks: '🔗'
};

/**
 * Notification manager for MCP tool calls
 * Displays notifications in the Obsidian UI with rate limiting
 */
export class NotificationManager {
	private app: App;
	private settings: MCPPluginSettings;
	private history: NotificationHistoryEntry[] = [];
	private maxHistorySize = 100;
	
	// Rate limiting
	private notificationQueue: Array<() => void> = [];
	private isProcessingQueue = false;
	private maxNotificationsPerSecond = 10;
	private notificationInterval = 1000 / this.maxNotificationsPerSecond; // 100ms between notifications
	
	// Batching
	private pendingToolCalls: Map<string, number> = new Map();
	private batchTimeout: NodeJS.Timeout | null = null;

	constructor(app: App, settings: MCPPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Update settings reference
	 */
	updateSettings(settings: MCPPluginSettings): void {
		this.settings = settings;
	}

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


	/**
	 * Add entry to notification history
	 */
	addToHistory(entry: NotificationHistoryEntry): void {
		this.history.unshift(entry);
		
		// Limit history size
		if (this.history.length > this.maxHistorySize) {
			this.history = this.history.slice(0, this.maxHistorySize);
		}
	}

	/**
	 * Get notification history
	 */
	getHistory(): NotificationHistoryEntry[] {
		return [...this.history];
	}

	/**
	 * Clear notification history
	 */
	clearHistory(): void {
		this.history = [];
	}

	/**
	 * Clear all active notifications (not possible with Obsidian API)
	 */
	clearAll(): void {
		// Obsidian doesn't provide API to clear notices
		// This is a no-op for compatibility
	}

	/**
	 * Check if notification should be shown
	 */
	private shouldShowNotification(): boolean {
		return this.settings.notificationsEnabled;
	}

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

	/**
	 * Truncate string to max length
	 */
	private truncateString(str: string, maxLength: number): string {
		if (str.length <= maxLength) {
			return str;
		}
		return str.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Queue notification with rate limiting
	 */
	private queueNotification(notificationFn: () => void): void {
		this.notificationQueue.push(notificationFn);
		
		if (!this.isProcessingQueue) {
			this.processQueue();
		}
	}

	/**
	 * Process notification queue with rate limiting
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;

		while (this.notificationQueue.length > 0) {
			const notificationFn = this.notificationQueue.shift();
			
			if (notificationFn) {
				notificationFn();
			}

			// Wait before processing next notification
			if (this.notificationQueue.length > 0) {
				await this.sleep(this.notificationInterval);
			}
		}

		this.isProcessingQueue = false;
	}

	/**
	 * Sleep helper
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
