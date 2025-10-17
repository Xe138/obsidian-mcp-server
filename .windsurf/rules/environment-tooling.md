---
trigger: always_on
description: Development environment and tooling requirements
---

# Environment & Tooling

## Required Tools

- **Node.js**: Use current LTS (Node 18+ recommended)
- **Package manager**: npm (required for this sample - `package.json` defines npm scripts and dependencies)
- **Bundler**: esbuild (required for this sample - `esbuild.config.mjs` and build scripts depend on it)
- **Types**: `obsidian` type definitions

**Note**: This sample project has specific technical dependencies on npm and esbuild. If creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly. Alternative bundlers like Rollup or webpack are acceptable if they bundle all external dependencies into `main.js`.

## Common Commands

### Install dependencies
```bash
npm install
```

### Development (watch mode)
```bash
npm run dev
```

### Production build
```bash
npm run build
```

## Linting

- Install eslint: `npm install -g eslint`
- Analyze project: `eslint main.ts`
- Analyze folder: `eslint ./src/`