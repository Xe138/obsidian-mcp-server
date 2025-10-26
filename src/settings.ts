import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { MCPPluginSettings } from './types/settings-types';
import MCPServerPlugin from './main';
import { generateApiKey } from './utils/auth-utils';

export class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;

	constructor(app: App, plugin: MCPServerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'MCP Server Settings'});

		// Server status
		containerEl.createEl('h3', {text: 'Server Status'});

		const statusEl = containerEl.createEl('div', {cls: 'mcp-server-status'});
		const isRunning = this.plugin.mcpServer?.isRunning() ?? false;

		statusEl.createEl('p', {
			text: isRunning
				? `✅ Running on port ${this.plugin.settings.port}`
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
		authSummary.setText('Authentication');

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

		// MCP Client Configuration (show always, regardless of auth)
		const configDetails = authDetails.createEl('details');
		configDetails.style.marginTop = '16px';
		const configSummary = configDetails.createEl('summary');
		configSummary.style.fontSize = '1em';
		configSummary.style.fontWeight = 'bold';
		configSummary.style.marginBottom = '8px';
		configSummary.style.cursor = 'pointer';
		configSummary.setText('MCP Client Configuration');

		const configContainer = configDetails.createDiv({cls: 'mcp-config-snippet'});
		configContainer.style.marginBottom = '20px';
		
		const configDesc = configContainer.createEl('p', {
			text: 'Add to your MCP client config:'
		});
		configDesc.style.marginBottom = '8px';
		configDesc.style.fontSize = '0.9em';
		configDesc.style.color = 'var(--text-muted)';

		// Generate JSON config (auth always included)
		const mcpConfig = {
			"mcpServers": {
				"obsidian-mcp": {
					"serverUrl": `http://127.0.0.1:${this.plugin.settings.port}/mcp`,
					"headers": {
						"Authorization": `Bearer ${this.plugin.settings.apiKey || 'YOUR_API_KEY_HERE'}`
					}
				}
			}
		};

		// Config display with copy button
		const configButtonContainer = configContainer.createDiv();
		configButtonContainer.style.display = 'flex';
		configButtonContainer.style.gap = '8px';
		configButtonContainer.style.marginBottom = '8px';

		const copyConfigButton = configButtonContainer.createEl('button', {text: '📋 Copy Configuration'});
		copyConfigButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
			new Notice('✅ Configuration copied to clipboard');
		});

		const configDisplay = configContainer.createEl('pre');
		configDisplay.style.padding = '12px';
		configDisplay.style.backgroundColor = 'var(--background-secondary)';
		configDisplay.style.borderRadius = '4px';
		configDisplay.style.fontSize = '0.85em';
		configDisplay.style.overflowX = 'auto';
		configDisplay.style.userSelect = 'text';
		configDisplay.style.cursor = 'text';
		configDisplay.textContent = JSON.stringify(mcpConfig, null, 2);

		// Notification Settings
		const notifDetails = containerEl.createEl('details');
		notifDetails.style.marginBottom = '20px';
		const notifSummary = notifDetails.createEl('summary');
		notifSummary.style.fontSize = '1.17em';
		notifSummary.style.fontWeight = 'bold';
		notifSummary.style.marginBottom = '12px';
		notifSummary.style.cursor = 'pointer';
		notifSummary.setText('UI Notifications');

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
					this.display();
				}));

		// Show notification settings only if enabled
		if (this.plugin.settings.notificationsEnabled) {
			// Show parameters
			new Setting(notifDetails)
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
			new Setting(notifDetails)
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
			new Setting(notifDetails)
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
			new Setting(notifDetails)
				.setName('Notification history')
				.setDesc('View recent MCP tool calls')
				.addButton(button => button
					.setButtonText('View History')
					.onClick(() => {
						this.plugin.showNotificationHistory();
					}));
		}
	}
}
