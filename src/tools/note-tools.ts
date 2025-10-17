import { App, TFile } from 'obsidian';
import { CallToolResult } from '../types/mcp-types';

export class NoteTools {
	constructor(private app: App) {}

	async readNote(path: string): Promise<CallToolResult> {
		const file = this.app.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		const content = await this.app.vault.read(file);
		return {
			content: [{ type: "text", text: content }]
		};
	}

	async createNote(path: string, content: string): Promise<CallToolResult> {
		try {
			const file = await this.app.vault.create(path, content);
			return {
				content: [{ type: "text", text: `Note created successfully: ${file.path}` }]
			};
		} catch (error) {
			return {
				content: [{ type: "text", text: `Failed to create note: ${(error as Error).message}` }],
				isError: true
			};
		}
	}

	async updateNote(path: string, content: string): Promise<CallToolResult> {
		const file = this.app.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		await this.app.vault.modify(file, content);
		return {
			content: [{ type: "text", text: `Note updated successfully: ${path}` }]
		};
	}

	async deleteNote(path: string): Promise<CallToolResult> {
		const file = this.app.vault.getAbstractFileByPath(path);
		
		if (!file || !(file instanceof TFile)) {
			return {
				content: [{ type: "text", text: `Note not found: ${path}` }],
				isError: true
			};
		}

		await this.app.vault.delete(file);
		return {
			content: [{ type: "text", text: `Note deleted successfully: ${path}` }]
		};
	}
}
