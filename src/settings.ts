import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { MCPPluginSettings } from './types/settings-types';
import MCPServerPlugin from './main';
import { generateApiKey } from './utils/auth-utils';

export class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;
	private notificationDetailsEl: HTMLDetailsElement | null = null;
	private authDetailsEl: HTMLDetailsElement | null = null;
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
				.setButtonText('View History')
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
		this.authDetailsEl = null;

		containerEl.createEl('h2', {text: 'MCP Server Settings'});

		// Server status
		containerEl.createEl('h3', {text: 'Server Status'});

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
			buttonContainer.createEl('button', {text: 'Stop Server'})
				.addEventListener('click', async () => {
					await this.plugin.stopServer();
					this.display();
				});

			buttonContainer.createEl('button', {text: 'Restart Server'})
				.addEventListener('click', async () => {
					await this.plugin.stopServer();
					await this.plugin.startServer();
					this.display();
				});
		} else {
			buttonContainer.createEl('button', {text: 'Start Server'})
				.addEventListener('click', async () => {
					await this.plugin.startServer();
					this.display();
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
		const authDetails = containerEl.createEl('details');
		authDetails.style.marginBottom = '20px';
		const authSummary = authDetails.createEl('summary');
		authSummary.style.fontSize = '1.17em';
		authSummary.style.fontWeight = 'bold';
		authSummary.style.marginBottom = '12px';
		authSummary.style.cursor = 'pointer';
		authSummary.setText('Authentication & Configuration');

		// Store reference for targeted updates
		this.authDetailsEl = authDetails;

		// API Key Display (always show - auth is always enabled)
		new Setting(authDetails)
			.setName('API Key Management')
			.setDesc('Use as Bearer token in Authorization header');

		// Create a full-width container for buttons and key display
		const apiKeyContainer = authDetails.createDiv({cls: 'mcp-api-key-section'});
		apiKeyContainer.style.marginBottom = '20px';
		apiKeyContainer.style.marginLeft = '0';

		// Create button container
		const apiKeyButtonContainer = apiKeyContainer.createDiv({cls: 'mcp-api-key-buttons'});
		apiKeyButtonContainer.style.display = 'flex';
		apiKeyButtonContainer.style.gap = '8px';
		apiKeyButtonContainer.style.marginBottom = '12px';

		// Copy button
		const copyButton = apiKeyButtonContainer.createEl('button', {text: '📋 Copy Key'});
		copyButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(this.plugin.settings.apiKey || '');
			new Notice('✅ API key copied to clipboard');
		});

		// Regenerate button
		const regenButton = apiKeyButtonContainer.createEl('button', {text: '🔄 Regenerate Key'});
		regenButton.addEventListener('click', async () => {
			this.plugin.settings.apiKey = generateApiKey();
			await this.plugin.saveSettings();
			new Notice('✅ New API key generated');
			if (this.plugin.mcpServer?.isRunning()) {
				new Notice('⚠️ Server restart required for API key changes to take effect');
			}
			this.display();
		});

		// API Key display (static, copyable text)
		const keyDisplayContainer = apiKeyContainer.createDiv({cls: 'mcp-api-key-display'});
		keyDisplayContainer.style.padding = '12px';
		keyDisplayContainer.style.backgroundColor = 'var(--background-secondary)';
		keyDisplayContainer.style.borderRadius = '4px';
		keyDisplayContainer.style.fontFamily = 'monospace';
		keyDisplayContainer.style.fontSize = '0.9em';
		keyDisplayContainer.style.wordBreak = 'break-all';
		keyDisplayContainer.style.userSelect = 'all';
		keyDisplayContainer.style.cursor = 'text';
		keyDisplayContainer.style.marginBottom = '16px';
		keyDisplayContainer.textContent = this.plugin.settings.apiKey || '';

		// MCP Client Configuration heading
		const configHeading = authDetails.createEl('h4', {text: 'MCP Client Configuration'});
		configHeading.style.marginTop = '24px';
		configHeading.style.marginBottom = '12px';

		const configContainer = authDetails.createDiv({cls: 'mcp-config-snippet'});
		configContainer.style.marginBottom = '20px';

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
			this.updateConfigSection();
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
			this.updateConfigSection();
		});

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
		if (!this.notificationDetailsEl) {
			// Fallback to full re-render if reference lost
			this.display();
			return;
		}

		// Store current open state
		const wasOpen = this.notificationDetailsEl.open;

		// Find and remove all child elements except the summary
		const summary = this.notificationDetailsEl.querySelector('summary');
		// Remove children that come after the summary
		const children = Array.from(this.notificationDetailsEl.children);
		for (const child of children) {
			if (child !== summary) {
				this.notificationDetailsEl.removeChild(child);
			}
		}

		// Rebuild notification settings
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
		if (!this.authDetailsEl) {
			// Fallback to full re-render if reference lost
			this.display();
			return;
		}

		// Store current open state
		const wasOpen = this.authDetailsEl.open;

		// Find the config container element (it's under the authDetails)
		const configContainer = this.authDetailsEl.querySelector('.mcp-config-snippet');
		if (!configContainer) {
			// If we can't find it, just do a full re-render
			this.display();
			return;
		}

		// Clear the config container
		configContainer.empty();

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
			this.updateConfigSection();
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
			this.updateConfigSection();
		});

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

		// Restore open state
		this.authDetailsEl.open = wasOpen;
	}
}
