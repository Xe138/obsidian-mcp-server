// Settings Types
export interface MCPServerSettings {
	port: number;
	enableCORS: boolean;
	allowedOrigins: string[];
	apiKey?: string;
	enableAuth: boolean;
}

export interface NotificationSettings {
	notificationsEnabled: boolean;
	showParameters: boolean;
	notificationDuration: number; // milliseconds
	logToConsole: boolean;
}

export interface MCPPluginSettings extends MCPServerSettings, NotificationSettings {
	autoStart: boolean;
}

export const DEFAULT_SETTINGS: MCPPluginSettings = {
	port: 3000,
	enableCORS: true,
	allowedOrigins: ['*'],
	apiKey: '',
	enableAuth: false,
	autoStart: false,
	// Notification defaults
	notificationsEnabled: false,
	showParameters: false,
	notificationDuration: 3000,
	logToConsole: false
};
