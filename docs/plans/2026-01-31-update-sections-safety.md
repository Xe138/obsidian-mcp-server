# update_sections Safety Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add line numbers to `read_note` and require version checking in `update_sections` to prevent line-based edit errors.

**Architecture:** Three focused changes: (1) `withLineNumbers` option on `read_note` returns numbered lines using `→` prefix, (2) `force` parameter on `update_sections` makes `ifMatch` required unless explicitly bypassed, (3) always return `versionId` from `read_note`.

**Tech Stack:** TypeScript, Jest, Obsidian API

---

## Task 1: Add `withLineNumbers` Tests

**Files:**
- Modify: `tests/note-tools.test.ts` (after line ~100, in the `readNote` describe block)

**Step 1: Write the failing tests**

Add these tests in the `describe('readNote', ...)` block:

```typescript
it('should return numbered lines when withLineNumbers is true', async () => {
	const mockFile = createMockTFile('test.md', {
		ctime: 1000,
		mtime: 2000,
		size: 100
	});
	const content = '# Title\n\nParagraph text\nMore text';

	(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
	mockVault.read = jest.fn().mockResolvedValue(content);

	const result = await noteTools.readNote('test.md', { withLineNumbers: true });

	expect(result.isError).toBeUndefined();
	const parsed = JSON.parse(result.content[0].text);
	expect(parsed.content).toBe('1→# Title\n2→\n3→Paragraph text\n4→More text');
	expect(parsed.totalLines).toBe(4);
	expect(parsed.versionId).toBe('2000-100');
	expect(parsed.wordCount).toBe(4); // Title Paragraph text More text
});

it('should return versionId even without withLineNumbers', async () => {
	const mockFile = createMockTFile('test.md', {
		ctime: 1000,
		mtime: 2000,
		size: 100
	});
	const content = '# Test';

	(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
	mockVault.read = jest.fn().mockResolvedValue(content);

	const result = await noteTools.readNote('test.md');

	expect(result.isError).toBeUndefined();
	const parsed = JSON.parse(result.content[0].text);
	expect(parsed.content).toBe('# Test');
	expect(parsed.versionId).toBe('2000-100');
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=note-tools.test.ts --testNamePattern="withLineNumbers|versionId even without"`
Expected: FAIL - `versionId` undefined, content not numbered

**Step 3: Commit failing tests**

```bash
git add tests/note-tools.test.ts
git commit -m "test: add failing tests for withLineNumbers and versionId"
```

---

## Task 2: Implement `withLineNumbers` in `readNote`

**Files:**
- Modify: `src/tools/note-tools.ts:31-38` (options type)
- Modify: `src/tools/note-tools.ts:83-99` (implementation)

**Step 1: Update the options type (line 33-37)**

Change from:
```typescript
options?: {
	withFrontmatter?: boolean;
	withContent?: boolean;
	parseFrontmatter?: boolean;
}
```

To:
```typescript
options?: {
	withFrontmatter?: boolean;
	withContent?: boolean;
	parseFrontmatter?: boolean;
	withLineNumbers?: boolean;
}
```

**Step 2: Add withLineNumbers handling (after line 45, before path validation)**

Add this line after the existing option destructuring:
```typescript
/* istanbul ignore next */
const withLineNumbers = options?.withLineNumbers ?? false;
```

**Step 3: Add numbered content logic (replace lines 83-99)**

Replace the existing `if (!parseFrontmatter)` block with:

```typescript
// If no special options, return simple content
if (!parseFrontmatter) {
	// Compute word count when returning content
	if (withContent) {
		const wordCount = ContentUtils.countWords(content);
		const versionId = VersionUtils.generateVersionId(file);

		// If withLineNumbers, prefix each line with line number
		if (withLineNumbers) {
			const lines = content.split('\n');
			const numberedContent = lines
				.map((line, idx) => `${idx + 1}→${line}`)
				.join('\n');

			const result = {
				content: numberedContent,
				totalLines: lines.length,
				versionId,
				wordCount
			};
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
			};
		}

		const result = {
			content,
			wordCount,
			versionId
		};
		return {
			content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
		};
	}
	return {
		content: [{ type: "text", text: content }]
	};
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=note-tools.test.ts --testNamePattern="withLineNumbers|versionId even without"`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All 760+ tests pass

**Step 6: Commit implementation**

```bash
git add src/tools/note-tools.ts
git commit -m "feat(read_note): add withLineNumbers option and always return versionId"
```

---

## Task 3: Update `read_note` Schema

**Files:**
- Modify: `src/tools/index.ts:39-50` (read_note properties)

**Step 1: Add withLineNumbers to schema**

After the `parseFrontmatter` property (around line 49), add:

```typescript
withLineNumbers: {
	type: "boolean",
	description: "If true, prefix each line with its line number (e.g., '1→content'). Use this when you need to make line-based edits with update_sections. Returns totalLines count and versionId for use with ifMatch parameter. Default: false"
}
```

**Step 2: Update tool description (line 31)**

Update the description to mention line numbers:

```typescript
description: "Read the content of a file from the Obsidian vault with optional frontmatter parsing. Returns versionId for concurrency control. When withLineNumbers is true, prefixes each line with its number (e.g., '1→content') for use with update_sections. Returns word count (excluding frontmatter and Obsidian comments) when content is included. Path must be vault-relative (no leading slash) and include the file extension. Use list() first if you're unsure of the exact path.",
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 4: Commit schema update**

```bash
git add src/tools/index.ts
git commit -m "docs(read_note): add withLineNumbers to tool schema"
```

---

## Task 4: Add `force` Parameter Tests for `updateSections`

**Files:**
- Modify: `tests/note-tools.test.ts` (after line ~960, in the `updateSections` describe block)

**Step 1: Write failing tests**

Add these tests in the `describe('updateSections', ...)` block:

```typescript
it('should return error when ifMatch not provided and force not set', async () => {
	const mockFile = createMockTFile('test.md');
	(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);

	const result = await noteTools.updateSections('test.md', [
		{ startLine: 1, endLine: 1, content: 'New' }
	]);

	expect(result.isError).toBe(true);
	const parsed = JSON.parse(result.content[0].text);
	expect(parsed.error).toBe('Version check required');
	expect(parsed.message).toContain('ifMatch parameter is required');
	expect(mockVault.modify).not.toHaveBeenCalled();
});

it('should proceed without ifMatch when force is true', async () => {
	const mockFile = createMockTFile('test.md', {
		ctime: 1000,
		mtime: 2000,
		size: 100
	});
	const content = 'Line 1\nLine 2';

	(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
	mockVault.read = jest.fn().mockResolvedValue(content);
	mockVault.modify = jest.fn().mockResolvedValue(undefined);

	const result = await noteTools.updateSections(
		'test.md',
		[{ startLine: 1, endLine: 1, content: 'New Line 1' }],
		undefined, // no ifMatch
		true,      // validateLinks
		true       // force
	);

	expect(result.isError).toBeUndefined();
	expect(mockVault.modify).toHaveBeenCalled();
	const parsed = JSON.parse(result.content[0].text);
	expect(parsed.success).toBe(true);
});

it('should proceed with valid ifMatch without force', async () => {
	const mockFile = createMockTFile('test.md', {
		ctime: 1000,
		mtime: 2000,
		size: 100
	});
	const content = 'Line 1\nLine 2';

	(PathUtils.resolveFile as jest.Mock).mockReturnValue(mockFile);
	mockVault.read = jest.fn().mockResolvedValue(content);
	mockVault.modify = jest.fn().mockResolvedValue(undefined);

	const result = await noteTools.updateSections(
		'test.md',
		[{ startLine: 1, endLine: 1, content: 'New Line 1' }],
		'2000-100' // valid ifMatch
	);

	expect(result.isError).toBeUndefined();
	expect(mockVault.modify).toHaveBeenCalled();
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=note-tools.test.ts --testNamePattern="ifMatch not provided|force is true|valid ifMatch without force"`
Expected: FAIL - first test expects error but gets success, second test has wrong arity

**Step 3: Commit failing tests**

```bash
git add tests/note-tools.test.ts
git commit -m "test: add failing tests for updateSections force parameter"
```

---

## Task 5: Implement `force` Parameter in `updateSections`

**Files:**
- Modify: `src/tools/note-tools.ts:880-907` (method signature and validation)

**Step 1: Update method signature (lines 880-885)**

Change from:
```typescript
async updateSections(
	path: string,
	edits: SectionEdit[],
	ifMatch?: string,
	validateLinks: boolean = true
): Promise<CallToolResult> {
```

To:
```typescript
async updateSections(
	path: string,
	edits: SectionEdit[],
	ifMatch?: string,
	validateLinks: boolean = true,
	force: boolean = false
): Promise<CallToolResult> {
```

**Step 2: Add ifMatch requirement check (after line 907, after edits validation)**

Insert after the "No edits provided" check:

```typescript
// Require ifMatch unless force is true
if (!ifMatch && !force) {
	return {
		content: [{
			type: "text",
			text: JSON.stringify({
				error: 'Version check required',
				message: 'The ifMatch parameter is required to prevent overwriting concurrent changes. First call read_note with withLineNumbers:true to get the versionId, then pass it as ifMatch. To bypass this check, set force:true (not recommended).'
			}, null, 2)
		}],
		isError: true
	};
}
```

**Step 3: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=note-tools.test.ts --testNamePattern="ifMatch not provided|force is true|valid ifMatch without force"`
Expected: PASS

**Step 4: Run full test suite**

Run: `npm test`
Expected: Some tests may fail (existing tests that don't pass ifMatch)

**Step 5: Fix existing tests that now fail**

Update existing `updateSections` tests to either:
- Pass a valid `ifMatch` value, OR
- Pass `force: true`

For the "should update sections successfully" test (around line 882), update to use force:

```typescript
const result = await noteTools.updateSections('test.md', [
	{ startLine: 2, endLine: 3, content: 'New Line 2\nNew Line 3' }
], undefined, true, true); // validateLinks=true, force=true
```

Apply similar fixes to other affected tests in the `updateSections` block.

**Step 6: Run full test suite again**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit implementation**

```bash
git add src/tools/note-tools.ts tests/note-tools.test.ts
git commit -m "feat(update_sections): require ifMatch with force opt-out"
```

---

## Task 6: Update `update_sections` Schema and Call Site

**Files:**
- Modify: `src/tools/index.ts:184-194` (update_sections schema)
- Modify: `src/tools/index.ts:529-537` (call site)

**Step 1: Update ifMatch description (line 184-187)**

Change from:
```typescript
ifMatch: {
	type: "string",
	description: "Optional ETag/versionId for concurrency control. If provided, update only proceeds if file hasn't been modified. Get versionId from read operations. Prevents conflicting edits in concurrent scenarios."
},
```

To:
```typescript
ifMatch: {
	type: "string",
	description: "Required: ETag/versionId for concurrency control. Get this from read_note response (always included). Update only proceeds if file hasn't changed since read. Omit only with force:true."
},
```

**Step 2: Add force property (after validateLinks, around line 191)**

Add:
```typescript
force: {
	type: "boolean",
	description: "If true, skip version check and apply edits without ifMatch. Use only when you intentionally want to overwrite without checking for concurrent changes. Not recommended. Default: false"
}
```

**Step 3: Update call site (lines 529-537)**

Change from:
```typescript
case "update_sections": {
	const a = args as { path: string; edits: Array<{ startLine: number; endLine: number; content: string }>; ifMatch?: string; validateLinks?: boolean };
	result = await this.noteTools.updateSections(
		a.path,
		a.edits,
		a.ifMatch,
		a.validateLinks ?? true
	);
	break;
}
```

To:
```typescript
case "update_sections": {
	const a = args as { path: string; edits: Array<{ startLine: number; endLine: number; content: string }>; ifMatch?: string; validateLinks?: boolean; force?: boolean };
	result = await this.noteTools.updateSections(
		a.path,
		a.edits,
		a.ifMatch,
		a.validateLinks ?? true,
		a.force ?? false
	);
	break;
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit schema and call site updates**

```bash
git add src/tools/index.ts
git commit -m "docs(update_sections): update schema for required ifMatch and force opt-out"
```

---

## Task 7: Final Verification

**Step 1: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: All tests pass, coverage maintained

**Step 2: Build for production**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual verification checklist**

Verify these scenarios work correctly:

1. `read_note` without options → returns `content`, `wordCount`, `versionId`
2. `read_note` with `withLineNumbers: true` → returns numbered content, `totalLines`, `versionId`
3. `update_sections` without `ifMatch` → returns "Version check required" error
4. `update_sections` with `force: true` → proceeds without version check
5. `update_sections` with valid `ifMatch` → proceeds normally
6. `update_sections` with stale `ifMatch` → returns version mismatch error

**Step 4: Create summary commit**

```bash
git log --oneline -6
```

Verify commit history looks clean and logical.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/tools/note-tools.ts` | Add `withLineNumbers` option, add `force` parameter, always return `versionId` |
| `src/tools/index.ts` | Update schemas for both tools, update call site |
| `tests/note-tools.test.ts` | Add tests for new features, fix existing tests |

**Breaking Change:** `update_sections` now requires `ifMatch` parameter unless `force: true` is passed.
