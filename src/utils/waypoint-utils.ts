import { TFile } from 'obsidian';
import { IVaultAdapter } from '../adapters/interfaces';

/**
 * Waypoint block information
 */
export interface WaypointBlock {
	hasWaypoint: boolean;
	waypointRange?: { start: number; end: number };
	links?: string[];
	rawContent?: string;
}

/**
 * Folder note detection result
 */
export interface FolderNoteInfo {
	isFolderNote: boolean;
	reason: 'basename_match' | 'waypoint_marker' | 'both' | 'none';
	folderPath?: string;
}

/**
 * Utilities for working with Waypoint plugin markers
 */
export class WaypointUtils {
	private static readonly WAYPOINT_START = /%% Begin Waypoint %%/;
	private static readonly WAYPOINT_END = /%% End Waypoint %%/;
	private static readonly LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

	/**
	 * Extract waypoint block from file content
	 */
	static extractWaypointBlock(content: string): WaypointBlock {
		const lines = content.split('\n');
		let inWaypoint = false;
		let waypointStart = -1;
		let waypointContent: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (this.WAYPOINT_START.test(line)) {
				inWaypoint = true;
				waypointStart = i + 1; // 1-indexed, line after marker
				waypointContent = [];
			} else if (this.WAYPOINT_END.test(line) && inWaypoint) {
				// Extract links from waypoint content
				const contentStr = waypointContent.join('\n');
				const links: string[] = [];
				let linkMatch: RegExpExecArray | null;
				
				// Reset lastIndex for global regex
				this.LINK_PATTERN.lastIndex = 0;
				
				while ((linkMatch = this.LINK_PATTERN.exec(contentStr)) !== null) {
					links.push(linkMatch[1]);
				}

				return {
					hasWaypoint: true,
					waypointRange: {
						start: waypointStart,
						end: i + 1 // 1-indexed, line of end marker
					},
					links,
					rawContent: contentStr
				};
			} else if (inWaypoint) {
				waypointContent.push(line);
			}
		}

		// No waypoint found or unclosed waypoint
		return { hasWaypoint: false };
	}

	/**
	 * Check if content contains a waypoint block
	 */
	static hasWaypointMarker(content: string): boolean {
		return this.WAYPOINT_START.test(content) && this.WAYPOINT_END.test(content);
	}

	/**
	 * Check if a file is a folder note
	 * A folder note is a note that:
	 * 1. Has the same basename as its parent folder, OR
	 * 2. Contains waypoint markers
	 */
	static async isFolderNote(vault: IVaultAdapter, file: TFile): Promise<FolderNoteInfo> {
		const basename = file.basename;
		const parentFolder = file.parent;

		// Check basename match
		const basenameMatch = parentFolder && parentFolder.name === basename;

		// Check for waypoint markers
		let hasWaypoint = false;
		try {
			const content = await vault.read(file);
			hasWaypoint = this.hasWaypointMarker(content);
		} catch (error) {
			// If we can't read the file, we can't check for waypoints
		}

		// Determine result
		let reason: 'basename_match' | 'waypoint_marker' | 'both' | 'none';
		if (basenameMatch && hasWaypoint) {
			reason = 'both';
		} else if (basenameMatch) {
			reason = 'basename_match';
		} else if (hasWaypoint) {
			reason = 'waypoint_marker';
		} else {
			reason = 'none';
		}

		return {
			isFolderNote: basenameMatch || hasWaypoint,
			reason,
			folderPath: parentFolder?.path
		};
	}

	/**
	 * Check if an edit would affect a waypoint block
	 * Returns true if the edit should be blocked
	 */
	static wouldAffectWaypoint(
		content: string,
		newContent: string
	): { affected: boolean; waypointRange?: { start: number; end: number } } {
		const waypointBlock = this.extractWaypointBlock(content);
		
		if (!waypointBlock.hasWaypoint) {
			return { affected: false };
		}

		// Check if the waypoint block still exists in the new content
		const newWaypointBlock = this.extractWaypointBlock(newContent);
		
		if (!newWaypointBlock.hasWaypoint) {
			// Waypoint was removed
			return { 
				affected: true, 
				waypointRange: waypointBlock.waypointRange 
			};
		}

		// Check if waypoint content changed
		if (waypointBlock.rawContent !== newWaypointBlock.rawContent) {
			return { 
				affected: true, 
				waypointRange: waypointBlock.waypointRange 
			};
		}

		// Check if waypoint range changed (lines were added/removed before it)
		if (
			waypointBlock.waypointRange!.start !== newWaypointBlock.waypointRange!.start ||
			waypointBlock.waypointRange!.end !== newWaypointBlock.waypointRange!.end
		) {
			// This is acceptable - waypoint content is the same, just moved
			return { affected: false };
		}

		return { affected: false };
	}

	/**
	 * Get the parent folder path for a file path
	 */
	static getParentFolderPath(filePath: string): string | null {
		const lastSlash = filePath.lastIndexOf('/');
		if (lastSlash === -1) {
			return null; // File is in root
		}
		return filePath.substring(0, lastSlash);
	}

	/**
	 * Get the basename without extension
	 */
	static getBasename(filePath: string): string {
		const lastSlash = filePath.lastIndexOf('/');
		const filename = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);
		const lastDot = filename.lastIndexOf('.');
		return lastDot === -1 ? filename : filename.substring(0, lastDot);
	}
}
