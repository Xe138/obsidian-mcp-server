# GitHub Release Workflow Design

**Date**: 2025-10-26
**Status**: Approved
**Author**: William Ballou with Claude Code

## Overview

This document describes the design for an automated GitHub Actions workflow that builds and releases the Obsidian MCP Server plugin when version tags are pushed to the repository.

## Requirements

### Functional Requirements
- Trigger on semantic version tags (e.g., `1.0.0`, `1.2.3`)
- Validate version consistency across `package.json`, `manifest.json`, and git tag
- Run test suite and fail if tests don't pass
- Build plugin using production build process
- Create draft GitHub release with required Obsidian plugin files
- Allow manual review and release note writing before publishing

### Non-Functional Requirements
- Simple, single-job architecture for easy debugging
- Clear error messages when validation or tests fail
- Deterministic builds using `npm ci`
- Fast execution using GitHub Actions caching

## Design Decisions

### Automation Level: Semi-Automated
The workflow creates a **draft release** rather than auto-publishing. This provides:
- Safety: Manual review before users can download
- Quality: Time to write detailed release notes
- Flexibility: Can delete and re-run if issues found
- Control: Verify attached files are correct

### Test Policy: Block on Failure
Tests must pass for release to proceed. This prevents:
- Releasing broken code
- Regressions reaching users
- Build-time type errors in production

Trade-off: Urgent hotfixes require fixing or temporarily skipping failing tests.

### Version Validation: Required
Workflow validates that version numbers match across:
- Git tag (e.g., `1.2.3`)
- `package.json` version field
- `manifest.json` version field

This catches common mistakes and ensures consistency required by Obsidian plugin spec.

### Architecture: Single Job
All steps run sequentially in one job:
1. Checkout code
2. Validate versions
3. Setup Node.js and dependencies
4. Run tests
5. Build plugin
6. Create draft release

**Rationale**: Simpler than multi-job approach, easier to debug, acceptable runtime (~3-5 minutes).

## Workflow Architecture

### Trigger Pattern
```yaml
on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+"
```

Matches semantic version tags without `v` prefix (per CLAUDE.md requirement).

### Step 1: Version Validation

**Purpose**: Ensure tag, package.json, and manifest.json versions all match.

**Implementation**:
```bash
TAG_VERSION="${GITHUB_REF#refs/tags/}"
PKG_VERSION=$(node -p "require('./package.json').version")
MANIFEST_VERSION=$(node -p "require('./manifest.json').version")

if [ "$TAG_VERSION" != "$PKG_VERSION" ] || [ "$TAG_VERSION" != "$MANIFEST_VERSION" ]; then
  echo "❌ Version mismatch detected!"
  echo "Git tag: $TAG_VERSION"
  echo "package.json: $PKG_VERSION"
  echo "manifest.json: $MANIFEST_VERSION"
  exit 1
fi
```

**Error cases**:
- Forgot to run `npm version` before tagging
- Manually edited version in one file but not others
- Typo in git tag name

### Step 2: Dependency Setup

**Node.js version**: 18.x (LTS)

**Installation**: Use `npm ci` for:
- Deterministic builds from package-lock.json
- Faster than `npm install`
- Catches lock file inconsistencies

**Caching**: GitHub Actions built-in npm cache:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'
```

### Step 3: Test Execution

**Command**: `npm test`

**Behavior**:
- Runs Jest test suite
- Workflow fails if any test fails
- Test output appears in Actions logs
- No coverage report (development tool, not needed for releases)

**Error handling**:
- Test failures → workflow stops, no release created
- Clear error logs for debugging

### Step 4: Build Process

**Command**: `npm run build`

**What it does**:
1. Type checking: `tsc -noEmit -skipLibCheck`
2. Bundling: `node esbuild.config.mjs production`
3. Output: `main.js` in repository root

**Validation**: After build, verify these files exist:
- `main.js` (build artifact)
- `manifest.json` (repo file)
- `styles.css` (repo file)

If any missing → workflow fails.

### Step 5: Draft Release Creation

**Tool**: GitHub CLI (`gh release create`)

**Command**:
```bash
gh release create "$TAG_VERSION" \
  --title="$TAG_VERSION" \
  --draft \
  main.js \
  manifest.json \
  styles.css
```

**Parameters**:
- Tag: Extracted from `GITHUB_REF` (e.g., `1.2.3`)
- Title: Same as tag version
- `--draft`: Creates unpublished release
- Files: Three required Obsidian plugin files

**Authentication**: Uses built-in `GITHUB_TOKEN` secret (no manual setup needed)

## Developer Workflow

### Creating a Release

**Step 1**: Update version
```bash
npm version patch  # or minor/major
```
This triggers `version-bump.mjs` which updates `manifest.json` and `versions.json`.

**Step 2**: Commit version bump
```bash
git commit -m "chore: bump version to X.Y.Z"
```

**Step 3**: Create and push tag
```bash
git tag X.Y.Z
git push && git push --tags
```

**Step 4**: Wait for GitHub Actions
- Navigate to Actions tab
- Watch workflow progress
- Check for success or errors

**Step 5**: Review draft release
- Navigate to Releases tab
- Find draft release
- Review attached files (download and verify if needed)

**Step 6**: Write release notes
- Document what's new
- Note breaking changes
- List bug fixes
- Credit contributors

**Step 7**: Publish release
- Click "Publish release" button
- Release becomes visible to users

### Handling Failures

**Version mismatch**:
- Fix version in mismatched file(s)
- Commit fix
- Delete incorrect tag: `git tag -d X.Y.Z && git push origin :refs/tags/X.Y.Z`
- Recreate tag and push

**Test failures**:
- Fix failing tests locally
- Commit fixes
- Delete tag and recreate (or create new patch version)

**Build failures**:
- Check workflow logs for error
- Fix build issue locally
- Verify `npm run build` succeeds
- Delete tag and recreate (or create new patch version)

**Release creation failures**:
- Check if release already exists for tag
- Delete existing release if needed
- Re-run workflow or manually trigger

## File Locations

- Workflow file: `.github/workflows/release.yml`
- Build output: `main.js` (root directory)
- Required assets: `manifest.json`, `styles.css` (root directory)

## Error Handling

### Version Validation Errors
**Detection**: Before any build steps
**Message**: Clear output showing all three versions
**Resolution**: Fix mismatched files, delete/recreate tag

### Test Failures
**Detection**: After dependencies installed
**Message**: Jest output showing which tests failed
**Resolution**: Fix tests, commit, delete/recreate tag

### Build Failures
**Detection**: During build step
**Message**: TypeScript or esbuild errors
**Resolution**: Fix build errors locally, verify, delete/recreate tag

### Missing Files
**Detection**: After build completes
**Message**: Which required file is missing
**Resolution**: Investigate why file wasn't created, fix, retry

### Release Creation Failures
**Detection**: During gh CLI command
**Message**: GitHub API error (e.g., release already exists)
**Resolution**: Delete existing release or use different tag

## Future Enhancements

### Not Included in Initial Design
- Automated release notes generation (manual preferred for quality)
- Slack/Discord notifications on release
- Automatic changelog updates
- Release to Obsidian community plugin registry (separate process)
- Build artifact signing/verification

These can be added later if needed.

## Success Criteria

The workflow is successful if:
1. ✅ Triggers only on semantic version tags
2. ✅ Catches version mismatches before building
3. ✅ Prevents releases with failing tests
4. ✅ Produces correct build artifacts
5. ✅ Creates draft releases with all required files
6. ✅ Provides clear error messages on failures
7. ✅ Completes in under 5 minutes for typical builds

## References

- Obsidian plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- GitHub Actions docs: https://docs.github.com/en/actions
- Semantic Versioning: https://semver.org/
- Project CLAUDE.md: Requirements and constraints
