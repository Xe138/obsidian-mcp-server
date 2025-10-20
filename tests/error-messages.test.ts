import { ErrorMessages } from '../src/utils/error-messages';

describe('ErrorMessages', () => {
	describe('folderNotFound', () => {
		it('generates properly formatted error message', () => {
			const error = ErrorMessages.folderNotFound('test/folder');

			expect(error).toContain('Folder not found: "test/folder"');
			expect(error).toContain('The folder does not exist in the vault');
			expect(error).toContain('Troubleshooting tips');
			expect(error).toContain('list_notes("test")');
		});

		it('uses root list command when no parent path', () => {
			const error = ErrorMessages.folderNotFound('folder');

			expect(error).toContain('list_notes()');
		});
	});

	describe('invalidPath', () => {
		it('generates error message without reason', () => {
			const error = ErrorMessages.invalidPath('bad/path');

			expect(error).toContain('Invalid path: "bad/path"');
			expect(error).toContain('Troubleshooting tips');
			expect(error).toContain('Do not use leading slashes');
		});

		it('includes reason when provided', () => {
			const error = ErrorMessages.invalidPath('bad/path', 'contains invalid character');

			expect(error).toContain('Invalid path: "bad/path"');
			expect(error).toContain('Reason: contains invalid character');
		});
	});

	describe('pathAlreadyExists', () => {
		it('generates error for file type', () => {
			const error = ErrorMessages.pathAlreadyExists('test.md', 'file');

			expect(error).toContain('File already exists: "test.md"');
			expect(error).toContain('Choose a different name for your file');
		});

		it('generates error for folder type', () => {
			const error = ErrorMessages.pathAlreadyExists('test', 'folder');

			expect(error).toContain('Folder already exists: "test"');
			expect(error).toContain('Choose a different name for your folder');
		});
	});
});
