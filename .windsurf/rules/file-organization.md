---
trigger: always_on
description: File and folder organization conventions
---

# File & Folder Organization

## Core Principles

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls)
- **Split large files**: If any file exceeds ~200-300 lines, break it into smaller, focused modules
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility

## Recommended Structure

```
src/
  main.ts           # Plugin entry point, lifecycle management only
  settings.ts       # Settings interface and defaults
  commands/         # Command implementations
    command1.ts
    command2.ts
  ui/              # UI components, modals, views
    modal.ts
    view.ts
  utils/           # Utility functions, helpers
    helpers.ts
    constants.ts
  types.ts         # TypeScript interfaces and types
```

## Best Practices

- Source lives in `src/`
- Keep the plugin small - avoid large dependencies
- Prefer browser-compatible packages
- Generated output should be placed at the plugin root or `dist/` depending on build setup
- Release artifacts must end up at the top level of the plugin folder (`main.js`, `manifest.json`, `styles.css`)