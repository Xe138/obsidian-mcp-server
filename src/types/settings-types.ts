// Settings Types
export interface MCPServerSettings {
	port: number;
	apiKey: string; // Now required, not optional
	enableAuth: boolean; // Will be removed in future, kept for migration
	allowedIPs: string; // Comma-separated IPs/CIDRs allowed to connect remotely
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
	apiKey: '', // Will be auto-generated on first load
	enableAuth: true, // Always true now
	allowedIPs: '', // Empty = localhost only
	autoStart: false,
	// Notification defaults
	notificationsEnabled: false,
	showParameters: false,
	notificationDuration: 3000,
	logToConsole: false
};
