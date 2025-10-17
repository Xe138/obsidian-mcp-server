---
trigger: always_on
description: Versioning and release process
---

# Versioning & Releases

## Version Management

- Bump `version` in `manifest.json` using Semantic Versioning (SemVer)
- Update `versions.json` to map plugin version → minimum app version
- Keep version numbers consistent across all release artifacts

## Release Process

1. **Create GitHub release** with tag that exactly matches `manifest.json`'s `version`
   - **Do not use a leading `v`** in the tag
2. **Attach required assets** to the release:
   - `manifest.json`
   - `main.js`
   - `styles.css` (if present)
3. After initial release, follow the process to add/update your plugin in the community catalog

## Testing Before Release

Manual install for testing:
1. Copy `main.js`, `manifest.json`, `styles.css` (if any) to:
   ```
   <Vault>/.obsidian/plugins/<plugin-id>/
   ```
2. Reload Obsidian
3. Enable the plugin in **Settings → Community plugins**