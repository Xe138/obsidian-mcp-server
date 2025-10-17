// Settings Types
export interface MCPServerSettings {
	port: number;
	enableCORS: boolean;
	allowedOrigins: string[];
	apiKey?: string;
	enableAuth: boolean;
}

export interface MCPPluginSettings extends MCPServerSettings {
	autoStart: boolean;
}

export const DEFAULT_SETTINGS: MCPPluginSettings = {
	port: 3000,
	enableCORS: true,
	allowedOrigins: ['*'],
	apiKey: '',
	enableAuth: false,
	autoStart: false
};
