import { App, TFile, TFolder } from 'obsidian';
import { CallToolResult } from '../types/mcp-types';

export class VaultTools {
	constructor(private app: App) {}

	async searchNotes(query: string): Promise<CallToolResult> {
		const files = this.app.vault.getMarkdownFiles();
		const results: string[] = [];

		for (const file of files) {
			const content = await this.app.vault.read(file);
			if (content.toLowerCase().includes(query.toLowerCase()) || 
				file.basename.toLowerCase().includes(query.toLowerCase())) {
				results.push(file.path);
			}
		}

		return {
			content: [{
				type: "text",
				text: results.length > 0 
					? `Found ${results.length} notes:\n${results.join('\n')}`
					: 'No notes found matching the query'
			}]
		};
	}

	async getVaultInfo(): Promise<CallToolResult> {
		const files = this.app.vault.getFiles();
		const markdownFiles = this.app.vault.getMarkdownFiles();
		
		const info = {
			name: this.app.vault.getName(),
			totalFiles: files.length,
			markdownFiles: markdownFiles.length,
			rootPath: (this.app.vault.adapter as any).basePath || 'Unknown'
		};

		return {
			content: [{
				type: "text",
				text: JSON.stringify(info, null, 2)
			}]
		};
	}

	async listNotes(folder?: string): Promise<CallToolResult> {
		let files: TFile[];

		if (folder) {
			const folderObj = this.app.vault.getAbstractFileByPath(folder);
			if (!folderObj || !(folderObj instanceof TFolder)) {
				return {
					content: [{ type: "text", text: `Folder not found: ${folder}` }],
					isError: true
				};
			}
			files = [];
			this.app.vault.getMarkdownFiles().forEach((file: TFile) => {
				if (file.path.startsWith(folder + '/')) {
					files.push(file);
				}
			});
		} else {
			files = this.app.vault.getMarkdownFiles();
		}

		const noteList = files.map(f => f.path).join('\n');
		return {
			content: [{
				type: "text",
				text: `Found ${files.length} notes:\n${noteList}`
			}]
		};
	}
}
