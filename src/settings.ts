import { App, PluginSettingTab, Setting } from 'obsidian';
import { MCPPluginSettings } from './types/settings-types';
import MCPServerPlugin from './main';

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
					}
				}));

		// CORS setting
		new Setting(containerEl)
			.setName('Enable CORS')
			.setDesc('Enable Cross-Origin Resource Sharing')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCORS)
				.onChange(async (value) => {
					this.plugin.settings.enableCORS = value;
					await this.plugin.saveSettings();
				}));

		// Allowed origins
		new Setting(containerEl)
			.setName('Allowed origins')
			.setDesc('Comma-separated list of allowed origins (* for all)')
			.addText(text => text
				.setPlaceholder('*')
				.setValue(this.plugin.settings.allowedOrigins.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.allowedOrigins = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
				}));

		// Authentication
		new Setting(containerEl)
			.setName('Enable authentication')
			.setDesc('Require API key for requests')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAuth)
				.onChange(async (value) => {
					this.plugin.settings.enableAuth = value;
					await this.plugin.saveSettings();
				}));

		// API Key
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('API key for authentication (Bearer token)')
			.addText(text => text
				.setPlaceholder('Enter API key')
				.setValue(this.plugin.settings.apiKey || '')
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

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
			infoEl.createEl('code', {text: `http://127.0.0.1:${this.plugin.settings.port}/mcp`});
			
			infoEl.createEl('p', {text: 'Health Check:'});
			infoEl.createEl('code', {text: `http://127.0.0.1:${this.plugin.settings.port}/health`});
		}
	}
}
