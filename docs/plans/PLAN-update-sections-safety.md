# Plan: Fix update_sections Line Number Issue via MCP Server Changes

## Problem Analysis

When using `update_sections`, line number errors occur because:

1. **`read_note` doesn't return line numbers** - Returns content as a string, no line mapping
2. **`ifMatch` is optional** - No enforcement of version checking before edits
3. **`versionId` inconsistent** - Only returned when `parseFrontmatter: true`

### Root Cause

The `Read` tool shows line numbers (e.g., `1→content`) but `read_note` does not. When using `read_note` and later calling `update_sections`, line numbers are guessed based on stale content.

---

## Proposed Changes

### Change 1: Add `withLineNumbers` Option to `read_note`

**File:** `src/tools/note-tools.ts`

**Current behavior:** Returns `{ content: "...", wordCount: N }`

**New behavior with `withLineNumbers: true`:** Returns numbered lines using `→` prefix:

```json
{
  "content": "1→---\n2→title: Example\n3→---\n4→\n5→## Overview\n6→Some text here",
  "totalLines": 6,
  "versionId": "abc123",
  "wordCount": 42
}
```

**Implementation (add after existing options handling):**

```typescript
// If withLineNumbers requested, prefix each line with line number
if (options?.withLineNumbers && withContent) {
  const lines = content.split('\n');
  const numberedContent = lines
    .map((line, idx) => `${idx + 1}→${line}`)
    .join('\n');

  const result = {
    content: numberedContent,
    totalLines: lines.length,
    versionId: VersionUtils.generateVersionId(file),
    wordCount: ContentUtils.countWords(content)
  };
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
}
```

**Schema update (in `index.ts`):**

```typescript
withLineNumbers: {
  type: "boolean",
  description: "If true, prefix each line with its line number (e.g., '1→content'). Use this when you need to make line-based edits with update_sections. Returns totalLines count and versionId for use with ifMatch parameter."
}
```

---

### Change 2: Require `ifMatch` for `update_sections`

**File:** `src/tools/note-tools.ts`

**Current behavior:** `ifMatch` is optional - edits proceed without version check.

**New behavior:** `ifMatch` is required unless `force: true` is passed.

**Method signature change:**

```typescript
async updateSections(
  path: string,
  edits: SectionEdit[],
  ifMatch?: string,        // Still optional in signature
  validateLinks: boolean = true,
  force?: boolean          // NEW: explicit opt-out
): Promise<CallToolResult>
```

**Validation logic (early in method, after path/edits validation):**

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

**Schema update (in `index.ts`):**

```typescript
ifMatch: {
  type: "string",
  description: "Required: ETag/versionId for concurrency control. Get this from read_note response. Update only proceeds if file hasn't changed since read. Omit only with force:true."
},
force: {
  type: "boolean",
  description: "If true, skip version check and apply edits without ifMatch. Use only when you intentionally want to overwrite without checking for concurrent changes. Default: false"
}
```

**Note:** Keep `required: ["path", "edits"]` in schema - we enforce `ifMatch` in code to provide a helpful error message.

---

### Change 3: Always Return `versionId` from `read_note`

**File:** `src/tools/note-tools.ts`

**Current behavior:** Only returns `versionId` when `parseFrontmatter: true`.

**New behavior:** Always include `versionId` in the response.

**Current code (around line 88):**

```typescript
const result = {
  content,
  wordCount
};
```

**Updated code:**

```typescript
const result = {
  content,
  wordCount,
  versionId: VersionUtils.generateVersionId(file)
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/tools/note-tools.ts` | Add `withLineNumbers`, add `force` parameter, always return `versionId` |
| `src/tools/index.ts` | Update schemas for `read_note` and `update_sections` |

---

## Implementation Steps

1. **Modify `readNote`** in `note-tools.ts`:
   - Add `withLineNumbers` option handling
   - Always return `versionId` when returning content

2. **Modify `updateSections`** in `note-tools.ts`:
   - Add `force` parameter
   - Add validation requiring `ifMatch` unless `force: true`

3. **Update tool schemas** in `index.ts`:
   - Add `withLineNumbers` property to `read_note` schema
   - Add `force` property to `update_sections` schema
   - Update `ifMatch` description to indicate it's required

4. **Update call site** in `index.ts`:
   - Pass `force` parameter through to `updateSections`

5. **Write tests** for new behaviors

6. **Build and test** in Obsidian

---

## Verification

1. **`read_note` with `withLineNumbers: true`** → returns numbered content, `totalLines`, `versionId`
2. **`read_note` without options** → returns content with `versionId` (new behavior)
3. **`update_sections` without `ifMatch`** → returns error with helpful message
4. **`update_sections` with `force: true`** → proceeds without version check
5. **`update_sections` with valid `ifMatch`** → proceeds normally
6. **`update_sections` with stale `ifMatch`** → returns version mismatch error

---

## Breaking Change

**Impact:** Callers that omit `ifMatch` from `update_sections` will receive an error unless they explicitly pass `force: true`.

**Mitigation:** The error message explains how to fix the issue and mentions the `force` option for those who intentionally want to skip version checking.
