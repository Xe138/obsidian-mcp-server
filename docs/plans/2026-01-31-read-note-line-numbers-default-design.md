# Design: Line Numbers by Default in `read_note`

**Date:** 2026-01-31
**Version:** 1.2.1

## Summary

Change `read_note` to return line-numbered content by default (e.g., `1→First line`) to help AI assistants reference specific locations when discussing notes. Add `withLineNumbers: false` to get raw content.

## Motivation

AI assistants can give much more precise references like "line 42 has a typo" rather than vague "in the section about X". Line numbers make file discussions unambiguous.

## Changes

### 1. Default Behavior Change

```typescript
// Before
const withLineNumbers = options?.withLineNumbers ?? false;

// After
const withLineNumbers = options?.withLineNumbers ?? true;
```

### 2. Apply to Parsed Path

Currently the `parseFrontmatter: true` path ignores line numbers. Add line numbering to the `content` field (and `contentWithoutFrontmatter`) when enabled.

### 3. Schema Update

Update the tool description to say "Default: true" and clarify opt-out with `withLineNumbers: false`.

## Files to Modify

### `src/tools/note-tools.ts`
- Line 48: Change default from `false` to `true`
- Lines 125-155: Add line numbering logic to the `parseFrontmatter` path for `content` and `contentWithoutFrontmatter` fields
- Add `totalLines` to parsed response when line numbers enabled

### `src/tools/index.ts`
- Lines 51-54: Update schema description to reflect new default

### `tests/note-tools.test.ts`
- Update existing tests that expect raw content to either:
  - Explicitly pass `withLineNumbers: false`, or
  - Update assertions to expect numbered content

## Response Format Examples

### Before (current default)
```json
{
  "content": "# Title\nSome content",
  "wordCount": 3,
  "versionId": "abc123"
}
```

### After (new default)
```json
{
  "content": "1→# Title\n2→Some content",
  "totalLines": 2,
  "wordCount": 3,
  "versionId": "abc123"
}
```

### Opt-out (`withLineNumbers: false`)
```json
{
  "content": "# Title\nSome content",
  "wordCount": 3,
  "versionId": "abc123"
}
```

## Breaking Change

This changes the default response format. MCP clients that parse `content` expecting raw text will need to either:
- Update their parsing to handle line-numbered format
- Explicitly pass `withLineNumbers: false`

## Version

Bump to 1.2.1.
