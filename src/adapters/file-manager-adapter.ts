import { FileManager, TAbstractFile, TFile } from 'obsidian';
import { IFileManagerAdapter, FrontmatterValue } from './interfaces';

export class FileManagerAdapter implements IFileManagerAdapter {
	constructor(private fileManager: FileManager) {}

	async renameFile(file: TAbstractFile, newPath: string): Promise<void> {
		await this.fileManager.renameFile(file, newPath);
	}

	async trashFile(file: TAbstractFile): Promise<void> {
		await this.fileManager.trashFile(file);
	}

	async processFrontMatter(file: TFile, fn: (frontmatter: Record<string, FrontmatterValue>) => void): Promise<void> {
		await this.fileManager.processFrontMatter(file, fn);
	}
}