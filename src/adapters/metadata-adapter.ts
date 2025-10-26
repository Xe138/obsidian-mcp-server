import { MetadataCache, TFile, CachedMetadata } from 'obsidian';
import { IMetadataCacheAdapter } from './interfaces';

export class MetadataCacheAdapter implements IMetadataCacheAdapter {
	constructor(private cache: MetadataCache) {}

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.getFileCache(file);
	}

	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
		return this.cache.getFirstLinkpathDest(linkpath, sourcePath);
	}

	get resolvedLinks(): Record<string, Record<string, number>> {
		return this.cache.resolvedLinks;
	}

	get unresolvedLinks(): Record<string, Record<string, number>> {
		return this.cache.unresolvedLinks;
	}
}