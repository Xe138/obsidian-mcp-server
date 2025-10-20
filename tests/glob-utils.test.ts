import { GlobUtils } from '../src/utils/glob-utils';

describe('GlobUtils', () => {
	describe('matches()', () => {
		describe('* pattern (matches any chars except /)', () => {
			test('matches single directory wildcard', () => {
				expect(GlobUtils.matches('file.md', '*.md')).toBe(true);
				expect(GlobUtils.matches('document.txt', '*.md')).toBe(false);
				expect(GlobUtils.matches('folder/file.md', '*.md')).toBe(false);
			});

			test('matches wildcard in middle of pattern', () => {
				expect(GlobUtils.matches('test-file.md', 'test-*.md')).toBe(true);
				expect(GlobUtils.matches('test-document.md', 'test-*.md')).toBe(true);
				expect(GlobUtils.matches('other-file.md', 'test-*.md')).toBe(false);
			});

			test('does not match across directory separators', () => {
				expect(GlobUtils.matches('folder/file.md', '*/file.md')).toBe(true);
				expect(GlobUtils.matches('folder/subfolder/file.md', '*/file.md')).toBe(false);
			});

			test('matches multiple wildcards', () => {
				expect(GlobUtils.matches('a-test-file.md', '*-*-*.md')).toBe(true);
				expect(GlobUtils.matches('test.md', '*.*')).toBe(true);
			});
		});

		describe('** pattern (matches any chars including /)', () => {
			test('matches across directory separators', () => {
				expect(GlobUtils.matches('folder/file.md', '**/*.md')).toBe(true);
				expect(GlobUtils.matches('folder/subfolder/file.md', '**/*.md')).toBe(true);
				expect(GlobUtils.matches('file.md', '**/*.md')).toBe(true);
			});

			test('matches ** in middle of pattern', () => {
				expect(GlobUtils.matches('src/utils/helper.ts', 'src/**/helper.ts')).toBe(true);
				expect(GlobUtils.matches('src/helper.ts', 'src/**/helper.ts')).toBe(true);
				expect(GlobUtils.matches('src/deeply/nested/path/helper.ts', 'src/**/helper.ts')).toBe(true);
			});

			test('handles ** with trailing slash', () => {
				expect(GlobUtils.matches('folder/file.md', '**/file.md')).toBe(true);
				expect(GlobUtils.matches('a/b/c/file.md', '**/file.md')).toBe(true);
			});

			test('matches ** alone', () => {
				expect(GlobUtils.matches('anything/path/file.md', '**')).toBe(true);
				expect(GlobUtils.matches('file.md', '**')).toBe(true);
			});
		});

		describe('? pattern (matches single char except /)', () => {
			test('matches single character', () => {
				expect(GlobUtils.matches('file1.md', 'file?.md')).toBe(true);
				expect(GlobUtils.matches('file2.md', 'file?.md')).toBe(true);
				expect(GlobUtils.matches('file12.md', 'file?.md')).toBe(false);
				expect(GlobUtils.matches('file.md', 'file?.md')).toBe(false);
			});

			test('does not match directory separator', () => {
				expect(GlobUtils.matches('file/x', 'file?x')).toBe(false);
				expect(GlobUtils.matches('fileax', 'file?x')).toBe(true);
			});

			test('matches multiple ? patterns', () => {
				expect(GlobUtils.matches('ab.md', '??.md')).toBe(true);
				expect(GlobUtils.matches('a.md', '??.md')).toBe(false);
				expect(GlobUtils.matches('abc.md', '??.md')).toBe(false);
			});
		});

		describe('[abc] pattern (character class)', () => {
			test('matches character in set', () => {
				expect(GlobUtils.matches('filea.md', 'file[abc].md')).toBe(true);
				expect(GlobUtils.matches('fileb.md', 'file[abc].md')).toBe(true);
				expect(GlobUtils.matches('filec.md', 'file[abc].md')).toBe(true);
				expect(GlobUtils.matches('filed.md', 'file[abc].md')).toBe(false);
			});

			test('matches character ranges', () => {
				expect(GlobUtils.matches('file1.md', 'file[0-9].md')).toBe(true);
				expect(GlobUtils.matches('file5.md', 'file[0-9].md')).toBe(true);
				expect(GlobUtils.matches('filea.md', 'file[0-9].md')).toBe(false);
			});

			test('handles unclosed bracket as literal', () => {
				expect(GlobUtils.matches('[abc', '[abc')).toBe(true);
				expect(GlobUtils.matches('xabc', '[abc')).toBe(false);
			});
		});

		describe('{a,b} pattern (alternatives)', () => {
			test('matches any alternative', () => {
				expect(GlobUtils.matches('file.md', 'file.{md,txt}')).toBe(true);
				expect(GlobUtils.matches('file.txt', 'file.{md,txt}')).toBe(true);
				expect(GlobUtils.matches('file.pdf', 'file.{md,txt}')).toBe(false);
			});

			test('matches complex alternatives', () => {
				expect(GlobUtils.matches('src/test.ts', '{src,dist}/{test,main}.ts')).toBe(true);
				expect(GlobUtils.matches('dist/main.ts', '{src,dist}/{test,main}.ts')).toBe(true);
				expect(GlobUtils.matches('lib/test.ts', '{src,dist}/{test,main}.ts')).toBe(false);
			});

			test('handles unclosed brace as literal', () => {
				expect(GlobUtils.matches('{abc', '{abc')).toBe(true);
				expect(GlobUtils.matches('xabc', '{abc')).toBe(false);
			});

			test('escapes special chars in alternatives', () => {
				expect(GlobUtils.matches('file.test', 'file.{test,prod}')).toBe(true);
				expect(GlobUtils.matches('file.prod', 'file.{test,prod}')).toBe(true);
			});
		});

		describe('special regex character escaping', () => {
			test('escapes . (dot)', () => {
				expect(GlobUtils.matches('file.md', 'file.md')).toBe(true);
				expect(GlobUtils.matches('fileXmd', 'file.md')).toBe(false);
			});

			test('escapes / (slash)', () => {
				expect(GlobUtils.matches('folder/file.md', 'folder/file.md')).toBe(true);
			});

			test('escapes ( and )', () => {
				expect(GlobUtils.matches('file(1).md', 'file(1).md')).toBe(true);
			});

			test('escapes +', () => {
				expect(GlobUtils.matches('file+test.md', 'file+test.md')).toBe(true);
			});

			test('escapes ^', () => {
				expect(GlobUtils.matches('file^test.md', 'file^test.md')).toBe(true);
			});

			test('escapes $', () => {
				expect(GlobUtils.matches('file$test.md', 'file$test.md')).toBe(true);
			});

			test('escapes |', () => {
				expect(GlobUtils.matches('file|test.md', 'file|test.md')).toBe(true);
			});

			test('escapes \\ (backslash)', () => {
				expect(GlobUtils.matches('file\\test.md', 'file\\test.md')).toBe(true);
			});
		});

		describe('complex pattern combinations', () => {
			test('combines multiple pattern types', () => {
				expect(GlobUtils.matches('src/utils/test-file.ts', 'src/**/*-*.{ts,js}')).toBe(true);
				expect(GlobUtils.matches('src/nested/my-helper.js', 'src/**/*-*.{ts,js}')).toBe(true);
				expect(GlobUtils.matches('src/file.ts', 'src/**/*-*.{ts,js}')).toBe(false);
			});

			test('matches real-world patterns', () => {
				expect(GlobUtils.matches('tests/unit/helper.test.ts', 'tests/**/*.test.ts')).toBe(true);
				expect(GlobUtils.matches('src/index.ts', 'tests/**/*.test.ts')).toBe(false);
			});
		});

		describe('edge cases', () => {
			test('matches empty pattern with empty string', () => {
				expect(GlobUtils.matches('', '')).toBe(true);
			});

			test('does not match non-empty with empty pattern', () => {
				expect(GlobUtils.matches('file.md', '')).toBe(false);
			});

			test('handles patterns with no wildcards', () => {
				expect(GlobUtils.matches('exact/path/file.md', 'exact/path/file.md')).toBe(true);
				expect(GlobUtils.matches('other/path/file.md', 'exact/path/file.md')).toBe(false);
			});
		});
	});

	describe('matchesIncludes()', () => {
		test('returns true when includes is undefined', () => {
			expect(GlobUtils.matchesIncludes('any/path.md', undefined)).toBe(true);
		});

		test('returns true when includes is empty array', () => {
			expect(GlobUtils.matchesIncludes('any/path.md', [])).toBe(true);
		});

		test('returns true when path matches any include pattern', () => {
			const includes = ['*.md', '*.txt'];
			expect(GlobUtils.matchesIncludes('file.md', includes)).toBe(true);
			expect(GlobUtils.matchesIncludes('file.txt', includes)).toBe(true);
		});

		test('returns false when path matches no include patterns', () => {
			const includes = ['*.md', '*.txt'];
			expect(GlobUtils.matchesIncludes('file.pdf', includes)).toBe(false);
		});

		test('matches with complex patterns', () => {
			const includes = ['src/**/*.ts', 'tests/**/*.test.js'];
			expect(GlobUtils.matchesIncludes('src/utils/helper.ts', includes)).toBe(true);
			expect(GlobUtils.matchesIncludes('tests/unit/file.test.js', includes)).toBe(true);
			expect(GlobUtils.matchesIncludes('docs/readme.md', includes)).toBe(false);
		});

		test('stops at first match (optimization check)', () => {
			const includes = ['*.md', '*.txt', '*.pdf'];
			// Should match first pattern and not need to check others
			expect(GlobUtils.matchesIncludes('file.md', includes)).toBe(true);
		});
	});

	describe('matchesExcludes()', () => {
		test('returns false when excludes is undefined', () => {
			expect(GlobUtils.matchesExcludes('any/path.md', undefined)).toBe(false);
		});

		test('returns false when excludes is empty array', () => {
			expect(GlobUtils.matchesExcludes('any/path.md', [])).toBe(false);
		});

		test('returns true when path matches any exclude pattern', () => {
			const excludes = ['*.tmp', 'node_modules/**'];
			expect(GlobUtils.matchesExcludes('file.tmp', excludes)).toBe(true);
			expect(GlobUtils.matchesExcludes('node_modules/package/index.js', excludes)).toBe(true);
		});

		test('returns false when path matches no exclude patterns', () => {
			const excludes = ['*.tmp', 'node_modules/**'];
			expect(GlobUtils.matchesExcludes('src/file.ts', excludes)).toBe(false);
		});

		test('matches with complex patterns', () => {
			const excludes = ['**/*.test.ts', '**/dist/**', '.git/**'];
			expect(GlobUtils.matchesExcludes('src/file.test.ts', excludes)).toBe(true);
			expect(GlobUtils.matchesExcludes('build/dist/main.js', excludes)).toBe(true);
			expect(GlobUtils.matchesExcludes('.git/config', excludes)).toBe(true);
			expect(GlobUtils.matchesExcludes('src/main.ts', excludes)).toBe(false);
		});

		test('stops at first match (optimization check)', () => {
			const excludes = ['*.tmp', '*.bak', '*.old'];
			// Should match first pattern and not need to check others
			expect(GlobUtils.matchesExcludes('file.tmp', excludes)).toBe(true);
		});
	});

	describe('shouldInclude()', () => {
		test('returns true when no includes or excludes specified', () => {
			expect(GlobUtils.shouldInclude('any/path.md')).toBe(true);
			expect(GlobUtils.shouldInclude('any/path.md', undefined, undefined)).toBe(true);
		});

		test('returns true when matches includes and no excludes', () => {
			const includes = ['*.md'];
			expect(GlobUtils.shouldInclude('file.md', includes)).toBe(true);
		});

		test('returns false when does not match includes', () => {
			const includes = ['*.md'];
			expect(GlobUtils.shouldInclude('file.txt', includes)).toBe(false);
		});

		test('returns false when matches excludes', () => {
			const excludes = ['*.tmp'];
			expect(GlobUtils.shouldInclude('file.tmp', undefined, excludes)).toBe(false);
		});

		test('returns false when matches excludes even if matches includes', () => {
			const includes = ['*.md'];
			const excludes = ['draft-*'];
			expect(GlobUtils.shouldInclude('draft-file.md', includes, excludes)).toBe(false);
		});

		test('returns true when matches includes and does not match excludes', () => {
			const includes = ['*.md'];
			const excludes = ['draft-*'];
			expect(GlobUtils.shouldInclude('final-file.md', includes, excludes)).toBe(true);
		});

		test('handles complex real-world scenarios', () => {
			const includes = ['src/**/*.ts', 'tests/**/*.ts'];
			const excludes = ['**/*.test.ts', '**/dist/**', 'node_modules/**'];

			// Should include: matches includes, not excluded
			expect(GlobUtils.shouldInclude('src/utils/helper.ts', includes, excludes)).toBe(true);

			// Should exclude: matches test pattern
			expect(GlobUtils.shouldInclude('tests/unit.test.ts', includes, excludes)).toBe(false);

			// Should exclude: in dist folder
			expect(GlobUtils.shouldInclude('src/dist/compiled.ts', includes, excludes)).toBe(false);

			// Should exclude: doesn't match includes
			expect(GlobUtils.shouldInclude('docs/readme.md', includes, excludes)).toBe(false);
		});

		test('includes take precedence before checking excludes', () => {
			const includes = ['src/**'];
			const excludes = ['**/*.tmp'];

			// Doesn't match includes, so excluded before exclude patterns checked
			expect(GlobUtils.shouldInclude('dist/file.js', includes, excludes)).toBe(false);

			// Matches includes but also matches excludes
			expect(GlobUtils.shouldInclude('src/file.tmp', includes, excludes)).toBe(false);

			// Matches includes and doesn't match excludes
			expect(GlobUtils.shouldInclude('src/file.js', includes, excludes)).toBe(true);
		});

		test('empty arrays behave correctly', () => {
			// Empty includes means include everything
			expect(GlobUtils.shouldInclude('any/file.md', [], ['*.tmp'])).toBe(true);

			// Empty excludes means exclude nothing
			expect(GlobUtils.shouldInclude('file.md', ['*.md'], [])).toBe(true);

			// Both empty means include everything
			expect(GlobUtils.shouldInclude('any/file.md', [], [])).toBe(true);
		});
	});
});