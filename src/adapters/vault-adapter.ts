import { Vault, TAbstractFile, TFile, TFolder, DataWriteOptions } from 'obsidian';
import { IVaultAdapter } from './interfaces';

export class VaultAdapter implements IVaultAdapter {
	constructor(private vault: Vault) {}

	async read(file: TFile): Promise<string> {
		return this.vault.read(file);
	}

	stat(file: TAbstractFile): { ctime: number; mtime: number; size: number } | null {
		if (file instanceof TFile) {
			return file.stat;
		}
		return null;
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		return this.vault.getAbstractFileByPath(path);
	}

	getMarkdownFiles(): TFile[] {
		return this.vault.getMarkdownFiles();
	}

	getRoot(): TFolder {
		return this.vault.getRoot();
	}

	async process(file: TFile, fn: (data: string) => string, options?: DataWriteOptions): Promise<string> {
		return this.vault.process(file, fn, options);
	}

	async createFolder(path: string): Promise<void> {
		await this.vault.createFolder(path);
	}

	async create(path: string, data: string): Promise<TFile> {
		return this.vault.create(path, data);
	}

	async modify(file: TFile, data: string): Promise<void> {
		await this.vault.modify(file, data);
	}
}