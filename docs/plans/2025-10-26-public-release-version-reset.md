# Public Release Version Reset to 1.0.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reset version to 1.0.0 in preparation for public release while preserving git history

**Architecture:** Update version identifiers in manifest.json, package.json, and versions.json to mark 1.0.0 as the target for public release. The existing git history (95 commits) will be preserved to demonstrate development quality and maintain context for future contributors. Previous development versions (1.0.0-3.0.0) become private development history. Git tagging will be done separately when development is complete and ready for actual release.

**Tech Stack:** Node.js version-bump.mjs script, JSON files, git

---

## Context

Current state:
- Version: 3.0.0 (in manifest.json, package.json)
- versions.json contains: 1.0.0, 1.1.0, 1.2.0, 2.0.0, 2.1.0, 3.0.0 (all mapped to minAppVersion 0.15.0)
- 95 commits in git history with no sensitive data
- Clean commit history with conventional commit format
- CHANGELOG.md contains extensive development history (versions 1.0.0 through 9.0.0)

Decision: Keep git history (demonstrates quality, security-conscious development, comprehensive testing) and reset version to 1.0.0 in preparation for public release.

**Important:** Development is ongoing. This plan resets the version number but does NOT create a git tag. The tag will be created separately when development is complete and the plugin is ready for actual public release.

---

## Task 1: Update manifest.json Version

**Files:**
- Modify: `manifest.json:4`

**Step 1: Read current manifest.json**

Verify current version before modifying.

Run: `cat manifest.json`
Expected: Shows `"version": "3.0.0"`

**Step 2: Update version to 1.0.0**

Change version field from "3.0.0" to "1.0.0".

```json
{
	"id": "obsidian-mcp-server",
	"name": "MCP Server",
	"version": "1.0.0",
	"minAppVersion": "0.15.0",
	"description": "Exposes Obsidian vault operations via Model Context Protocol (MCP) over HTTP",
	"author": "Bill Ballou",
	"isDesktopOnly": true
}
```

**Step 3: Verify the change**

Run: `cat manifest.json | grep version`
Expected: Shows `"version": "1.0.0"` and `"minAppVersion": "0.15.0"`

---

## Task 2: Update package.json Version

**Files:**
- Modify: `package.json:3`

**Step 1: Read current package.json**

Verify current version before modifying.

Run: `cat package.json | head -5`
Expected: Shows `"version": "3.0.0"`

**Step 2: Update version to 1.0.0**

Change version field from "3.0.0" to "1.0.0".

```json
{
	"name": "obsidian-mcp-server",
	"version": "1.0.0",
	"description": "MCP (Model Context Protocol) server plugin for Obsidian - exposes vault operations via HTTP",
```

**Step 3: Verify the change**

Run: `cat package.json | grep '"version"'`
Expected: Shows `"version": "1.0.0"`

---

## Task 3: Reset versions.json

**Files:**
- Modify: `versions.json` (entire file)

**Step 1: Read current versions.json**

Verify current content before modifying.

Run: `cat versions.json`
Expected: Shows entries for 1.0.0 through 3.0.0

**Step 2: Replace with single 1.0.0 entry**

Clear all development version history, keep only 1.0.0 as first public release.

```json
{
	"1.0.0": "0.15.0"
}
```

**Step 3: Verify the change**

Run: `cat versions.json`
Expected: Shows only one entry: `"1.0.0": "0.15.0"`

---

## Task 4: Update CHANGELOG.md for Public Release

**Files:**
- Modify: `CHANGELOG.md:1-1366`

**Step 1: Read current CHANGELOG structure**

Run: `head -50 CHANGELOG.md`
Expected: Shows "# Changelog" header and extensive version history

**Step 2: Create new public-release CHANGELOG**

Replace entire file with simplified version for public release. Remove private development version entries (1.0.0-9.0.0), keep only new 1.0.0 public release entry.

```markdown
# Changelog

All notable changes to the Obsidian MCP Server plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-10-26

### 🎉 Initial Public Release

The Obsidian MCP Server plugin is now publicly available! This plugin exposes your Obsidian vault via the Model Context Protocol (MCP) over HTTP, enabling AI assistants and other MCP clients to interact with your vault programmatically.

#### Core Features

**MCP Server**
- HTTP server implementing MCP protocol version 2024-11-05
- JSON-RPC 2.0 message handling
- Localhost-only binding (127.0.0.1) for security
- Configurable port (default: 3000)
- Auto-start option

**Note Operations**
- `read_note` - Read note content with optional frontmatter parsing
- `create_note` - Create notes with conflict handling (error/overwrite/rename)
- `update_note` - Update existing notes with concurrency control
- `delete_note` - Delete notes (soft delete to .trash or permanent)
- `update_frontmatter` - Update frontmatter fields without modifying content
- `update_sections` - Update specific sections by line range
- `rename_file` - Rename or move files with automatic wikilink updates
- `read_excalidraw` - Read Excalidraw drawing files with metadata

**Vault Operations**
- `search` - Advanced search with regex, glob filtering, and snippets
- `search_waypoints` - Find Waypoint plugin markers
- `list` - List files/directories with filtering and pagination
- `stat` - Get detailed file/folder metadata
- `exists` - Quick existence check
- `get_vault_info` - Vault metadata and statistics

**Waypoint Integration**
- `get_folder_waypoint` - Extract Waypoint blocks from folder notes
- `is_folder_note` - Detect folder notes
- Automatic waypoint edit protection

**Link Management**
- `validate_wikilinks` - Validate all links in a note
- `resolve_wikilink` - Resolve single wikilink to target path
- `backlinks` - Get backlinks with optional unlinked mentions

**Security**
- Mandatory Bearer token authentication
- Auto-generated, cryptographically secure API keys (32 characters)
- API keys encrypted using system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Host header validation (DNS rebinding protection)
- CORS policy fixed to localhost-only origins
- Desktop-only (requires Node.js HTTP server)

**User Interface**
- Settings panel with full configuration
- Status bar indicator showing server state
- Ribbon icon for quick server toggle
- Start/Stop/Restart commands
- Real-time connection information
- Copy API key and configuration snippets
- Notification system for tool calls (optional)
- Notification history viewer

**Developer Experience**
- Cross-platform path handling (Windows/macOS/Linux)
- Comprehensive error messages with troubleshooting tips
- Path validation and normalization utilities
- Concurrency control via ETag-based versioning
- Type-safe TypeScript implementation
- Extensive test coverage
- Well-documented codebase

#### Technical Details

**Dependencies**
- express: ^4.18.2
- cors: ^2.8.5
- obsidian: latest

**Build**
- TypeScript 4.7.4
- esbuild 0.17.3
- Jest 30.2.0 for testing

**Compatibility**
- Obsidian minimum version: 0.15.0
- Desktop only (not available on mobile)
- Protocol: MCP 2024-11-05

#### Known Limitations

- Desktop only (requires Node.js HTTP server)
- Single vault per server instance
- HTTP only (no WebSocket support)
- Localhost-only (no SSL/TLS)
- Excalidraw support limited to uncompressed format (compressed format planned)

---

## Future Roadmap

### Planned Features

**Resources API**
- Expose notes as MCP resources
- Real-time resource updates

**Prompts API**
- Templated prompts for common operations
- Custom prompt registration

**Batch Operations**
- Multiple operations in single request
- Transactional batching

**WebSocket Transport**
- Real-time updates and notifications
- Bidirectional communication

**Enhanced Graph API**
- Graph visualization data
- Advanced graph traversal

**Tag & Canvas APIs**
- Query and manage tags
- Manipulate canvas files

**Dataview Integration**
- Query vault using Dataview syntax
- Advanced data queries

**Performance Enhancements**
- Indexing for faster searches
- Caching for frequently accessed notes
- Streaming for large files

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Report bugs and request features]
- Documentation: See README.md and CLAUDE.md
- Include version number (1.0.0) in bug reports

---

## Credits

- MCP Protocol: https://modelcontextprotocol.io
- Obsidian API: https://github.com/obsidianmd/obsidian-api
- Built with TypeScript, Express.js, and dedication to quality
```

**Step 3: Verify the change**

Run: `wc -l CHANGELOG.md && head -20 CHANGELOG.md`
Expected: Shows much shorter file (~200 lines vs 1400+), starts with "# Changelog" and "## [1.0.0] - 2025-10-26"

---

## Task 5: Verify All Version Changes

**Files:**
- Read: `manifest.json`, `package.json`, `versions.json`

**Step 1: Check all version files**

Run: `echo "=== manifest.json ===" && cat manifest.json | grep version && echo "=== package.json ===" && cat package.json | grep version && echo "=== versions.json ===" && cat versions.json`

Expected output:
```
=== manifest.json ===
	"version": "1.0.0",
	"minAppVersion": "0.15.0",
=== package.json ===
	"version": "1.0.0",
	"version": "node version-bump.mjs && git add manifest.json versions.json"
=== versions.json ===
{
	"1.0.0": "0.15.0"
}
```

**Step 2: Verify version-bump.mjs script compatibility**

The version-bump.mjs script (used by `npm version`) reads from package.json and updates manifest.json and versions.json. With all files now at 1.0.0, future version bumps will work correctly.

Run: `cat version-bump.mjs`
Expected: Script reads `npm_package_version`, updates manifest.json version, and conditionally updates versions.json

**Step 3: Test build**

Ensure the plugin still builds correctly after version changes.

Run: `npm run build`
Expected: TypeScript compiles successfully, esbuild creates main.js, no errors

---

## Task 6: Commit Version Reset

**Files:**
- Modify: `manifest.json`, `package.json`, `versions.json`, `CHANGELOG.md`

**Step 1: Review changes to commit**

Run: `git status`
Expected: Shows modified files: manifest.json, package.json, versions.json, CHANGELOG.md

**Step 2: Review diff**

Run: `git diff manifest.json package.json versions.json`
Expected: Shows version changes from 3.0.0 to 1.0.0, versions.json reduced to single entry

**Step 3: Stage all changes**

Run: `git add manifest.json package.json versions.json CHANGELOG.md`

**Step 4: Create commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
chore: reset version to 1.0.0 for initial public release

This marks version 1.0.0 as the first public release of the plugin.
Previous versions (1.0.0-3.0.0) were private development iterations.

Changes:
- Reset manifest.json version to 1.0.0
- Reset package.json version to 1.0.0
- Clear versions.json to single entry (1.0.0 -> 0.15.0)
- Rewrite CHANGELOG.md for public release
  - Remove private development history
  - Document all features as part of 1.0.0
  - Add future roadmap section

Git history is preserved to demonstrate:
- Development quality and security practices
- Comprehensive test coverage efforts
- Thoughtful evolution of features

This plugin implements MCP (Model Context Protocol) to expose
Obsidian vault operations via HTTP for AI assistants and other clients.
EOF
)"
```

**Step 5: Verify commit**

Run: `git log -1 --stat`
Expected: Shows commit with 4 files changed, commit message explains version reset

**Step 6: Verify git history is preserved**

Run: `git log --oneline | wc -l`
Expected: Shows 96 commits (95 previous + 1 new commit)

---

## Task 7: Document Version Reset Decision

**Files:**
- Create: `docs/VERSION_HISTORY.md`

**Step 1: Create version history documentation**

Document why version was reset and what happened to previous versions.

```markdown
# Version History

## Public Release Version Strategy

### Initial Public Release: 1.0.0 (2025-10-26)

This plugin's first public release is marked as **version 1.0.0**.

### Development History

Prior to public release, the plugin went through private development with internal versions 1.0.0 through 3.0.0. These versions were used during development and testing but were never publicly released.

When preparing for public release, we reset the version to 1.0.0 to clearly mark this as the first public version available to users.

### Why Reset to 1.0.0?

**Semantic Versioning**: Version 1.0.0 signals the first stable, public release of the plugin. It indicates:
- The API is stable and ready for public use
- All core features are implemented and tested
- The plugin is production-ready

**User Clarity**: Starting at 1.0.0 for the public release avoids confusion:
- Users don't wonder "what happened to versions 1-2?"
- Version number accurately reflects the public release history
- Clear signal that this is the first version they can install

**Git History Preserved**: The development history (95 commits) is preserved to:
- Demonstrate development quality and security practices
- Show comprehensive testing and iterative refinement
- Provide context for future contributors
- Maintain git blame and bisect capabilities

### Version Numbering Going Forward

From 1.0.0 onward, the plugin follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.x.x): Incompatible API changes or breaking changes
- **MINOR** version (x.1.x): New functionality in a backward-compatible manner
- **PATCH** version (x.x.1): Backward-compatible bug fixes

### Development Version Mapping

For reference, here's what the private development versions contained:

| Dev Version | Key Features Added |
|-------------|-------------------|
| 1.0.0 | Initial MCP server, basic CRUD tools |
| 1.1.0 | Path normalization, error handling |
| 1.2.0 | Enhanced authentication, parent folder detection |
| 2.0.0 | API unification, typed results |
| 2.1.0 | Discovery endpoints (stat, exists) |
| 3.0.0 | Enhanced list operations |

All these features are included in the public 1.0.0 release.

### Commit History

The git repository contains the complete development history showing the evolution from initial implementation through all features. This history demonstrates:

- Security-conscious development (API key encryption, authentication)
- Comprehensive test coverage (100% coverage goals)
- Careful refactoring and improvements
- Documentation and planning
- Bug fixes and edge case handling

No sensitive data exists in the git history (verified via audit).

---

## Future Versioning

**Next versions** will be numbered according to the changes made:

- **1.0.1**: Bug fixes and patches
- **1.1.0**: New features (e.g., Resources API, Prompts API)
- **2.0.0**: Breaking changes to tool schemas or behavior

The CHANGELOG.md will document all public releases starting from 1.0.0.
```

**Step 2: Verify file was created**

Run: `cat docs/VERSION_HISTORY.md | head -30`
Expected: Shows version history explanation

**Step 3: Commit version history documentation**

Run:
```bash
git add docs/VERSION_HISTORY.md
git commit -m "docs: add version history explanation for 1.0.0 reset"
```

---

## Task 8: Final Verification

**Files:**
- Read: All modified files

**Step 1: Verify all version references**

Check that no stray version references remain.

Run: `grep -r "3\.0\.0" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v ".git"`
Expected: No results (all 3.0.0 references should be gone from project files)

**Step 2: Verify package.json npm version script**

The `npm version` command should work correctly for future version bumps.

Run: `cat package.json | grep '"version"'`
Expected: Shows `"version": "1.0.0"` and version script with version-bump.mjs

**Step 3: Verify build output**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds, no errors

**Step 4: Check git status**

Run: `git status`
Expected: Working tree clean, no uncommitted changes

**Step 5: Verify commit history**

Run: `git log --oneline -5`
Expected: Shows recent commits including version reset and documentation

**Step 6: Final summary**

Run:
```bash
echo "=== Version Files ===" && \
cat manifest.json | grep version && \
cat package.json | grep '"version"' && \
cat versions.json && \
echo "=== Git Info ===" && \
git log --oneline | wc -l && \
echo "=== Build Status ===" && \
ls -lh main.js
```

Expected:
- All versions show 1.0.0
- versions.json has single entry
- Git shows 96+ commits
- main.js exists and is recent

---

## Completion Checklist

- [ ] manifest.json version is 1.0.0
- [ ] package.json version is 1.0.0
- [ ] versions.json contains only {"1.0.0": "0.15.0"}
- [ ] CHANGELOG.md rewritten for public release
- [ ] All changes committed with descriptive message
- [ ] Git history preserved (95+ commits)
- [ ] VERSION_HISTORY.md documents the reset decision
- [ ] No stray 3.0.0 references remain
- [ ] Build succeeds (main.js created)
- [ ] Working tree is clean

**Note:** Git tag creation (1.0.0) is NOT part of this plan. The tag will be created later when development is complete and the plugin is ready for actual public release.

## Post-Implementation Notes

After completing this plan, the version numbers are reset to 1.0.0 in preparation for public release:

**Current State After Plan:**
- Version files (manifest.json, package.json, versions.json) all show 1.0.0
- CHANGELOG.md rewritten for public consumption
- VERSION_HISTORY.md documents the version reset decision
- Git history preserved with all development commits
- No git tag created yet (tag will be created when ready for actual release)

**When Ready for Actual Public Release:**

1. **Final Development**: Complete any remaining development work and commit changes

2. **Create Git Tag**: Create the 1.0.0 annotated tag:
   ```bash
   git tag -a 1.0.0 -m "Release 1.0.0 - Initial Public Release"
   ```

3. **GitHub Release**: Create a GitHub release from the 1.0.0 tag with:
   - Release title: "v1.0.0 - Initial Public Release"
   - Release notes: Use CHANGELOG.md content for 1.0.0
   - Attach files: manifest.json, main.js, styles.css

4. **Obsidian Plugin Directory**: Submit to Obsidian's community plugins with:
   - Plugin ID: obsidian-mcp-server
   - Version: 1.0.0
   - Links to GitHub repository and release

5. **Future Versions**: Use `npm version [major|minor|patch]` which will:
   - Update package.json version
   - Run version-bump.mjs to update manifest.json and versions.json
   - Create git commit and tag automatically
   - Then push tag to trigger release workflow

The git history demonstrates the quality and care taken during development, while the clean version numbering provides clarity for public users.
