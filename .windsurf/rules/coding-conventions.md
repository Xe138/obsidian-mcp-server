---
trigger: always_on
description: TypeScript coding conventions and best practices
---

# Coding Conventions

## TypeScript Standards

- Use TypeScript with `"strict": true` preferred
- Bundle everything into `main.js` (no unbundled runtime deps)
- Prefer `async/await` over promise chains
- Handle errors gracefully

## Code Organization

- **Keep `main.ts` minimal** - Focus only on plugin lifecycle (onload, onunload, addCommand calls)
- **Delegate all feature logic to separate modules**
- **Split large files** - If any file exceeds ~200-300 lines, break it into smaller, focused modules
- **Use clear module boundaries** - Each file should have a single, well-defined responsibility

## Platform Compatibility

- Avoid Node/Electron APIs if you want mobile compatibility
- Set `isDesktopOnly` accordingly if using desktop-only features
- Test on iOS and Android where feasible
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`

## Performance

- Keep startup light - defer heavy work until needed
- Avoid long-running tasks during `onload` - use lazy initialization
- Batch disk access and avoid excessive vault scans
- Debounce/throttle expensive operations in response to file system events
- Avoid large in-memory structures on mobile - be mindful of memory and storage constraints