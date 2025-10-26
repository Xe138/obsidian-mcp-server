# Contributing to Obsidian MCP Server Plugin

Thank you for your interest in contributing to the Obsidian MCP Server Plugin! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Guidelines](#code-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project is committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm
- Obsidian desktop app installed
- Basic understanding of TypeScript and Obsidian plugin development

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub:

**GitHub Issues:** https://github.com/Xe138/obsidian-mcp-server/issues

When reporting bugs, please include:
- Obsidian version
- Plugin version
- Operating system
- Steps to reproduce the issue
- Any error messages from the Developer Console (Ctrl+Shift+I / Cmd+Option+I)
- Expected behavior vs. actual behavior

For feature requests, please describe:
- The use case or problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/obsidian-mcp-server.git
   cd obsidian-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Link to your vault for testing:**

   Create a symlink from your vault's plugins folder to your development directory:

   **Linux/macOS:**
   ```bash
   ln -s /path/to/your/dev/obsidian-mcp-server /path/to/vault/.obsidian/plugins/obsidian-mcp-server
   ```

   **Windows (Command Prompt as Administrator):**
   ```cmd
   mklink /D "C:\path\to\vault\.obsidian\plugins\obsidian-mcp-server" "C:\path\to\your\dev\obsidian-mcp-server"
   ```

4. **Start development build:**
   ```bash
   npm run dev
   ```

   This runs esbuild in watch mode, automatically rebuilding when you save changes.

5. **Enable the plugin in Obsidian:**
   - Open Obsidian Settings → Community Plugins
   - Enable the plugin
   - Reload Obsidian when prompted (Ctrl/Cmd + R in dev mode)

## Development Workflow

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

   Use descriptive branch names:
   - `feature/add-tool-xyz` for new features
   - `fix/issue-123` for bug fixes
   - `docs/update-readme` for documentation
   - `refactor/cleanup-utils` for refactoring

2. **Make your changes:**
   - Write code following the [Code Guidelines](#code-guidelines)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   npm test                 # Run all tests
   npm run test:watch      # Run tests in watch mode
   npm run test:coverage   # Check coverage
   ```

4. **Build and test in Obsidian:**
   ```bash
   npm run build
   ```

   Then reload Obsidian (Ctrl/Cmd + R) to test your changes.

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add concise, descriptive commit message"
   ```

   See [Commit Message Guidelines](#commit-message-guidelines) below.

### Commit Message Guidelines

Write clear, concise commit messages that explain **why** the change was made, not just what changed:

**Good examples:**
- `fix: prevent race condition in concurrent note updates`
- `feat: add support for Excalidraw compressed format`
- `refactor: extract path validation into shared utility`
- `docs: clarify API key security in README`
- `test: add coverage for frontmatter edge cases`

**Structure:**
- Use imperative mood ("add" not "added" or "adds")
- Keep the first line under 72 characters
- Add a blank line followed by details if needed
- Reference issue numbers when applicable: `fixes #123`

**Type prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `style:` - Formatting, no code change
- `perf:` - Performance improvement
- `chore:` - Maintenance tasks

## Code Guidelines

### Code Organization Best Practices

- **Keep `main.ts` minimal** - Focus only on plugin lifecycle (onload, onunload, command registration)
- **Delegate feature logic to separate modules** - All functionality lives in dedicated modules under `src/`
- **Split large files** - If any file exceeds ~200-300 lines, break it into smaller, focused modules
- **Use clear module boundaries** - Each file should have a single, well-defined responsibility

### TypeScript Guidelines

- **Use TypeScript strict mode** - The project uses `"strict": true`
- **Provide explicit types** - Avoid `any`; use proper types or `unknown`
- **Prefer interfaces over type aliases** for object shapes
- **Use readonly** where appropriate to prevent mutations
- **Export types** from `src/types/` for shared definitions

### Style Guidelines

- **Use sentence case** for UI strings, headings, and button text
- **Use arrow notation** for navigation paths: "Settings → Community plugins"
- **Prefer "select"** over "click" in documentation
- **Use 4 spaces** for indentation (not tabs)
- **Keep lines under 100 characters** where reasonable
- **Use single quotes** for strings (unless templating)
- **Add trailing commas** in multiline arrays/objects

### Architecture Patterns

- **Prefer async/await** over promise chains
- **Handle errors gracefully** - Provide helpful error messages via ErrorMessages utility
- **Use dependency injection** - Pass dependencies (vault, app) to constructors
- **Avoid global state** - Encapsulate state within classes
- **Keep functions small** - Each function should do one thing well

### Performance Considerations

- **Keep startup light** - Defer heavy work until needed; avoid long-running tasks during `onload`
- **Batch disk access** - Avoid excessive vault scans
- **Debounce/throttle expensive operations** - Especially for file system event handlers
- **Cache when appropriate** - But invalidate caches correctly

### Security Guidelines

- **Default to local/offline operation** - This plugin binds to localhost only
- **Never execute remote code** - Don't fetch and eval scripts
- **Minimize scope** - Read/write only what's necessary inside the vault
- **Do not access files outside the vault**
- **Respect user privacy** - Don't collect vault contents without explicit consent
- **Clean up resources** - Use `this.register*` helpers so the plugin unloads safely

### Platform Compatibility

This plugin is **desktop-only** (`isDesktopOnly: true`) because it uses Node.js HTTP server (Express). When extending functionality:
- Avoid mobile-incompatible APIs
- Don't assume desktop-only file system behavior
- Consider graceful degradation where applicable

## Testing Guidelines

### Writing Tests

- **Write tests for new features** - All new functionality should include tests
- **Write tests for bug fixes** - Add a regression test that would have caught the bug
- **Test edge cases** - Empty strings, null values, missing files, concurrent operations
- **Use descriptive test names** - Explain what's being tested and expected behavior

### Test Structure

Tests are located in `tests/` and use Jest with ts-jest:

```typescript
describe('ToolName', () => {
  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange - Set up test data and mocks
      const input = 'test-input';

      // Act - Execute the code under test
      const result = await someFunction(input);

      // Assert - Verify the results
      expect(result).toBe('expected-output');
    });
  });
});
```

### Running Tests

```bash
npm test                 # Run all tests once
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report
```

### Mock Guidelines

- Use the existing Obsidian API mocks in `tests/__mocks__/obsidian.ts`
- Add new mocks when needed, keeping them minimal and focused
- Reset mocks between tests to avoid test pollution

## Submitting Changes

### Pull Request Process

1. **Ensure your code builds and tests pass:**
   ```bash
   npm run build
   npm test
   ```

2. **Update documentation:**
   - Update `README.md` if you've changed functionality or added features
   - Update `CLAUDE.md` if you've changed architecture or development guidelines
   - Add/update JSDoc comments for public APIs

3. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request on GitHub:**
   - Provide a clear title and description
   - Reference related issues (e.g., "Fixes #123")
   - Explain what changed and why
   - List any breaking changes
   - Include screenshots for UI changes

5. **Respond to review feedback:**
   - Address reviewer comments
   - Push additional commits to the same branch
   - Mark conversations as resolved when addressed

### Pull Request Checklist

Before submitting, ensure:
- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New functionality includes tests
- [ ] Documentation is updated
- [ ] Code follows style guidelines
- [ ] Commit messages are clear and descriptive
- [ ] No build artifacts committed (`main.js`, `node_modules/`)
- [ ] Branch is up to date with `master`

## Release Process

**Note:** Releases are managed by the maintainers. This section is for reference.

### Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Automated Release Workflow

This project uses GitHub Actions to automate releases. The workflow is triggered when a semantic version tag is pushed.

**Location:** `.github/workflows/release.yml`

**Workflow process:**
1. Validates version consistency across `package.json`, `manifest.json`, and git tag
2. Runs full test suite (blocks release if tests fail)
3. Builds plugin with production config (`npm run build`)
4. Verifies build artifacts (`main.js`, `manifest.json`, `styles.css`)
5. Creates draft GitHub release with artifacts attached

### Release Steps for Maintainers

1. **Update version numbers:**
   ```bash
   npm version [major|minor|patch]
   ```

   This automatically updates `package.json`, `manifest.json`, and `versions.json` via the `version-bump.mjs` script.

2. **Update CHANGELOG.md** with release notes

3. **Commit and tag:**
   ```bash
   git commit -m "chore: bump version to X.Y.Z"
   git tag X.Y.Z
   git push origin master --tags
   ```

   **Important:** Tags must match the format `X.Y.Z` (e.g., `1.2.3`) without a `v` prefix.

4. **GitHub Actions creates draft release:**
   - The workflow automatically builds and creates a draft release
   - Wait for the workflow to complete (check Actions tab)

5. **Publish the release:**
   - Go to GitHub Releases
   - Review the draft release
   - Verify attached files (`main.js`, `manifest.json`, `styles.css`)
   - Replace the placeholder release notes with actual notes from CHANGELOG
   - Publish the release

### Stability Guidelines

- **Never change the plugin `id`** after release
- **Never rename command IDs** after release - they are stable API
- **Deprecate before removing** - Give users time to migrate
- **Document breaking changes** clearly in CHANGELOG
- **Tags must be semantic version format** - `X.Y.Z` without `v` prefix
- **All versions must match** - `package.json`, `manifest.json`, and git tag must have identical versions

## Getting Help

If you need help or have questions:

- **Documentation:** Check `CLAUDE.md` for detailed architecture information
- **Issues:** Search existing issues or open a new one
- **Discussions:** Start a discussion on GitHub for questions or ideas

## Recognition

Contributors will be acknowledged in release notes and the README. Thank you for helping improve this plugin!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
