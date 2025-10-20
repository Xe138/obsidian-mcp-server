import { App } from 'obsidian';
import { NoteTools } from './note-tools';
import { VaultAdapter } from '../adapters/vault-adapter';
import { FileManagerAdapter } from '../adapters/file-manager-adapter';

/**
 * Factory function to create NoteTools with concrete adapters
 */
export function createNoteTools(app: App): NoteTools {
	return new NoteTools(
		new VaultAdapter(app.vault),
		new FileManagerAdapter(app.fileManager),
		app
	);
}