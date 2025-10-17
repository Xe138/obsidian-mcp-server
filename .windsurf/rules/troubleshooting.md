---
trigger: always_on
description: Common issues and solutions
---

# Troubleshooting

## Plugin Doesn't Load After Build

**Issue**: Plugin doesn't appear in Obsidian after building

**Solution**: Ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`

## Build Issues

**Issue**: `main.js` is missing after build

**Solution**: Run `npm run build` or `npm run dev` to compile your TypeScript source code

## Commands Not Appearing

**Issue**: Commands don't show up in command palette

**Solution**: 
- Verify `addCommand` runs after `onload`
- Ensure command IDs are unique
- Check that commands are properly registered

## Settings Not Persisting

**Issue**: Settings reset after reloading Obsidian

**Solution**:
- Ensure `loadData`/`saveData` are awaited
- Re-render the UI after changes
- Verify settings are properly merged with defaults

## Mobile-Only Issues

**Issue**: Plugin works on desktop but not mobile

**Solution**:
- Confirm you're not using desktop-only APIs
- Check `isDesktopOnly` setting in manifest
- Test on actual mobile devices or adjust compatibility