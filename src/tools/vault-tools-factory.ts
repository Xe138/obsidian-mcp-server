import { App } from 'obsidian';
import { VaultTools } from './vault-tools';
import { VaultAdapter } from '../adapters/vault-adapter';
import { MetadataCacheAdapter } from '../adapters/metadata-adapter';

/**
 * Factory function to create VaultTools with concrete adapters
 */
export function createVaultTools(app: App): VaultTools {
	return new VaultTools(
		new VaultAdapter(app.vault),
		new MetadataCacheAdapter(app.metadataCache),
		app
	);
}