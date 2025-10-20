import { FileManager, TAbstractFile, TFile } from 'obsidian';
import { IFileManagerAdapter } from './interfaces';

export class FileManagerAdapter implements IFileManagerAdapter {
	constructor(private fileManager: FileManager) {}

	async renameFile(file: TAbstractFile, newPath: string): Promise<void> {
		await this.fileManager.renameFile(file, newPath);
	}

	async trashFile(file: TAbstractFile): Promise<void> {
		await this.fileManager.trashFile(file);
	}

	async processFrontMatter(file: TFile, fn: (frontmatter: any) => void): Promise<void> {
		await this.fileManager.processFrontMatter(file, fn);
	}
}