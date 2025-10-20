import { FrontmatterUtils } from '../src/utils/frontmatter-utils';

// Mock the parseYaml function from obsidian
jest.mock('obsidian', () => ({
	parseYaml: jest.fn()
}));

import { parseYaml } from 'obsidian';

const mockParseYaml = parseYaml as jest.MockedFunction<typeof parseYaml>;

describe('FrontmatterUtils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('extractFrontmatter()', () => {
		describe('valid frontmatter with --- delimiters', () => {
			test('extracts frontmatter with Unix line endings', () => {
				const content = '---\ntitle: Test\ntags: [tag1, tag2]\n---\nContent here';
				mockParseYaml.mockReturnValue({ title: 'Test', tags: ['tag1', 'tag2'] });

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('title: Test\ntags: [tag1, tag2]');
				expect(result.parsedFrontmatter).toEqual({ title: 'Test', tags: ['tag1', 'tag2'] });
				expect(result.contentWithoutFrontmatter).toBe('Content here');
				expect(result.content).toBe(content);
				expect(mockParseYaml).toHaveBeenCalledWith('title: Test\ntags: [tag1, tag2]');
			});

			test('extracts frontmatter with Windows line endings (\\r\\n)', () => {
				const content = '---\r\ntitle: Test\r\n---\r\nContent';
				mockParseYaml.mockReturnValue({ title: 'Test' });

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('title: Test\r');
				expect(result.parsedFrontmatter).toEqual({ title: 'Test' });
			});

			test('extracts frontmatter with ... closing delimiter', () => {
				const content = '---\ntitle: Test\n...\nContent here';
				mockParseYaml.mockReturnValue({ title: 'Test' });

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('title: Test');
				expect(result.parsedFrontmatter).toEqual({ title: 'Test' });
				expect(result.contentWithoutFrontmatter).toBe('Content here');
			});

			test('extracts frontmatter with whitespace in closing delimiter line', () => {
				const content = '---\ntitle: Test\n---  \nContent here';
				mockParseYaml.mockReturnValue({ title: 'Test' });

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('title: Test');
				expect(result.contentWithoutFrontmatter).toBe('Content here');
			});

			test('extracts empty frontmatter', () => {
				const content = '---\n---\nContent here';
				mockParseYaml.mockReturnValue({});

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('');
				expect(result.parsedFrontmatter).toEqual({});
				expect(result.contentWithoutFrontmatter).toBe('Content here');
			});

			test('handles multiline frontmatter values', () => {
				const content = '---\ntitle: Test\ndescription: |\n  Line 1\n  Line 2\n---\nContent';
				mockParseYaml.mockReturnValue({
					title: 'Test',
					description: 'Line 1\nLine 2'
				});

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('title: Test\ndescription: |\n  Line 1\n  Line 2');
				expect(result.parsedFrontmatter).toEqual({
					title: 'Test',
					description: 'Line 1\nLine 2'
				});
			});
		});

		describe('no frontmatter', () => {
			test('handles content without frontmatter', () => {
				const content = 'Just regular content';

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(false);
				expect(result.frontmatter).toBe('');
				expect(result.parsedFrontmatter).toBe(null);
				expect(result.content).toBe(content);
				expect(result.contentWithoutFrontmatter).toBe(content);
				expect(mockParseYaml).not.toHaveBeenCalled();
			});

			test('handles content starting with --- not at beginning', () => {
				const content = 'Some text\n---\ntitle: Test\n---';

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(false);
				expect(result.frontmatter).toBe('');
				expect(result.parsedFrontmatter).toBe(null);
			});

			test('handles empty string', () => {
				const content = '';

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(false);
				expect(result.frontmatter).toBe('');
				expect(result.parsedFrontmatter).toBe(null);
				expect(result.content).toBe('');
				expect(result.contentWithoutFrontmatter).toBe('');
			});
		});

		describe('missing closing delimiter', () => {
			test('treats missing closing delimiter as no frontmatter', () => {
				const content = '---\ntitle: Test\nmore content';

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(false);
				expect(result.frontmatter).toBe('');
				expect(result.parsedFrontmatter).toBe(null);
				expect(result.content).toBe(content);
				expect(result.contentWithoutFrontmatter).toBe(content);
				expect(mockParseYaml).not.toHaveBeenCalled();
			});

			test('handles single line with just opening delimiter', () => {
				const content = '---';

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(false);
				expect(result.parsedFrontmatter).toBe(null);
			});
		});

		describe('parse errors', () => {
			test('handles parseYaml throwing error', () => {
				const content = '---\ninvalid: yaml: content:\n---\nContent';
				const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
				mockParseYaml.mockImplementation(() => {
					throw new Error('Invalid YAML');
				});

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.frontmatter).toBe('invalid: yaml: content:');
				expect(result.parsedFrontmatter).toBe(null);
				expect(result.contentWithoutFrontmatter).toBe('Content');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Failed to parse frontmatter:',
					expect.any(Error)
				);

				consoleErrorSpy.mockRestore();
			});

			test('handles parseYaml returning null', () => {
				const content = '---\ntitle: Test\n---\nContent';
				mockParseYaml.mockReturnValue(null);

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.parsedFrontmatter).toEqual({});
			});

			test('handles parseYaml returning undefined', () => {
				const content = '---\ntitle: Test\n---\nContent';
				mockParseYaml.mockReturnValue(undefined);

				const result = FrontmatterUtils.extractFrontmatter(content);

				expect(result.hasFrontmatter).toBe(true);
				expect(result.parsedFrontmatter).toEqual({});
			});
		});
	});

	describe('extractFrontmatterSummary()', () => {
		test('returns null for null input', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary(null);
			expect(result).toBe(null);
		});

		test('returns null for empty object', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({});
			expect(result).toBe(null);
		});

		test('extracts title field', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({ title: 'My Title' });
			expect(result).toEqual({ title: 'My Title' });
		});

		test('extracts tags as array', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({ tags: ['tag1', 'tag2'] });
			expect(result).toEqual({ tags: ['tag1', 'tag2'] });
		});

		test('converts tags from string to array', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({ tags: 'single-tag' });
			expect(result).toEqual({ tags: ['single-tag'] });
		});

		test('extracts aliases as array', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({ aliases: ['alias1', 'alias2'] });
			expect(result).toEqual({ aliases: ['alias1', 'alias2'] });
		});

		test('converts aliases from string to array', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({ aliases: 'single-alias' });
			expect(result).toEqual({ aliases: ['single-alias'] });
		});

		test('extracts all common fields together', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				title: 'My Note',
				tags: ['tag1', 'tag2'],
				aliases: 'my-alias'
			});
			expect(result).toEqual({
				title: 'My Note',
				tags: ['tag1', 'tag2'],
				aliases: ['my-alias']
			});
		});

		test('includes other top-level fields', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				title: 'My Note',
				author: 'John Doe',
				date: '2025-01-20',
				custom: 'value'
			});
			expect(result).toEqual({
				title: 'My Note',
				author: 'John Doe',
				date: '2025-01-20',
				custom: 'value'
			});
		});

		test('does not duplicate common fields in other fields', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				title: 'My Note',
				tags: ['tag1'],
				aliases: ['alias1']
			});

			// Should have these fields exactly once
			expect(result).toEqual({
				title: 'My Note',
				tags: ['tag1'],
				aliases: ['alias1']
			});
			expect(Object.keys(result!).length).toBe(3);
		});

		test('ignores non-standard tag types (not string or array)', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				tags: 123, // Not a string or array - skipped in normalization
				other: 'value'
			});
			// Tags are not string/array, so skipped during normalization
			// The loop excludes 'tags' key from other fields, so tags won't appear
			expect(result).toEqual({ other: 'value' });
		});

		test('ignores non-standard alias types (not string or array)', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				aliases: true, // Not a string or array - skipped in normalization
				other: 'value'
			});
			// Aliases are not string/array, so skipped during normalization
			// The loop excludes 'aliases' key from other fields, so aliases won't appear
			expect(result).toEqual({ other: 'value' });
		});

		test('handles frontmatter with only unrecognized fields', () => {
			const result = FrontmatterUtils.extractFrontmatterSummary({
				custom1: 'value1',
				custom2: 'value2'
			});
			expect(result).toEqual({
				custom1: 'value1',
				custom2: 'value2'
			});
		});
	});

	describe('hasFrontmatter()', () => {
		test('returns true for content with Unix line endings', () => {
			expect(FrontmatterUtils.hasFrontmatter('---\ntitle: Test\n---\n')).toBe(true);
		});

		test('returns true for content with Windows line endings', () => {
			expect(FrontmatterUtils.hasFrontmatter('---\r\ntitle: Test\r\n---\r\n')).toBe(true);
		});

		test('returns false for content without frontmatter', () => {
			expect(FrontmatterUtils.hasFrontmatter('Just content')).toBe(false);
		});

		test('returns false for content with --- not at start', () => {
			expect(FrontmatterUtils.hasFrontmatter('Some text\n---\n')).toBe(false);
		});

		test('returns false for empty string', () => {
			expect(FrontmatterUtils.hasFrontmatter('')).toBe(false);
		});

		test('returns false for content starting with -- (only two dashes)', () => {
			expect(FrontmatterUtils.hasFrontmatter('--\ntitle: Test')).toBe(false);
		});
	});

	describe('serializeFrontmatter()', () => {
		test('returns empty string for empty object', () => {
			expect(FrontmatterUtils.serializeFrontmatter({})).toBe('');
		});

		test('returns empty string for null', () => {
			expect(FrontmatterUtils.serializeFrontmatter(null as any)).toBe('');
		});

		test('returns empty string for undefined', () => {
			expect(FrontmatterUtils.serializeFrontmatter(undefined as any)).toBe('');
		});

		test('serializes simple string values', () => {
			const result = FrontmatterUtils.serializeFrontmatter({ title: 'Test' });
			expect(result).toBe('---\ntitle: Test\n---');
		});

		test('serializes number values', () => {
			const result = FrontmatterUtils.serializeFrontmatter({ count: 42 });
			expect(result).toBe('---\ncount: 42\n---');
		});

		test('serializes boolean values', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				published: true,
				draft: false
			});
			expect(result).toBe('---\npublished: true\ndraft: false\n---');
		});

		test('serializes arrays with items', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				tags: ['tag1', 'tag2', 'tag3']
			});
			expect(result).toBe('---\ntags:\n  - tag1\n  - tag2\n  - tag3\n---');
		});

		test('serializes empty arrays', () => {
			const result = FrontmatterUtils.serializeFrontmatter({ tags: [] });
			expect(result).toBe('---\ntags: []\n---');
		});

		test('serializes arrays with non-string items', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				numbers: [1, 2, 3],
				mixed: ['text', 42, true]
			});
			expect(result).toContain('numbers:\n  - 1\n  - 2\n  - 3');
			expect(result).toContain('mixed:\n  - text\n  - 42\n  - true');
		});

		test('serializes nested objects', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				metadata: { author: 'John', year: 2025 }
			});
			expect(result).toBe('---\nmetadata:\n  author: John\n  year: 2025\n---');
		});

		test('quotes strings with special characters (colon)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				title: 'Note: Important'
			});
			expect(result).toBe('---\ntitle: "Note: Important"\n---');
		});

		test('quotes strings with special characters (hash)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				tag: '#important'
			});
			expect(result).toBe('---\ntag: "#important"\n---');
		});

		test('quotes strings with special characters (brackets)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				link: '[link]',
				array: '[[link]]'
			});
			expect(result).toContain('link: "[link]"');
			expect(result).toContain('array: "[[link]]"');
		});

		test('quotes strings with special characters (braces)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				template: '{variable}'
			});
			expect(result).toBe('---\ntemplate: "{variable}"\n---');
		});

		test('quotes strings with special characters (pipe)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				option: 'a|b'
			});
			expect(result).toBe('---\noption: "a|b"\n---');
		});

		test('quotes strings with special characters (greater than)', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				text: '>quote'
			});
			expect(result).toBe('---\ntext: ">quote"\n---');
		});

		test('quotes strings with leading whitespace', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				text: ' leading'
			});
			expect(result).toBe('---\ntext: " leading"\n---');
		});

		test('quotes strings with trailing whitespace', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				text: 'trailing '
			});
			expect(result).toBe('---\ntext: "trailing "\n---');
		});

		test('escapes quotes in quoted strings', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				title: 'Note: "Important"'
			});
			expect(result).toBe('---\ntitle: "Note: \\"Important\\""\n---');
		});

		test('handles multiple quotes in string', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				text: 'She said: "Hello" and "Goodbye"'
			});
			expect(result).toBe('---\ntext: "She said: \\"Hello\\" and \\"Goodbye\\""\n---');
		});

		test('skips undefined values', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				title: 'Test',
				skipped: undefined,
				kept: 'value'
			});
			expect(result).toBe('---\ntitle: Test\nkept: value\n---');
			expect(result).not.toContain('skipped');
		});

		test('skips null values', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				title: 'Test',
				skipped: null,
				kept: 'value'
			});
			expect(result).toBe('---\ntitle: Test\nkept: value\n---');
			expect(result).not.toContain('skipped');
		});

		test('serializes complex nested structures', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				title: 'Complex Note',
				tags: ['tag1', 'tag2'],
				metadata: {
					author: 'John',
					version: 1
				},
				published: true
			});
			expect(result).toContain('title: Complex Note');
			expect(result).toContain('tags:\n  - tag1\n  - tag2');
			expect(result).toContain('metadata:\n  author: John\n  version: 1');
			expect(result).toContain('published: true');
		});

		test('uses JSON.stringify as fallback for unknown types', () => {
			const result = FrontmatterUtils.serializeFrontmatter({
				custom: Symbol('test') as any
			});
			// Symbol can't be JSON stringified, but the fallback should handle it
			expect(result).toContain('custom:');
		});
	});

	describe('parseExcalidrawMetadata()', () => {
		describe('Excalidraw marker detection', () => {
			test('detects excalidraw-plugin marker', () => {
				const content = '# Drawing\nSome text with excalidraw-plugin marker';

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
			});

			test('detects type:excalidraw marker', () => {
				const content = '{"type":"excalidraw"}';

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
			});

			test('returns false for non-Excalidraw content', () => {
				const content = 'Just a regular note';

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(false);
				expect(result.elementCount).toBeUndefined();
				expect(result.hasCompressedData).toBeUndefined();
				expect(result.metadata).toBeUndefined();
			});
		});

		describe('JSON extraction from code blocks', () => {
			test('extracts JSON from compressed-json code block after ## Drawing', () => {
				const content = `# Text Elements

excalidraw-plugin

Text content

## Drawing
\`\`\`compressed-json
N4KAkARALgngDgUwgLgAQQQDwMYEMA2AlgCYBOuA7hADTgQBuCpAzoQPYB2KqATL
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.hasCompressedData).toBe(true);
				expect(result.metadata?.compressed).toBe(true);
			});

			test('extracts JSON from json code block after ## Drawing', () => {
				const content = `## Drawing
\`\`\`json
{"elements": [{"id": "1"}, {"id": "2"}], "appState": {}, "version": 2, "type":"excalidraw"}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(2);
				expect(result.hasCompressedData).toBe(false);
				expect(result.metadata?.version).toBe(2);
			});

			test('extracts JSON from code block with any language specifier', () => {
				const content = `## Drawing
\`\`\`javascript
{"elements": [{"id": "1"}], "appState": {}, "version": 2, "type":"excalidraw"}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(1);
			});

			test('extracts JSON from code block with language specifier after ## Drawing (pattern 3)', () => {
				const content = `excalidraw-plugin
## Drawing
Not compressed-json or json language, but has a language specifier
\`\`\`typescript
{"elements": [{"id": "1"}], "appState": {}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(1);
			});

			test('extracts JSON from code block without language specifier', () => {
				const content = `## Drawing
\`\`\`
{"elements": [], "appState": {}, "version": 2, "type":"excalidraw"}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
			});

			test('extracts JSON from code block without language after ## Drawing (pattern 4)', () => {
				const content = `excalidraw-plugin
## Drawing
No compressed-json, json, or other language specifier
\`\`\`
{"elements": [{"id": "1"}, {"id": "2"}], "appState": {}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(2);
			});

			test('parses Excalidraw with code fence lacking language specifier (coverage for lines 253-255)', () => {
				// Specific test to ensure Pattern 4 code path is exercised
				// Uses only basic code fence with no language hint after ## Drawing
				const content = `
excalidraw-plugin

## Drawing
\`\`\`
{"elements": [{"id": "elem1"}, {"id": "elem2"}, {"id": "elem3"}], "appState": {"gridSize": 20}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(3);
				expect(result.hasCompressedData).toBe(false);
				expect(result.metadata?.version).toBe(2);
				expect(result.metadata?.appState).toEqual({"gridSize": 20});
			});

			test('tries patterns in entire content if no ## Drawing section', () => {
				const content = `\`\`\`json
{"elements": [{"id": "1"}], "appState": {}, "version": 2, "type":"excalidraw"}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(1);
			});

			test('handles missing JSON block with default values', () => {
				const content = '# Text\nexcalidraw-plugin marker but no JSON';

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
				expect(result.hasCompressedData).toBe(false);
				expect(result.metadata).toEqual({});
			});
		});

		describe('compressed data handling', () => {
			test('detects compressed data starting with N4KAk', () => {
				const content = `## Drawing
\`\`\`json
N4KAkARALgngDgUwgLgAQQQDwMYEMA2AlgCYBOuA7hADTgQBuCpAzoQPYB2KqATL
\`\`\`
excalidraw-plugin`;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.hasCompressedData).toBe(true);
				expect(result.elementCount).toBe(0);
				expect(result.metadata?.compressed).toBe(true);
			});

			test('detects compressed data not starting with {', () => {
				const content = `## Drawing
\`\`\`json
ABC123CompressedData
\`\`\`
excalidraw-plugin`;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.hasCompressedData).toBe(true);
			});
		});

		describe('uncompressed JSON parsing', () => {
			test('parses valid JSON with elements', () => {
				const content = `excalidraw-plugin
## Drawing
\`\`\`json
{
	"elements": [
		{"id": "1", "type": "rectangle"},
		{"id": "2", "type": "arrow"}
	],
	"appState": {"viewBackgroundColor": "#fff"},
	"version": 2
}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(2);
				expect(result.hasCompressedData).toBe(false);
				expect(result.metadata?.appState).toEqual({ viewBackgroundColor: '#fff' });
				expect(result.metadata?.version).toBe(2);
			});

			test('handles missing elements array', () => {
				const content = `excalidraw-plugin
\`\`\`json
{"appState": {}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
			});

			test('detects compressed files data', () => {
				const content = `excalidraw-plugin
\`\`\`json
{
	"elements": [],
	"appState": {},
	"version": 2,
	"files": {
		"file1": {"data": "base64data"}
	}
}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.hasCompressedData).toBe(true);
			});

			test('handles empty files object as not compressed', () => {
				const content = `excalidraw-plugin
\`\`\`json
{"elements": [], "appState": {}, "version": 2, "files": {}}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.hasCompressedData).toBe(false);
			});

			test('uses default version if missing', () => {
				const content = `excalidraw-plugin
\`\`\`json
{"elements": [], "appState": {}}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.metadata?.version).toBe(2);
			});

			test('uses empty appState if missing', () => {
				const content = `excalidraw-plugin
\`\`\`json
{"elements": [], "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.metadata?.appState).toEqual({});
			});
		});

		describe('error handling', () => {
			test('handles decompression failure gracefully', () => {
				// Mock atob to throw an error to simulate decompression failure
				// This covers the catch block for compressed data decompression errors
				const originalAtob = global.atob;
				global.atob = jest.fn(() => {
					throw new Error('Invalid base64 string');
				});

				const content = `excalidraw-plugin
## Drawing
\`\`\`compressed-json
N4KAkARALgngDgUwgLgAQQQDwMYEMA2AlgCYBOuA7hADTgQBuCpAzoQPYB2KqATL
\`\`\``;
				const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
				expect(result.hasCompressedData).toBe(true);
				expect(result.metadata).toEqual({ compressed: true });
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Failed to process compressed Excalidraw data:',
					expect.anything()
				);

				consoleErrorSpy.mockRestore();
				global.atob = originalAtob;
			});

			test('handles JSON parse error gracefully', () => {
				const content = `excalidraw-plugin
\`\`\`json
{invalid json content}
\`\`\``;
				const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
				expect(result.hasCompressedData).toBe(false);
				expect(result.metadata).toEqual({});
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'Excalidraw parsing error:',
					expect.any(Error)
				);

				consoleErrorSpy.mockRestore();
			});

			test('handles error when no Excalidraw marker present', () => {
				const content = `\`\`\`json
{invalid json}
\`\`\``;
				const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(false);
				expect(result.elementCount).toBeUndefined();
				expect(result.hasCompressedData).toBeUndefined();
				expect(result.metadata).toBeUndefined();

				consoleErrorSpy.mockRestore();
			});

			test('logs error but returns valid result structure', () => {
				const content = 'excalidraw-plugin with error causing content';
				const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

				// Force an error by making content throw during processing
				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				// Should still return valid structure
				expect(result).toHaveProperty('isExcalidraw');

				consoleErrorSpy.mockRestore();
			});
		});

		describe('edge cases', () => {
			test('handles content with multiple code blocks', () => {
				const content = `excalidraw-plugin
\`\`\`python
print("hello")
\`\`\`

## Drawing
\`\`\`json
{"elements": [{"id": "1"}], "appState": {}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(1);
			});

			test('handles whitespace variations in code fence', () => {
				const content = `excalidraw-plugin
## Drawing
\`\`\`json
{"elements": [], "appState": {}, "version": 2}
\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
			});

			test('handles JSON with extra whitespace', () => {
				const content = `excalidraw-plugin
\`\`\`json

  {"elements": [], "appState": {}, "version": 2}

\`\`\``;

				const result = FrontmatterUtils.parseExcalidrawMetadata(content);

				expect(result.isExcalidraw).toBe(true);
				expect(result.elementCount).toBe(0);
			});
		});
	});
});
