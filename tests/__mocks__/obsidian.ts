/**
 * Mock Obsidian API for testing
 * This provides minimal mocks for the Obsidian types used in tests
 */

export class TFile {
	path: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		const filename = parts[parts.length - 1];
		const dotIndex = filename.lastIndexOf('.');
		this.basename = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
		this.extension = dotIndex > 0 ? filename.substring(dotIndex + 1) : '';
	}
}

export class TFolder {
	path: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1];
	}
}

export class TAbstractFile {
	path: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1];
	}
}

export class Vault {
	private files: Map<string, TFile | TFolder> = new Map();

	getAbstractFileByPath(path: string): TFile | TFolder | null {
		return this.files.get(path) || null;
	}

	// Helper method for tests to add mock files
	_addMockFile(path: string, isFolder = false) {
		this.files.set(path, isFolder ? new TFolder(path) : new TFile(path));
	}

	// Helper method for tests to clear mock files
	_clearMockFiles() {
		this.files.clear();
	}
}

export class App {
	vault: Vault;

	constructor() {
		this.vault = new Vault();
	}
}

// Export other commonly used types as empty classes/interfaces
export class Plugin {}
export class Notice {}
export class PluginSettingTab {}
export class Setting {}

// Mock parseYaml function
export function parseYaml(yaml: string): any {
	// Simple YAML parser mock for testing
	const result: any = {};
	const lines = yaml.split('\n');

	for (const line of lines) {
		if (line.trim() && !line.startsWith('#')) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.substring(0, colonIndex).trim();
				let value = line.substring(colonIndex + 1).trim();

				// Handle arrays
				if (value.startsWith('[') && value.endsWith(']')) {
					value = value.slice(1, -1).split(',').map(v => v.trim());
				}

				result[key] = value;
			}
		}
	}

	return result;
}
