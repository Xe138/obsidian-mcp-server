import { Notice, Plugin } from 'obsidian';
import { MCPServer } from './server/mcp-server';
import { MCPPluginSettings, DEFAULT_SETTINGS } from './types/settings-types';
import { MCPServerSettingTab } from './settings';
import { NotificationManager } from './ui/notifications';
import { NotificationHistoryModal } from './ui/notification-history';

export default class MCPServerPlugin extends Plugin {
	settings!: MCPPluginSettings;
	mcpServer: MCPServer | null = null;
	statusBarItem: HTMLElement | null = null;
	notificationManager: NotificationManager | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize notification manager
		this.updateNotificationManager();

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();

		// Add ribbon icon to toggle server
		this.addRibbonIcon('server', 'Toggle MCP Server', async () => {
			if (this.mcpServer?.isRunning()) {
				await this.stopServer();
			} else {
				await this.startServer();
			}
		});

		// Register commands
		this.addCommand({
			id: 'start-mcp-server',
			name: 'Start MCP Server',
			callback: async () => {
				await this.startServer();
			}
		});

		this.addCommand({
			id: 'stop-mcp-server',
			name: 'Stop MCP Server',
			callback: async () => {
				await this.stopServer();
			}
		});

		this.addCommand({
			id: 'restart-mcp-server',
			name: 'Restart MCP Server',
			callback: async () => {
				await this.stopServer();
				await this.startServer();
			}
		});

		this.addCommand({
			id: 'view-notification-history',
			name: 'View MCP Notification History',
			callback: () => {
				this.showNotificationHistory();
			}
		});

		// Add settings tab
		this.addSettingTab(new MCPServerSettingTab(this.app, this));

		// Auto-start if enabled
		if (this.settings.autoStart) {
			await this.startServer();
		}
	}

	async onunload() {
		await this.stopServer();
	}

	async startServer() {
		if (this.mcpServer?.isRunning()) {
			new Notice('MCP Server is already running');
			return;
		}

		// Validate authentication configuration
		if (this.settings.enableAuth && (!this.settings.apiKey || this.settings.apiKey.trim() === '')) {
			new Notice('⚠️ Cannot start server: Authentication is enabled but no API key is set. Please set an API key in settings or disable authentication.');
			return;
		}

		try {
			this.mcpServer = new MCPServer(this.app, this.settings);
			// Set notification manager if notifications are enabled
			if (this.notificationManager) {
				this.mcpServer.setNotificationManager(this.notificationManager);
			}
			await this.mcpServer.start();
			new Notice(`MCP Server started on port ${this.settings.port}`);
			this.updateStatusBar();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to start MCP Server: ${message}`);
			console.error('MCP Server start error:', error);
		}
	}

	async stopServer() {
		if (!this.mcpServer?.isRunning()) {
			new Notice('MCP Server is not running');
			return;
		}

		try {
			await this.mcpServer.stop();
			new Notice('MCP Server stopped');
			this.updateStatusBar();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to stop MCP Server: ${message}`);
			console.error('MCP Server stop error:', error);
		}
	}

	updateStatusBar() {
		if (this.statusBarItem) {
			const isRunning = this.mcpServer?.isRunning() ?? false;
			this.statusBarItem.setText(
				isRunning 
					? `MCP: Running (${this.settings.port})` 
					: 'MCP: Stopped'
			);
			this.statusBarItem.addClass('mcp-status-bar');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.mcpServer) {
			this.mcpServer.updateSettings(this.settings);
		}
	}

	/**
	 * Update or create notification manager based on settings
	 */
	updateNotificationManager() {
		if (this.settings.notificationsEnabled) {
			if (!this.notificationManager) {
				this.notificationManager = new NotificationManager(this.app, this.settings);
			} else {
				this.notificationManager.updateSettings(this.settings);
			}
			
			// Update server's tool registry if server is running
			if (this.mcpServer) {
				this.mcpServer.setNotificationManager(this.notificationManager);
			}
		} else {
			this.notificationManager = null;
			
			// Clear notification manager from server if running
			if (this.mcpServer) {
				this.mcpServer.setNotificationManager(null);
			}
		}
	}

	/**
	 * Show notification history modal
	 */
	showNotificationHistory() {
		if (!this.notificationManager) {
			new Notice('Notifications are not enabled. Enable them in settings to view history.');
			return;
		}

		const history = this.notificationManager.getHistory();
		const modal = new NotificationHistoryModal(this.app, history);
		modal.open();
	}
}
