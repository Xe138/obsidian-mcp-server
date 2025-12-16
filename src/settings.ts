import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import MCPServerPlugin from './main';
import { generateApiKey } from './utils/auth-utils';

export class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;
	private notificationDetailsEl: HTMLDetailsElement | null = null;
	private notificationToggleEl: HTMLElement | null = null;
	private authDetailsEl: HTMLDetailsElement | null = null;
	private configContainerEl: HTMLElement | null = null;
	private activeConfigTab: 'windsurf' | 'claude-code' = 'windsurf';

	constructor(app: App, plugin: MCPServerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Render notification settings (Show parameters, Notification duration, Log to console, View history)
	 */
	private renderNotificationSettings(parent: HTMLElement): void {
		// Show parameters
		new Setting(parent)
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
		new Setting(parent)
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
		new Setting(parent)
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
		new Setting(parent)
			.setName('Notification history')
			.setDesc('View recent MCP tool calls')
			.addButton(button => button
				.setButtonText('View history')
				.onClick(() => {
					this.plugin.showNotificationHistory();
				}));
	}

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

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Clear references for fresh render
		this.notificationDetailsEl = null;
		this.notificationToggleEl = null;
		this.authDetailsEl = null;
		this.configContainerEl = null;

		new Setting(containerEl)
			.setHeading()
			.setName('MCP server settings');

		// Server status
		new Setting(containerEl)
			.setHeading()
			.setName('Server status');

		const statusEl = containerEl.createEl('div', {cls: 'mcp-server-status'});
		const isRunning = this.plugin.mcpServer?.isRunning() ?? false;

		statusEl.createEl('p', {
			text: isRunning
				? `✅ Running on http://127.0.0.1:${this.plugin.settings.port}/mcp`
				: '⭕ Stopped'
		});

		// Control buttons
		const buttonContainer = containerEl.createEl('div', {cls: 'mcp-button-container'});

		if (isRunning) {
			buttonContainer.createEl('button', {text: 'Stop server'})
				.addEventListener('click', () => {
					void (async () => {
						await this.plugin.stopServer();
						this.display();
					})();
				});

			buttonContainer.createEl('button', {text: 'Restart server'})
				.addEventListener('click', () => {
					void (async () => {
						await this.plugin.stopServer();
						await this.plugin.startServer();
						this.display();
					})();
				});
		} else {
			buttonContainer.createEl('button', {text: 'Start server'})
				.addEventListener('click', () => {
					void (async () => {
						await this.plugin.startServer();
						this.display();
					})();
				});
		}

		// Auto-start setting
		new Setting(containerEl)
			.setName('Auto-start server')
			.setDesc('Start server when Obsidian launches')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStart)
				.onChange(async (value) => {
					this.plugin.settings.autoStart = value;
					await this.plugin.saveSettings();
				}));

		// Port setting
		new Setting(containerEl)
			.setName('Port')
			.setDesc('Server port (restart required)')
			.addText(text => text
				.setPlaceholder('3000')
				.setValue(String(this.plugin.settings.port))
				.onChange(async (value) => {
					const port = parseInt(value);
					if (!isNaN(port) && port > 0 && port < 65536) {
						this.plugin.settings.port = port;
						await this.plugin.saveSettings();
						if (this.plugin.mcpServer?.isRunning()) {
							new Notice('⚠️ Server restart required for port changes to take effect');
						}
					}
				}));

		// Authentication (Always Enabled)
		const authDetails = containerEl.createEl('details', {cls: 'mcp-auth-section'});
		const authSummary = authDetails.createEl('summary', {cls: 'mcp-auth-summary'});
		authSummary.setText('Authentication & configuration');

		// Store reference for targeted updates
		this.authDetailsEl = authDetails;

		// API Key Display (always show - auth is always enabled)
		new Setting(authDetails)
			.setName('API key management')
			.setDesc('Use as Bearer token in Authorization header');

		// Create a full-width container for buttons and key display
		const apiKeyContainer = authDetails.createDiv({cls: 'mcp-container'});

		// Create button container
		const apiKeyButtonContainer = apiKeyContainer.createDiv({cls: 'mcp-button-group'});

		// Copy button
		const copyButton = apiKeyButtonContainer.createEl('button', {text: '📋 Copy key'});
		copyButton.addEventListener('click', () => {
			void (async () => {
				await navigator.clipboard.writeText(this.plugin.settings.apiKey || '');
				new Notice('✅ API key copied to clipboard');
			})();
		});

		// Regenerate button
		const regenButton = apiKeyButtonContainer.createEl('button', {text: '🔄 Regenerate key'});
		regenButton.addEventListener('click', () => {
			void (async () => {
				this.plugin.settings.apiKey = generateApiKey();
				await this.plugin.saveSettings();
				new Notice('✅ New API key generated');
				if (this.plugin.mcpServer?.isRunning()) {
					new Notice('⚠️ Server restart required for API key changes to take effect');
				}
				this.display();
			})();
		});

		// API Key display (static, copyable text)
		const keyDisplayContainer = apiKeyContainer.createDiv({cls: 'mcp-key-display'});
		keyDisplayContainer.textContent = this.plugin.settings.apiKey || '';

		// MCP Client Configuration heading
		new Setting(authDetails)
			.setHeading()
			.setName('MCP client configuration');

		const configContainer = authDetails.createDiv({cls: 'mcp-container'});

		// Store reference for targeted updates
		this.configContainerEl = configContainer;

		// Tab buttons for switching between clients
		const tabContainer = configContainer.createDiv({cls: 'mcp-config-tabs'});

		// Windsurf tab button
		const windsurfTab = tabContainer.createEl('button', {
			text: 'Windsurf',
			cls: this.activeConfigTab === 'windsurf' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
		});
		windsurfTab.addEventListener('click', () => {
			this.activeConfigTab = 'windsurf';
			this.updateConfigSection();
		});

		// Claude Code tab button
		const claudeCodeTab = tabContainer.createEl('button', {
			text: 'Claude Code',
			cls: this.activeConfigTab === 'claude-code' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
		});
		claudeCodeTab.addEventListener('click', () => {
			this.activeConfigTab = 'claude-code';
			this.updateConfigSection();
		});

		// Get configuration for active tab
		const {filePath, config, usageNote} = this.generateConfigForClient(this.activeConfigTab);

		// Tab content area
		const tabContent = configContainer.createDiv({cls: 'mcp-config-content'});

		// File location label
		tabContent.createEl('p', {text: 'Configuration file location:', cls: 'mcp-label'});

		// File path display
		tabContent.createEl('div', {text: filePath, cls: 'mcp-file-path'});

		// Copy button
		const copyConfigButton = tabContent.createEl('button', {
			text: '📋 Copy configuration',
			cls: 'mcp-config-button'
		});
		copyConfigButton.addEventListener('click', () => {
			void (async () => {
				await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
				new Notice('✅ Configuration copied to clipboard');
			})();
		});

		// Config JSON display
		const configDisplay = tabContent.createEl('pre', {cls: 'mcp-config-display'});
		configDisplay.textContent = JSON.stringify(config, null, 2);

		// Usage note
		tabContent.createEl('p', {text: usageNote, cls: 'mcp-usage-note'});

		// Notification Settings
		const notifDetails = containerEl.createEl('details', {cls: 'mcp-auth-section'});
		const notifSummary = notifDetails.createEl('summary', {cls: 'mcp-auth-summary'});
		notifSummary.setText('UI notifications');

		// Store reference for targeted updates
		this.notificationDetailsEl = notifDetails;

		// Enable notifications - create container for the toggle setting
		const notificationToggleContainer = notifDetails.createDiv({cls: 'mcp-notification-toggle'});
		this.notificationToggleEl = notificationToggleContainer;

		new Setting(notificationToggleContainer)
			.setName('Enable notifications')
			.setDesc('Show when MCP tools are called')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notificationsEnabled)
				.onChange(async (value) => {
					this.plugin.settings.notificationsEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateNotificationManager();
					this.updateNotificationSection();
				}));

		// Show notification settings only if enabled
		if (this.plugin.settings.notificationsEnabled) {
			this.renderNotificationSettings(notifDetails);
		}
	}

	/**
	 * Update only the notification section without re-rendering entire page
	 */
	private updateNotificationSection(): void {
		if (!this.notificationDetailsEl || !this.notificationToggleEl) {
			// Fallback to full re-render if reference lost
			this.display();
			return;
		}

		// Store current open state
		const wasOpen = this.notificationDetailsEl.open;

		// Remove all children except the summary and the toggle container
		const summary = this.notificationDetailsEl.querySelector('summary');
		const children = Array.from(this.notificationDetailsEl.children);
		for (const child of children) {
			if (child !== summary && child !== this.notificationToggleEl) {
				this.notificationDetailsEl.removeChild(child);
			}
		}

		// Rebuild notification settings only if enabled
		if (this.plugin.settings.notificationsEnabled) {
			this.renderNotificationSettings(this.notificationDetailsEl);
		}

		// Restore open state
		this.notificationDetailsEl.open = wasOpen;
	}

	/**
	 * Update only the config section without re-rendering entire page
	 */
	private updateConfigSection(): void {
		if (!this.configContainerEl) {
			// Fallback to full re-render if reference lost
			this.display();
			return;
		}

		// Store current open state of the auth details
		const wasOpen = this.authDetailsEl?.open ?? false;

		// Clear the config container
		this.configContainerEl.empty();

		// Tab buttons for switching between clients
		const tabContainer = this.configContainerEl.createDiv({cls: 'mcp-config-tabs'});

		// Windsurf tab button
		const windsurfTab = tabContainer.createEl('button', {
			text: 'Windsurf',
			cls: this.activeConfigTab === 'windsurf' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
		});
		windsurfTab.addEventListener('click', () => {
			this.activeConfigTab = 'windsurf';
			this.updateConfigSection();
		});

		// Claude Code tab button
		const claudeCodeTab = tabContainer.createEl('button', {
			text: 'Claude Code',
			cls: this.activeConfigTab === 'claude-code' ? 'mcp-tab mcp-tab-active' : 'mcp-tab'
		});
		claudeCodeTab.addEventListener('click', () => {
			this.activeConfigTab = 'claude-code';
			this.updateConfigSection();
		});

		// Get configuration for active tab
		const {filePath, config, usageNote} = this.generateConfigForClient(this.activeConfigTab);

		// Tab content area
		const tabContent = this.configContainerEl.createDiv({cls: 'mcp-config-content'});

		// File location label
		tabContent.createEl('p', {text: 'Configuration file location:', cls: 'mcp-label'});

		// File path display
		tabContent.createEl('div', {text: filePath, cls: 'mcp-file-path'});

		// Copy button
		const copyConfigButton = tabContent.createEl('button', {
			text: '📋 Copy configuration',
			cls: 'mcp-config-button'
		});
		copyConfigButton.addEventListener('click', () => {
			void (async () => {
				await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
				new Notice('✅ Configuration copied to clipboard');
			})();
		});

		// Config JSON display
		const configDisplay = tabContent.createEl('pre', {cls: 'mcp-config-display'});
		configDisplay.textContent = JSON.stringify(config, null, 2);

		// Usage note
		tabContent.createEl('p', {text: usageNote, cls: 'mcp-usage-note'});

		// Restore open state (only if authDetailsEl is available)
		if (this.authDetailsEl) {
			this.authDetailsEl.open = wasOpen;
		}
	}
}
