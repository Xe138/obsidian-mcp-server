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

		// Network disclosure
		const disclosureEl = containerEl.createEl('div', {cls: 'mcp-disclosure'});
		disclosureEl.createEl('p', {
			text: '⚠️ This plugin runs a local HTTP server to expose vault operations via the Model Context Protocol (MCP). The server only accepts connections from localhost (127.0.0.1) for security.'
		});
		disclosureEl.style.backgroundColor = 'var(--background-secondary)';
		disclosureEl.style.padding = '12px';
		disclosureEl.style.marginBottom = '16px';
		disclosureEl.style.borderRadius = '4px';

		// Auto-start setting
		new Setting(containerEl)
			.setName('Auto-start server')
			.setDesc('Automatically start the MCP server when Obsidian launches')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStart)
				.onChange(async (value) => {
					this.plugin.settings.autoStart = value;
					await this.plugin.saveSettings();
				}));

		// Port setting
		new Setting(containerEl)
			.setName('Port')
			.setDesc('Port number for the HTTP server (requires restart)')
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

		// CORS setting
		new Setting(containerEl)
			.setName('Enable CORS')
			.setDesc('Enable Cross-Origin Resource Sharing (requires restart)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCORS)
				.onChange(async (value) => {
					this.plugin.settings.enableCORS = value;
					await this.plugin.saveSettings();
					if (this.plugin.mcpServer?.isRunning()) {
						new Notice('⚠️ Server restart required for CORS changes to take effect');
					}
				}));

		// Allowed origins
		new Setting(containerEl)
			.setName('Allowed origins')
			.setDesc('Comma-separated list of allowed origins (* for all, requires restart)')
			.addText(text => text
				.setPlaceholder('*')
				.setValue(this.plugin.settings.allowedOrigins.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.allowedOrigins = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
					if (this.plugin.mcpServer?.isRunning()) {
						new Notice('⚠️ Server restart required for origin changes to take effect');
					}
				}));

		// Authentication
		new Setting(containerEl)
			.setName('Enable authentication')
			.setDesc('Require API key for requests (requires restart)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAuth)
				.onChange(async (value) => {
					this.plugin.settings.enableAuth = value;
					
					// Auto-generate API key when enabling authentication
					if (value && (!this.plugin.settings.apiKey || this.plugin.settings.apiKey.trim() === '')) {
						this.plugin.settings.apiKey = generateApiKey();
						new Notice('✅ API key generated automatically');
					}
					
					await this.plugin.saveSettings();
					if (this.plugin.mcpServer?.isRunning()) {
						new Notice('⚠️ Server restart required for authentication changes to take effect');
					}
					
					// Refresh the display to show the new key
					this.display();
				}));

		// API Key Display (only show if authentication is enabled)
		if (this.plugin.settings.enableAuth) {
			new Setting(containerEl)
				.setName('API Key Management')
				.setDesc('Use this key in the Authorization header as Bearer token');

			// Create a full-width container for buttons and key display
			const apiKeyContainer = containerEl.createDiv({cls: 'mcp-api-key-section'});
			apiKeyContainer.style.marginBottom = '20px';
			apiKeyContainer.style.marginLeft = '0';

			// Create button container
			const buttonContainer = apiKeyContainer.createDiv({cls: 'mcp-api-key-buttons'});
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '8px';
			buttonContainer.style.marginBottom = '12px';

			// Copy button
			const copyButton = buttonContainer.createEl('button', {text: '📋 Copy Key'});
			copyButton.addEventListener('click', async () => {
				await navigator.clipboard.writeText(this.plugin.settings.apiKey || '');
				new Notice('✅ API key copied to clipboard');
			});

			// Regenerate button
			const regenButton = buttonContainer.createEl('button', {text: '🔄 Regenerate Key'});
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
		}

		// MCP Client Configuration (show always, regardless of auth)
		containerEl.createEl('h3', {text: 'MCP Client Configuration'});
		
		const configContainer = containerEl.createDiv({cls: 'mcp-config-snippet'});
		configContainer.style.marginBottom = '20px';
		
		const configDesc = configContainer.createEl('p', {
			text: 'Add this configuration to your MCP client (e.g., Claude Desktop, Cline):'
		});
		configDesc.style.marginBottom = '8px';
		configDesc.style.fontSize = '0.9em';
		configDesc.style.color = 'var(--text-muted)';

		// Generate JSON config based on auth settings
		const mcpConfig: any = {
			"mcpServers": {
				"obsidian-mcp": {
					"serverUrl": `http://127.0.0.1:${this.plugin.settings.port}/mcp`
				}
			}
		};

		// Only add headers if authentication is enabled
		if (this.plugin.settings.enableAuth && this.plugin.settings.apiKey) {
			mcpConfig.mcpServers["obsidian-mcp"].headers = {
				"Authorization": `Bearer ${this.plugin.settings.apiKey}`
			};
		}

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

		// Server status
		containerEl.createEl('h3', {text: 'Server Status'});
		
		const statusEl = containerEl.createEl('div', {cls: 'mcp-server-status'});
		const isRunning = this.plugin.mcpServer?.isRunning() ?? false;
		
		statusEl.createEl('p', {
			text: isRunning 
				? `✅ Server is running on http://127.0.0.1:${this.plugin.settings.port}/mcp`
				: '⭕ Server is stopped'
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
	}
}
