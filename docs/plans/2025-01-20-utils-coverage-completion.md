# Implementation Plan: 100% Utils Coverage

**Date:** 2025-01-20
**Goal:** Achieve 100% test coverage on all utils modules
**Approach:** Remove dead code + Add targeted test cases

## Overview

This plan addresses the remaining coverage gaps in the utils modules to achieve 100% statement coverage as part of pre-release validation. Unlike the tools coverage work, this combines dead code removal with targeted testing.

## Current Coverage Status

- **error-messages.ts:** 82.6% → Target: 100% (lines 182-198 uncovered)
- **version-utils.ts:** 88.88% → Target: 100% (line 52 uncovered)
- **path-utils.ts:** 98.18% → Target: 100% (line 70 uncovered)
- **frontmatter-utils.ts:** 96.55% → Target: 100% (lines 253-255, 310 uncovered)

## Gap Analysis

### Dead Code (To Remove)

1. **error-messages.ts (lines 182-198)**:
   - `permissionDenied()` - Never called anywhere in codebase
   - `formatError()` - Never called anywhere in codebase

2. **version-utils.ts (line 52)**:
   - `createVersionedResponse()` - Never called (only documented in CHANGELOG)

### Untested Code (To Test)

1. **path-utils.ts (line 70)**:
   - Windows absolute path validation: `/^[A-Za-z]:/` regex check

2. **frontmatter-utils.ts (lines 253-255)**:
   - Excalidraw parsing fallback: code fence without language specifier

3. **frontmatter-utils.ts (line 310)**:
   - Excalidraw decompression error handler

## Implementation Tasks

### Task 1: Remove Dead Code from error-messages.ts

**Objective:** Delete unused methods to improve coverage

**Steps:**
1. Delete `permissionDenied()` method (lines 178-189)
2. Delete `formatError()` method (lines 191-204)
3. Run tests to verify no broken imports
4. Run coverage to confirm improved percentage

**Files to modify:**
- `src/utils/error-messages.ts`

**Expected outcome:** error-messages.ts at 100% coverage

---

### Task 2: Remove Dead Code from version-utils.ts

**Objective:** Delete unused method to improve coverage

**Steps:**
1. Delete `createVersionedResponse()` method (lines 48-57)
2. Run tests to verify no broken imports
3. Run coverage to confirm improved percentage

**Files to modify:**
- `src/utils/version-utils.ts`

**Expected outcome:** version-utils.ts at 100% coverage

---

### Task 3: Clean Up CHANGELOG.md

**Objective:** Remove references to deleted code

**Steps:**
1. Remove `createVersionedResponse()` reference from line 282
2. Keep surrounding context intact
3. Verify file still well-formed

**Files to modify:**
- `CHANGELOG.md`

**Expected outcome:** CHANGELOG accurate to current codebase

---

### Task 4: Add path-utils Windows Absolute Path Tests

**Objective:** Cover line 70 (Windows path validation)

**Steps:**
1. Add test: "rejects Windows absolute paths (C: drive)"
   - Test `isValidVaultPath('C:\\Users\\file.md')` returns false
2. Add test: "rejects Windows absolute paths (D: drive)"
   - Test `isValidVaultPath('D:\\Documents\\note.md')` returns false
3. Run coverage to confirm line 70 covered

**Files to modify:**
- `tests/path-utils.test.ts`

**Expected outcome:** path-utils.ts at 100% coverage

---

### Task 5: Add frontmatter-utils Code Fence Fallback Test

**Objective:** Cover lines 253-255 (code fence without language specifier)

**Steps:**
1. Create Excalidraw note with ` ``` ` fence (no language)
2. Add test: "parses Excalidraw with code fence lacking language specifier"
3. Call `parseExcalidrawMetadata()` on content
4. Verify JSON parsed correctly
5. Run coverage to confirm lines 253-255 covered

**Files to modify:**
- `tests/frontmatter-utils.test.ts`

**Expected outcome:** Lines 253-255 covered

---

### Task 6: Add frontmatter-utils Decompression Failure Test

**Objective:** Cover line 310 (decompression error handler)

**Steps:**
1. Create Excalidraw note with invalid compressed data
2. Add test: "handles decompression failure gracefully"
3. Mock or create scenario where decompression throws error
4. Verify graceful fallback with `hasCompressedData: true`
5. Run coverage to confirm line 310 covered

**Files to modify:**
- `tests/frontmatter-utils.test.ts`

**Expected outcome:** frontmatter-utils.ts at 100% coverage

---

### Task 7: Verify 100% Coverage

**Objective:** Confirm 100% coverage achieved on all utils

**Steps:**
1. Run `npm run test:coverage`
2. Check coverage report:
   - error-messages.ts: 100%
   - version-utils.ts: 100%
   - path-utils.ts: 100%
   - frontmatter-utils.ts: 100%
3. If any gaps remain:
   - Identify what's uncovered
   - Add tests or document as unreachable
4. Final coverage verification

**Expected outcome:** All 4 utils at 100% coverage

---

### Task 8: Create Summary and Merge

**Objective:** Document and integrate work

**Steps:**
1. Create `UTILS_COVERAGE_SUMMARY.md` with:
   - Coverage improvements (before/after)
   - Test counts
   - Dead code removed
2. Use finishing-a-development-branch skill
3. Merge to master

**Expected outcome:** Work merged, documentation updated

## Success Criteria

- [ ] error-messages.ts at 100% statement coverage
- [ ] version-utils.ts at 100% statement coverage
- [ ] path-utils.ts at 100% statement coverage
- [ ] frontmatter-utils.ts at 100% statement coverage
- [ ] All tests passing (505+)
- [ ] Build succeeds
- [ ] Dead code removed cleanly
- [ ] Work merged to master

## Risk Mitigation

**If dead code is actually used:**
- Full test suite will catch broken imports immediately
- TypeScript compilation will fail if methods are referenced
- Git revert available if needed

**If edge case tests are too complex:**
- Document specific difficulty encountered
- Consider if code is truly reachable
- Mark with istanbul ignore if unreachable

## Estimated Effort

- Dead code removal: ~15 minutes (3 simple deletions)
- Test additions: ~20 minutes (3 test cases)
- Verification and cleanup: ~10 minutes
- **Total: ~45 minutes**
