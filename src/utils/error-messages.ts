import { PathUtils } from './path-utils';

/**
 * Enhanced error message utilities
 * Provides helpful, actionable error messages with troubleshooting tips
 */
export class ErrorMessages {
	/**
	 * Generate a file not found error message with troubleshooting tips
	 */
	static fileNotFound(path: string, operation?: string): string {
		const parentPath = PathUtils.getParentPath(path);
		const listCommand = parentPath ? `list_notes("${parentPath}")` : 'list_notes()';
		
		return `File not found: "${path}"

The file does not exist in the vault.

Troubleshooting tips:
• Paths are vault-relative (omit leading/trailing slashes)
• Paths are case-sensitive on macOS/Linux
• Use ${listCommand} to see available files in this location
• Verify the file has the correct extension (e.g., .md for markdown)
• Check for typos in the file path

Example: "folder/note.md" instead of "/folder/note.md"`;
	}

	/**
	 * Generate a folder not found error message with troubleshooting tips
	 */
	static folderNotFound(path: string): string {
		const parentPath = PathUtils.getParentPath(path);
		const listCommand = parentPath ? `list_notes("${parentPath}")` : 'list_notes()';
		
		return `Folder not found: "${path}"

The folder does not exist in the vault.

Troubleshooting tips:
• Paths are vault-relative (omit leading/trailing slashes)
• Paths are case-sensitive on macOS/Linux
• Use ${listCommand} to see available folders in this location
• Verify the folder path is correct
• Check for typos in the folder path

Example: "folder/subfolder" instead of "/folder/subfolder/"`;
	}

	/**
	 * Generate an invalid path error message with troubleshooting tips
	 */
	static invalidPath(path: string, reason?: string): string {
		const reasonText = reason ? `\nReason: ${reason}` : '';
		
		return `Invalid path: "${path}"${reasonText}

Troubleshooting tips:
• Paths must be relative to the vault root
• Do not use leading slashes (/) or backslashes (\\)
• Do not use absolute paths (e.g., C:/ or /home/user/)
• Avoid parent directory traversal (..)
• Avoid invalid characters: < > : " | ? * and control characters
• Use forward slashes (/) as path separators

Valid examples:
• "note.md"
• "folder/note.md"
• "folder/subfolder/note.md"`;
	}

	/**
	 * Generate a path already exists error message
	 */
	static pathAlreadyExists(path: string, type: 'file' | 'folder'): string {
		return `${type === 'file' ? 'File' : 'Folder'} already exists: "${path}"

Troubleshooting tips:
• Choose a different name for your ${type}
• Use the update_note tool to modify existing files
• Use the delete_note tool to remove the existing ${type} first
• Check if you intended to update rather than create`;
	}

	/**
	 * Generate a parent folder not found error message
	 */
	static parentFolderNotFound(path: string, parentPath: string): string {
		const grandparentPath = PathUtils.getParentPath(parentPath);
		const listCommand = grandparentPath ? `list_notes("${grandparentPath}")` : 'list_notes()';
		
		return `Parent folder does not exist: "${parentPath}"

Cannot create "${path}" because its parent folder is missing.

Troubleshooting tips:
• Use createParents: true parameter to automatically create missing parent folders
• Create the parent folder first using Obsidian
• Verify the folder path with ${listCommand}
• Check that the parent folder path is correct (vault-relative, case-sensitive on macOS/Linux)
• Ensure all parent folders in the path exist before creating the file

Example with auto-creation:
create_note({ path: "${path}", content: "...", createParents: true })`;
	}

	/**
	 * Generate a generic operation failed error message
	 */
	static operationFailed(operation: string, path: string, error: string): string {
		return `Failed to ${operation}: "${path}"

Error: ${error}

Troubleshooting tips:
• Check that the path is valid and accessible
• Verify you have the necessary permissions
• Ensure the vault is not in a read-only state
• Try restarting the MCP server if the issue persists`;
	}

	/**
	 * Generate a not a file error message
	 */
	static notAFile(path: string): string {
		return `Path is not a file: "${path}"

The specified path exists but is a folder, not a file.

Troubleshooting tips:
• Use the list_notes() tool with this folder path to see its contents
• Specify a file path within this folder instead
• Check that you're using the correct path`;
	}

	/**
	 * Generate a not a folder error message
	 */
	static notAFolder(path: string): string {
		return `Path is not a folder: "${path}"

The specified path exists but is a file, not a folder.

Troubleshooting tips:
• Use read_note() to read this file
• Use list_notes() on the parent folder to see contents
• Specify the parent folder path instead
• Check that you're using the correct path`;
	}

	/**
	 * Generate an error for attempting to delete a folder
	 */
	static cannotDeleteFolder(path: string): string {
		return `Path is a folder, not a file: "${path}"

Cannot delete folders using delete_note(). 

Troubleshooting tips:
• Use list_notes("${path}") to see the folder contents
• Delete individual files within the folder using delete_note()
• Note: Folder deletion API is not currently available
• Ensure you're targeting a file, not a folder`;
	}

	/**
	 * Generate an empty path error message
	 */
	static emptyPath(): string {
		return `Path cannot be empty

Troubleshooting tips:
• Provide a valid vault-relative path
• Example: "folder/note.md"
• Use the list_notes() tool to see available files`;
	}
}
