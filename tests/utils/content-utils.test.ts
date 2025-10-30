import { ContentUtils } from '../../src/utils/content-utils';

describe('ContentUtils', () => {
	describe('countWords', () => {
		it('should count words in simple text', () => {
			const content = 'This is a simple test.';
			expect(ContentUtils.countWords(content)).toBe(5);
		});

		it('should count words with multiple spaces', () => {
			const content = 'This  is   a    test';
			expect(ContentUtils.countWords(content)).toBe(4);
		});

		it('should exclude frontmatter from word count', () => {
			const content = `---
title: My Note
tags: [test, example]
---

This is the actual content with seven words.`;
			expect(ContentUtils.countWords(content)).toBe(8); // "This is the actual content with seven words."
		});

		it('should include code blocks in word count', () => {
			const content = `This is text.

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

More text here.`;
			// Counts: This, is, text., ```javascript, function, test(), {, return, true;, }, ```, More, text, here.
			expect(ContentUtils.countWords(content)).toBe(14);
		});

		it('should include inline code in word count', () => {
			const content = 'Use the `console.log` function to debug.';
			// Counts: Use, the, `console.log`, function, to, debug.
			expect(ContentUtils.countWords(content)).toBe(6);
		});

		it('should exclude Obsidian comments from word count', () => {
			const content = `This is visible text.

%% This is a comment and should not be counted %%

More visible text.`;
			expect(ContentUtils.countWords(content)).toBe(7); // "This is visible text. More visible text."
		});

		it('should exclude multi-line Obsidian comments', () => {
			const content = `Start of note.

%%
This is a multi-line comment
that spans several lines
and should not be counted
%%

End of note.`;
			expect(ContentUtils.countWords(content)).toBe(6); // "Start of note. End of note."
		});

		it('should handle multiple Obsidian comments', () => {
			const content = `First section. %% comment one %% Second section. %% comment two %% Third section.`;
			expect(ContentUtils.countWords(content)).toBe(6); // "First section. Second section. Third section."
		});

		it('should count zero words for empty content', () => {
			expect(ContentUtils.countWords('')).toBe(0);
		});

		it('should count zero words for only whitespace', () => {
			expect(ContentUtils.countWords('   \n\n   \t  ')).toBe(0);
		});

		it('should count zero words for only frontmatter', () => {
			const content = `---
title: Test
---`;
			expect(ContentUtils.countWords(content)).toBe(0);
		});

		it('should count zero words for only comments', () => {
			const content = '%% This is just a comment %%';
			expect(ContentUtils.countWords(content)).toBe(0);
		});

		it('should handle content with headings', () => {
			const content = `# Main Heading

This is a paragraph with some text.

## Subheading

More text here.`;
			// Counts: #, Main, Heading, This, is, a, paragraph, with, some, text., ##, Subheading, More, text, here.
			expect(ContentUtils.countWords(content)).toBe(15);
		});

		it('should handle content with lists', () => {
			const content = `- Item one
- Item two
- Item three

1. Numbered one
2. Numbered two`;
			// Counts: -, Item, one, -, Item, two, -, Item, three, 1., Numbered, one, 2., Numbered, two
			expect(ContentUtils.countWords(content)).toBe(15);
		});

		it('should handle content with wikilinks', () => {
			const content = 'See [[Other Note]] for more details.';
			expect(ContentUtils.countWords(content)).toBe(6); // Links are counted as words
		});

		it('should handle complex mixed content', () => {
			const content = `---
title: Complex Note
tags: [test]
---

# Introduction

This is a test note with [[links]] and \`code\`.

%% This comment should not be counted %%

\`\`\`python
def hello():
    print("world")
\`\`\`

## Conclusion

Final thoughts here.`;
			// Excluding frontmatter and comment, counts:
			// #, Introduction, This, is, a, test, note, with, [[links]], and, `code`.,
			// ```python, def, hello():, print("world"), ```, ##, Conclusion, Final, thoughts, here.
			expect(ContentUtils.countWords(content)).toBe(21);
		});
	});
});
