---
trigger: always_on
description: Obsidian plugin project structure and requirements
---

# Project Overview

- **Target**: Obsidian Community Plugin (TypeScript → bundled JavaScript)
- **Entry point**: `main.ts` compiled to `main.js` and loaded by Obsidian
- **Required release artifacts**: `main.js`, `manifest.json`, and optional `styles.css`

## Key Requirements

- All TypeScript code must be bundled into a single `main.js` file
- Release artifacts must be placed at the top level of the plugin folder
- Never commit build artifacts (`node_modules/`, `main.js`, etc.) to version control