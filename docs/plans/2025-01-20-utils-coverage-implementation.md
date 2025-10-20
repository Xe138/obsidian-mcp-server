# Implementation Plan: 100% Utility Coverage

**Date:** 2025-01-20
**Branch:** feature/utils-coverage
**Goal:** Achieve 100% test coverage on all utility modules using dependency injection pattern

## Overview

Apply the same adapter pattern used for tools to utility modules, enabling comprehensive testing. This is pre-release validation work.

## Current Coverage Status

- glob-utils.ts: 14.03%
- frontmatter-utils.ts: 47.86%
- search-utils.ts: 1.78%
- link-utils.ts: 13.76%
- waypoint-utils.ts: 49.18%

**Target:** 100% on all utilities

## Implementation Tasks

### Task 2: Add comprehensive tests for glob-utils.ts

**Objective:** Achieve 100% coverage on glob-utils.ts (pure utility, no refactoring needed)

**Steps:**
1. Create `tests/glob-utils.test.ts`
2. Test `globToRegex()` pattern conversion:
   - `*` matches any chars except `/`
   - `**` matches any chars including `/`
   - `?` matches single char except `/`
   - `[abc]` character classes
   - `{a,b}` alternatives
   - Edge cases: unclosed brackets, unclosed braces
3. Test `matches()` with various patterns
4. Test `matchesIncludes()` with empty/populated arrays
5. Test `matchesExcludes()` with empty/populated arrays
6. Test `shouldInclude()` combining includes and excludes
7. Run coverage to verify 100%
8. Commit: "test: add comprehensive glob-utils tests"

**Files to create:**
- `tests/glob-utils.test.ts`

**Expected outcome:** glob-utils.ts at 100% coverage

---

### Task 3: Add comprehensive tests for frontmatter-utils.ts

**Objective:** Achieve 100% coverage on frontmatter-utils.ts

**Steps:**
1. Create `tests/frontmatter-utils.test.ts`
2. Mock `parseYaml` from obsidian module
3. Test `extractFrontmatter()`:
   - Valid frontmatter with `---` delimiters
   - No frontmatter
   - Missing closing delimiter
   - Parse errors (mock parseYaml throwing)
4. Test `extractFrontmatterSummary()`:
   - Null input
   - Title, tags, aliases extraction
   - Tags/aliases as string vs array
5. Test `hasFrontmatter()` quick check
6. Test `serializeFrontmatter()`:
   - Arrays, objects, strings with special chars
   - Empty objects
   - Strings needing quotes
7. Test `parseExcalidrawMetadata()`:
   - Valid Excalidraw with markers
   - Compressed data detection
   - Uncompressed JSON parsing
   - Missing JSON blocks
8. Run coverage to verify 100%
9. Commit: "test: add comprehensive frontmatter-utils tests"

**Files to create:**
- `tests/frontmatter-utils.test.ts`

**Expected outcome:** frontmatter-utils.ts at 100% coverage

---

### Task 4: Refactor search-utils.ts to use IVaultAdapter

**Objective:** Decouple search-utils from App, use IVaultAdapter

**Steps:**
1. Change `SearchUtils.search()` signature:
   - From: `search(app: App, options: SearchOptions)`
   - To: `search(vault: IVaultAdapter, options: SearchOptions)`
2. Update method body:
   - Replace `app.vault.getMarkdownFiles()` with `vault.getMarkdownFiles()`
   - Replace `app.vault.read(file)` with `vault.read(file)`
3. Change `SearchUtils.searchWaypoints()` signature:
   - From: `searchWaypoints(app: App, folder?: string)`
   - To: `searchWaypoints(vault: IVaultAdapter, folder?: string)`
4. Update method body:
   - Replace `app.vault.getMarkdownFiles()` with `vault.getMarkdownFiles()`
   - Replace `app.vault.read(file)` with `vault.read(file)`
5. Run tests to ensure no breakage (will update callers in Task 7)
6. Commit: "refactor: search-utils to use IVaultAdapter"

**Files to modify:**
- `src/utils/search-utils.ts`

**Expected outcome:** search-utils.ts uses adapters instead of App

---

### Task 5: Refactor link-utils.ts to use adapters

**Objective:** Decouple link-utils from App, use adapters

**Steps:**
1. Change `LinkUtils.resolveLink()` signature:
   - From: `resolveLink(app: App, sourcePath: string, linkText: string)`
   - To: `resolveLink(vault: IVaultAdapter, metadata: IMetadataCacheAdapter, sourcePath: string, linkText: string)`
2. Update method body:
   - Replace `app.vault.getAbstractFileByPath()` with `vault.getAbstractFileByPath()`
   - Replace `app.metadataCache.getFirstLinkpathDest()` with `metadata.getFirstLinkpathDest()`
3. Change `LinkUtils.findSuggestions()` signature:
   - From: `findSuggestions(app: App, linkText: string, ...)`
   - To: `findSuggestions(vault: IVaultAdapter, linkText: string, ...)`
4. Update: `app.vault.getMarkdownFiles()` → `vault.getMarkdownFiles()`
5. Change `LinkUtils.getBacklinks()` signature:
   - From: `getBacklinks(app: App, targetPath: string, ...)`
   - To: `getBacklinks(vault: IVaultAdapter, metadata: IMetadataCacheAdapter, targetPath: string, ...)`
6. Update method body:
   - Replace `app.vault` calls with `vault` calls
   - Replace `app.metadataCache` calls with `metadata` calls
7. Change `LinkUtils.validateWikilinks()` signature:
   - From: `validateWikilinks(app: App, filePath: string)`
   - To: `validateWikilinks(vault: IVaultAdapter, metadata: IMetadataCacheAdapter, filePath: string)`
8. Update all internal calls to `resolveLink()` to pass both adapters
9. Run tests (will break until Task 7)
10. Commit: "refactor: link-utils to use adapters"

**Files to modify:**
- `src/utils/link-utils.ts`

**Expected outcome:** link-utils.ts uses adapters instead of App

---

### Task 6: Refactor waypoint-utils.ts to use IVaultAdapter

**Objective:** Decouple waypoint-utils from App, use IVaultAdapter

**Steps:**
1. Change `WaypointUtils.isFolderNote()` signature:
   - From: `isFolderNote(app: App, file: TFile)`
   - To: `isFolderNote(vault: IVaultAdapter, file: TFile)`
2. Update method body:
   - Replace `await app.vault.read(file)` with `await vault.read(file)`
3. Run tests (will break until Task 7)
4. Commit: "refactor: waypoint-utils to use IVaultAdapter"

**Files to modify:**
- `src/utils/waypoint-utils.ts`

**Expected outcome:** waypoint-utils.ts uses adapters instead of App

---

### Task 7: Update VaultTools to pass adapters to utilities

**Objective:** Fix all callers of refactored utilities

**Steps:**
1. In VaultTools.search() method:
   - Change: `SearchUtils.search(this.app, options)`
   - To: `SearchUtils.search(this.vault, options)`
2. In VaultTools.searchWaypoints() method:
   - Change: `SearchUtils.searchWaypoints(this.app, folder)`
   - To: `SearchUtils.searchWaypoints(this.vault, folder)`
3. In VaultTools.validateWikilinks() method:
   - Change: `LinkUtils.validateWikilinks(this.app, filePath)`
   - To: `LinkUtils.validateWikilinks(this.vault, this.metadata, filePath)`
4. In VaultTools.resolveWikilink() method:
   - Change: `LinkUtils.resolveLink(this.app, sourcePath, linkText)`
   - To: `LinkUtils.resolveLink(this.vault, this.metadata, sourcePath, linkText)`
5. In VaultTools.getBacklinks() method:
   - Change: `LinkUtils.getBacklinks(this.app, targetPath, includeUnlinked)`
   - To: `LinkUtils.getBacklinks(this.vault, this.metadata, targetPath, includeUnlinked)`
6. In VaultTools.isFolderNote() method:
   - Change: `WaypointUtils.isFolderNote(this.app, file)`
   - To: `WaypointUtils.isFolderNote(this.vault, file)`
7. Run all tests to verify no breakage
8. Commit: "refactor: update VaultTools to pass adapters to utils"

**Files to modify:**
- `src/tools/vault-tools.ts`

**Expected outcome:** All tests passing, utilities use adapters

---

### Task 8: Add comprehensive tests for search-utils.ts

**Objective:** Achieve 100% coverage on search-utils.ts

**Steps:**
1. Create `tests/search-utils.test.ts`
2. Set up mock IVaultAdapter
3. Test `SearchUtils.search()`:
   - Basic literal search
   - Regex search with pattern
   - Case sensitive vs insensitive
   - Folder filtering
   - Glob includes/excludes filtering
   - Snippet extraction with long lines
   - Filename matching (line: 0)
   - MaxResults limiting
   - File read errors (catch block)
   - Zero-width regex matches (prevent infinite loop)
4. Test `SearchUtils.searchWaypoints()`:
   - Finding waypoint blocks
   - Extracting links from waypoints
   - Folder filtering
   - Unclosed waypoints
   - File read errors
5. Run coverage to verify 100%
6. Commit: "test: add comprehensive search-utils tests"

**Files to create:**
- `tests/search-utils.test.ts`

**Expected outcome:** search-utils.ts at 100% coverage

---

### Task 9: Add comprehensive tests for link-utils.ts

**Objective:** Achieve 100% coverage on link-utils.ts

**Steps:**
1. Create `tests/link-utils.test.ts`
2. Set up mock IVaultAdapter and IMetadataCacheAdapter
3. Test `LinkUtils.parseWikilinks()`:
   - Simple links `[[target]]`
   - Links with aliases `[[target|alias]]`
   - Links with headings `[[note#heading]]`
   - Multiple links per line
4. Test `LinkUtils.resolveLink()`:
   - Valid link resolution
   - Invalid source path
   - Link not found (returns null)
5. Test `LinkUtils.findSuggestions()`:
   - Exact basename match
   - Partial basename match
   - Path contains match
   - Character similarity scoring
   - MaxSuggestions limiting
6. Test `LinkUtils.getBacklinks()`:
   - Linked backlinks from resolvedLinks
   - Unlinked mentions when includeUnlinked=true
   - Skip target file itself
   - Extract snippets
7. Test `LinkUtils.validateWikilinks()`:
   - Resolved links
   - Unresolved links with suggestions
   - File not found
8. Test `LinkUtils.extractSnippet()` private method via public methods
9. Run coverage to verify 100%
10. Commit: "test: add comprehensive link-utils tests"

**Files to create:**
- `tests/link-utils.test.ts`

**Expected outcome:** link-utils.ts at 100% coverage

---

### Task 10: Add comprehensive tests for waypoint-utils.ts

**Objective:** Achieve 100% coverage on waypoint-utils.ts

**Steps:**
1. Create `tests/waypoint-utils.test.ts`
2. Set up mock IVaultAdapter
3. Test `WaypointUtils.extractWaypointBlock()`:
   - Valid waypoint with links
   - No waypoint in content
   - Unclosed waypoint
   - Empty waypoint
4. Test `WaypointUtils.hasWaypointMarker()`:
   - Content with both markers
   - Content missing markers
5. Test `WaypointUtils.isFolderNote()`:
   - Basename match (reason: basename_match)
   - Waypoint marker (reason: waypoint_marker)
   - Both (reason: both)
   - Neither (reason: none)
   - File read errors
6. Test `WaypointUtils.wouldAffectWaypoint()`:
   - Waypoint removed
   - Waypoint content changed
   - Waypoint moved but content same
   - No waypoint in either version
7. Test pure helper methods:
   - `getParentFolderPath()`
   - `getBasename()`
8. Run coverage to verify 100%
9. Commit: "test: add comprehensive waypoint-utils tests"

**Files to create:**
- `tests/waypoint-utils.test.ts`

**Expected outcome:** waypoint-utils.ts at 100% coverage

---

### Task 11: Verify 100% coverage on all utilities

**Objective:** Confirm all utilities at 100% coverage

**Steps:**
1. Run `npm run test:coverage`
2. Check coverage report for:
   - glob-utils.ts: 100%
   - frontmatter-utils.ts: 100%
   - search-utils.ts: 100%
   - link-utils.ts: 100%
   - waypoint-utils.ts: 100%
3. If any gaps remain, identify uncovered lines
4. Add tests to cover any remaining gaps
5. Commit any additional tests
6. Final coverage verification

**Expected outcome:** All utilities at 100% coverage

---

### Task 12: Run full test suite and build

**Objective:** Verify all tests pass and build succeeds

**Steps:**
1. Run `npm test` to verify all tests pass
2. Run `npm run build` to verify no type errors
3. Check test count increased significantly
4. Verify no regressions in existing tests
5. Document final test counts and coverage

**Expected outcome:** All tests passing, build successful

---

### Task 13: Create summary and merge to master

**Objective:** Document work and integrate to master

**Steps:**
1. Create summary document with:
   - Coverage improvements
   - Test counts before/after
   - Architecture changes (adapter pattern in utils)
2. Use finishing-a-development-branch skill
3. Merge to master
4. Clean up worktree

**Expected outcome:** Work merged, worktree cleaned up

## Success Criteria

- [ ] All utilities at 100% statement coverage
- [ ] All tests passing (expected 300+ tests)
- [ ] Build succeeds with no type errors
- [ ] Adapter pattern consistently applied
- [ ] Work merged to master branch
