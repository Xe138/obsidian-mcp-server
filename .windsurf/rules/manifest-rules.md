---
trigger: always_on
description: Manifest.json requirements and conventions
---

# Manifest Rules

## Required Fields

The `manifest.json` must include:

- `id` - Plugin ID; for local dev it should match the folder name
- `name` - Display name
- `version` - Semantic Versioning `x.y.z`
- `minAppVersion` - Minimum Obsidian version required
- `description` - Brief description
- `isDesktopOnly` - Boolean indicating mobile compatibility

## Optional Fields

- `author` - Plugin author name
- `authorUrl` - Author's URL
- `fundingUrl` - Funding/donation URL (string or map)

## Critical Rules

- **Never change `id` after release** - Treat it as stable API
- Keep `minAppVersion` accurate when using newer APIs
- Use Semantic Versioning for `version` field
- Canonical requirements: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml