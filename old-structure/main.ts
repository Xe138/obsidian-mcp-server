import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MCPServer, MCPServerSettings } from './mcp-server';

interface MCPPluginSettings extends MCPServerSettings {
	autoStart: boolean;
}

const DEFAULT_SETTINGS: MCPPluginSettings = {
	port: 3000,
	enableCORS: true,
	allowedOrigins: ['*'],
	apiKey: '',
	enableAuth: false,
	autoStart: false
}

export default class MCPServerPlugin extends Plugin {
	settings: MCPPluginSettings;
	mcpServer: MCPServer | null = null;
	statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

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

		// Add commands
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

		try {
			this.mcpServer = new MCPServer(this.app, this.settings);
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
		// Update server settings if it's running
		if (this.mcpServer) {
			this.mcpServer.updateSettings(this.settings);
		}
	}
}

class MCPServerSettingTab extends PluginSettingTab {
	plugin: MCPServerPlugin;

	constructor(app: App, plugin: MCPServerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'MCP Server Settings'});

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
					this.display(); // Refresh display
				});
			
			buttonContainer.createEl('button', {text: 'Restart Server'})
				.addEventListener('click', async () => {
					await this.plugin.stopServer();
					await this.plugin.startServer();
					this.display(); // Refresh display
				});
		} else {
			buttonContainer.createEl('button', {text: 'Start Server'})
				.addEventListener('click', async () => {
					await this.plugin.startServer();
					this.display(); // Refresh display
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
