# Implementation Plan: 100% Tool Coverage

**Date:** 2025-01-20
**Goal:** Achieve 100% test coverage on note-tools.ts and vault-tools.ts
**Approach:** Add targeted test cases to existing test files

## Overview

This plan addresses the remaining coverage gaps in the tool modules to achieve 100% statement coverage as part of pre-release validation.

## Current Coverage Status

- **note-tools.ts:** 96.01% → Target: 100% (9 uncovered lines)
- **vault-tools.ts:** 94.22% → Target: 100% (14 uncovered lines)

## Gap Analysis

### Note-Tools Uncovered Lines (9 lines)

1. **Lines 238-239:** Conflict resolution loop (when creating files with duplicate names)
2. **Lines 377, 408, 590, 710, 836:** Folder-not-file errors (5 occurrences across different methods)
3. **Line 647:** Include compressed data flag in Excalidraw read
4. **Line 771:** Add frontmatter to file that has no existing frontmatter

### Vault-Tools Uncovered Lines (14 lines)

1. **Line 76:** Invalid path validation error
2. **Line 200:** Folder assignment (possibly unreachable)
3. **Line 267:** Skip root folder in iteration
4. **Line 272:** Glob filtering skip
5. **Line 325:** Alias as string (non-array) normalization
6. **Line 374:** Folder mtime extraction error catch
7. **Lines 452-456, 524-528:** Defensive "path doesn't exist" returns
8. **Lines 596-597:** Glob filtering in search
9. **Lines 608, 620:** MaxResults early termination
10. **Line 650:** Snippet end-of-line adjustment
11. **Line 777:** Search error catch block

## Implementation Tasks

### Task 1: Add Note-Tools Conflict Resolution Tests

**Objective:** Cover lines 238-239 (conflict resolution loop)

**Steps:**
1. Add test: "creates file with incremented counter when conflicts exist"
2. Mock PathUtils.fileExists to return true for "file.md" and "file 2.md"
3. Verify creates "file 3.md"
4. Run coverage to confirm lines 238-239 covered

**Files to modify:**
- `tests/note-tools.test.ts`

**Expected outcome:** Lines 238-239 covered

---

### Task 2: Add Note-Tools Folder-Not-File Error Tests

**Objective:** Cover lines 377, 408, 590, 710, 836 (folder instead of file errors)

**Steps:**
1. Add test for read_note: "returns error when path is a folder"
   - Mock PathUtils.folderExists to return true
   - Verify error message uses ErrorMessages.notAFile()

2. Add test for rename_file: "returns error when path is a folder"
3. Add test for update_note: "returns error when path is a folder"
4. Add test for delete_note: "returns error when path is a folder"
5. Add test for update_sections: "returns error when path is a folder"
6. Run coverage to confirm all 5 lines covered

**Files to modify:**
- `tests/note-tools.test.ts`

**Expected outcome:** Lines 377, 408, 590, 710, 836 covered

---

### Task 3: Add Note-Tools Excalidraw and Frontmatter Tests

**Objective:** Cover lines 647, 771

**Steps:**
1. Add test for read_excalidraw: "includes compressed data when flag is true"
   - Call with includeCompressed=true
   - Verify result.compressedData is included

2. Add test for update_frontmatter: "adds frontmatter to file without existing frontmatter"
   - Mock file content without frontmatter
   - Update frontmatter
   - Verify frontmatter added at beginning with newline separator

3. Run coverage to confirm lines 647, 771 covered

**Files to modify:**
- `tests/note-tools.test.ts`

**Expected outcome:** Lines 647, 771 covered, note-tools.ts at 100%

---

### Task 4: Add Vault-Tools Invalid Path and Glob Tests

**Objective:** Cover lines 76, 272, 596-597

**Steps:**
1. Add test for list(): "returns error for invalid vault path"
   - Mock PathUtils.isValidVaultPath to return false
   - Verify error message

2. Add test for list(): "filters items using glob excludes"
   - Mock GlobUtils.shouldInclude to return false for some items
   - Verify filtered items not in results

3. Add test for search(): "applies glob filtering to search results"
   - Provide includes/excludes patterns
   - Verify filtered files not searched

4. Run coverage to confirm lines 76, 272, 596-597 covered

**Files to modify:**
- `tests/vault-tools.test.ts`

**Expected outcome:** Lines 76, 272, 596-597 covered

---

### Task 5: Add Vault-Tools Edge Case Tests

**Objective:** Cover lines 267, 325, 374, 608, 620, 650

**Steps:**
1. Add test for list(): "skips root folder in iteration"
   - Mock folder structure with root folder (path='', isRoot()=true)
   - Verify root not in results

2. Add test for list(): "normalizes aliases from string to array"
   - Mock cache.frontmatter.aliases as string instead of array
   - Verify result has aliases as array

3. Add test for getFolderMetadata(): "handles folder without mtime stat"
   - Mock folder without stat or with invalid stat
   - Verify doesn't crash, uses default mtime

4. Add test for search(): "stops searching when maxResults=1 reached"
   - Multiple files with matches
   - Verify only 1 result returned

5. Add test for search(): "adjusts snippet for long lines at end"
   - Mock line longer than snippetLength ending with match
   - Verify snippet adjustment logic (line 650)

6. Run coverage to confirm lines 267, 325, 374, 608, 620, 650 covered

**Files to modify:**
- `tests/vault-tools.test.ts`

**Expected outcome:** Lines 267, 325, 374, 608, 620, 650 covered

---

### Task 6: Add Vault-Tools Defensive Code Coverage

**Objective:** Cover lines 200, 452-456, 524-528, 777

**Steps:**
1. Analyze if lines 200, 452-456, 524-528 are truly unreachable
   - If unreachable: Document why (defensive code)
   - If reachable: Add tests to trigger them

2. Add test for search(): "handles file read errors gracefully"
   - Mock vault.read to throw error
   - Verify error caught, logged to console, search continues
   - Covers line 777

3. For defensive returns (452-456, 524-528):
   - Attempt to trigger "path doesn't exist" cases
   - If impossible: Document as unreachable defensive code

4. Run coverage to verify maximum possible coverage

**Files to modify:**
- `tests/vault-tools.test.ts`
- Possibly: add comments in source code marking defensive code

**Expected outcome:** Lines covered or documented as unreachable

---

### Task 7: Verify 100% Coverage

**Objective:** Confirm 100% coverage achieved

**Steps:**
1. Run `npm run test:coverage`
2. Check coverage report:
   - note-tools.ts: 100% or documented gaps
   - vault-tools.ts: 100% or documented gaps
3. If any gaps remain:
   - Identify what's uncovered
   - Add tests or document as unreachable
4. Final coverage verification

**Expected outcome:** Both tools at 100% coverage

---

### Task 8: Run Full Test Suite and Build

**Objective:** Verify no regressions

**Steps:**
1. Run `npm test` - all tests must pass
2. Run `npm run build` - must succeed
3. Verify total test count increased
4. Document final metrics

**Expected outcome:** All tests passing, build successful

---

### Task 9: Create Summary and Merge

**Objective:** Document and integrate work

**Steps:**
1. Update IMPLEMENTATION_SUMMARY.md with:
   - Coverage improvements (before/after)
   - Test counts
   - Any unreachable code documented
2. Use finishing-a-development-branch skill
3. Merge to master

**Expected outcome:** Work merged, documentation updated

## Success Criteria

- [x] note-tools.ts at 100% statement coverage
- [x] vault-tools.ts at 100% statement coverage
- [x] All tests passing
- [x] Build succeeds
- [x] Any unreachable code documented
- [x] Work merged to master

## Risk Mitigation

**If some lines are truly unreachable:**
- Document with inline comments explaining why
- Accept 99.x% if justified
- Focus on getting all reachable code to 100%

**If tests become too complex:**
- Consider minor refactoring for testability
- Use subagent review to validate approach
- Ensure tests remain maintainable

## Estimated Effort

- Note-tools tests: ~1 hour (7 new test cases)
- Vault-tools tests: ~1.5 hours (10-12 new test cases)
- Verification and cleanup: ~0.5 hours
- **Total: ~3 hours**
