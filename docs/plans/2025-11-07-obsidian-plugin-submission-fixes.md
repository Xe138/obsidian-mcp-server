# Obsidian Plugin Submission Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all code quality issues identified in the Obsidian plugin submission review to meet community plugin standards.

**Architecture:** Systematic refactoring across the codebase to replace `any` types with proper TypeScript types, remove `console.log` statements, fix command IDs, improve promise handling, use proper UI APIs, convert require() to ES6 imports, and standardize text formatting.

**Tech Stack:** TypeScript, Obsidian API, Express, Node.js

---

## Task 1: Fix Type Safety Issues - Replace `any` Types

**Files:**
- Modify: `src/main.ts:27`
- Modify: `src/utils/encryption-utils.ts:2`
- Modify: `src/types/mcp-types.ts` (multiple locations)
- Modify: `src/tools/index.ts` (multiple locations)
- Modify: `src/tools/note-tools.ts` (multiple locations)
- Modify: `src/tools/vault-tools.ts` (multiple locations)
- Modify: `src/utils/frontmatter-utils.ts` (multiple locations)
- Modify: `src/ui/notifications.ts` (multiple locations)
- Modify: `src/server/middleware.ts` (multiple locations)
- Modify: `src/adapters/file-manager-adapter.ts` (multiple locations)
- Modify: `src/adapters/interfaces.ts` (multiple locations)
- Modify: `src/utils/glob-utils.ts` (multiple locations)
- Modify: `src/server/mcp-server.ts` (multiple locations)
- Modify: `src/server/routes.ts` (multiple locations)

**Step 1: Define proper types for Electron safeStorage**

In `src/utils/encryption-utils.ts`, replace the `any` type with a proper interface:

```typescript
// Define Electron SafeStorage interface
interface ElectronSafeStorage {
	isEncryptionAvailable(): boolean;
	encryptString(plainText: string): Buffer;
	decryptString(encrypted: Buffer): string;
}

let safeStorage: ElectronSafeStorage | null = null;
```

**Step 2: Fix legacy settings migration in main.ts**

In `src/main.ts:27`, replace:

```typescript
const legacySettings = this.settings as any;
```

with:

```typescript
interface LegacySettings extends MCPPluginSettings {
	enableCORS?: boolean;
	allowedOrigins?: string[];
}
const legacySettings = this.settings as LegacySettings;
```

**Step 3: Review and fix types in mcp-types.ts**

Read `src/types/mcp-types.ts` and replace all `any` types with proper JSON-RPC and MCP protocol types:
- Define proper JSONValue type
- Define proper JSONRPCRequest interface
- Define proper JSONRPCResponse interface
- Define proper CallToolResult content types

**Step 4: Fix tool registry types in tools/index.ts**

Replace `any` types with proper tool definition types and CallToolResult types.

**Step 5: Fix note-tools.ts and vault-tools.ts types**

Replace `any` types with proper TFile, TFolder, MetadataCache types from Obsidian API.

**Step 6: Fix frontmatter-utils.ts types**

Replace `any` types with proper YAML value types (string | number | boolean | null | object).

**Step 7: Commit type safety fixes**

```bash
git add src/
git commit -m "fix: replace any types with proper TypeScript types"
```

---

## Task 2: Remove Forbidden console.log Statements

**Files:**
- Modify: `src/main.ts:21,29`
- Modify: `src/ui/notifications.ts:94`
- Modify: `src/server/mcp-server.ts:103,127`

**Step 1: Remove console.log from main.ts**

In `src/main.ts`, remove lines 21 and 29 (API key generation and migration logs). These are informational logs that don't need to be shown to users.

**Step 2: Remove console.log from notifications.ts**

In `src/ui/notifications.ts:94`, the log is controlled by `logToConsole` setting. Keep the functionality but use `console.debug` instead:

```typescript
if (this.settings.logToConsole) {
	console.debug(`[MCP] Tool call: ${toolName}`, args);
}
```

**Step 3: Remove console.log from mcp-server.ts**

In `src/server/mcp-server.ts:103,127`, remove the server start/stop logs. The UI already shows this status via Notice and status bar.

**Step 4: Verify all console methods are allowed**

Run grep to verify only `warn`, `error`, and `debug` remain:

```bash
grep -r "console\." src/ | grep -v "console.warn\|console.error\|console.debug" | grep -v "node_modules"
```

**Step 5: Commit console.log removal**

```bash
git add src/
git commit -m "fix: remove console.log statements, use console.debug where needed"
```

---

## Task 3: Fix Command ID Naming

**Files:**
- Read: `src/main.ts:52-83` (to identify command IDs)
- Modify: `manifest.json` (if command IDs are documented there)

**Step 1: Review current command IDs**

Current command IDs in `src/main.ts`:
- `start-mcp-server` ✓ (correct)
- `stop-mcp-server` ✓ (correct)
- `restart-mcp-server` ✓ (correct)
- `view-notification-history` ✓ (correct)

**Note:** The review mentioned "Three command IDs incorrectly include the plugin name prefix". After reviewing the code, the command IDs do NOT include "mcp-server:" prefix - they use simple kebab-case IDs which is correct. The command NAMES (user-facing text) are also correct and don't include the plugin name.

**Step 2: Verify no issues**

The command IDs are already correct. No changes needed for this task.

**Step 3: Document verification**

```bash
echo "Command IDs verified - no changes needed" > /tmp/command-id-check.txt
```

---

## Task 4: Fix Promise Handling Issues

**Files:**
- Modify: `src/main.ts:16` (onload return type)
- Modify: `src/tools/note-tools.ts` (async methods without await)
- Modify: `src/adapters/vault-adapter.ts` (async methods without await)
- Modify: `src/adapters/file-manager-adapter.ts` (async methods without await)
- Modify: `src/ui/notifications.ts` (async methods without await)
- Modify: `src/server/mcp-server.ts` (async methods without await)

**Step 1: Fix onload return type**

In `src/main.ts:16`, the `onload()` method is async but Plugin.onload expects void. This is actually fine - Obsidian's Plugin class allows async onload. Verify this is not a false positive by checking if there are any actual issues.

**Step 2: Review async methods without await**

Search for async methods that don't use await and may not need to be async:

```bash
grep -A 20 "async " src/**/*.ts | grep -v "await"
```

**Step 3: Fix methods that return Promise in void context**

Look for callback functions that are async but used where void is expected:
- Button click handlers
- Event listeners
- Command callbacks

Wrap these with void operators or handle promises properly:

```typescript
// Before:
.onClick(async () => {
	await this.doSomething();
})

// After (if in void context):
.onClick(() => {
	void this.doSomething();
})
```

**Step 4: Ensure error rejection uses Error objects**

Search for promise rejections that don't use Error objects:

```typescript
// Before:
return Promise.reject('message');

// After:
return Promise.reject(new Error('message'));
```

**Step 5: Commit promise handling fixes**

```bash
git add src/
git commit -m "fix: improve promise handling and async/await usage"
```

---

## Task 5: Convert require() to ES6 Imports

**Files:**
- Modify: `src/utils/encryption-utils.ts:4`
- Modify: `src/utils/crypto-adapter.ts:20`

**Step 1: Convert encryption-utils.ts**

In `src/utils/encryption-utils.ts`, replace:

```typescript
let safeStorage: ElectronSafeStorage | null = null;
try {
	const electron = require('electron');
	safeStorage = electron.safeStorage || null;
} catch (error) {
	console.warn('Electron safeStorage not available, API keys will be stored in plaintext');
}
```

with:

```typescript
import { safeStorage as electronSafeStorage } from 'electron';

let safeStorage: ElectronSafeStorage | null = null;
try {
	safeStorage = electronSafeStorage || null;
} catch (error) {
	console.warn('Electron safeStorage not available, API keys will be stored in plaintext');
}
```

**Step 2: Convert crypto-adapter.ts**

In `src/utils/crypto-adapter.ts:20`, replace:

```typescript
if (typeof global !== 'undefined') {
	const nodeCrypto = require('crypto');
	if (nodeCrypto.webcrypto) {
		return nodeCrypto.webcrypto;
	}
}
```

with:

```typescript
if (typeof global !== 'undefined') {
	try {
		// Dynamic import for Node.js crypto - bundler will handle this
		const crypto = await import('crypto');
		if (crypto.webcrypto) {
			return crypto.webcrypto;
		}
	} catch {
		// Crypto module not available
	}
}
```

However, since this is in a synchronous function, we need a different approach. Use top-level import with try-catch:

```typescript
// At top of file
let nodeCrypto: typeof import('crypto') | null = null;
try {
	nodeCrypto = require('crypto'); // This will be transformed by bundler
} catch {
	// Not in Node environment
}

// In getCrypto():
if (typeof global !== 'undefined' && nodeCrypto?.webcrypto) {
	return nodeCrypto.webcrypto;
}
```

Actually, the best approach for Obsidian plugins is to use conditional imports at the top level:

```typescript
import type * as CryptoModule from 'crypto';

let nodeCrypto: typeof CryptoModule | null = null;
if (typeof process !== 'undefined') {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	nodeCrypto = require('crypto');
}
```

But this still uses require. For Obsidian plugins, the recommended approach is to mark it as external in the build config and use dynamic import(). However, since this is in a sync function, we need to restructure.

The cleanest solution: Move the require to top-level with proper typing and accept that require() is necessary here for sync crypto access:

```typescript
// Add at top of file
import type { webcrypto } from 'crypto';

// Conditionally load Node.js crypto for environments that have it
let nodeWebCrypto: typeof webcrypto | undefined;
try {
	// Note: require is necessary here for synchronous crypto access in Node.js
	// This will be properly handled by esbuild during bundling
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const crypto = require('crypto') as typeof import('crypto');
	nodeWebCrypto = crypto.webcrypto;
} catch {
	// Not in Node.js environment or crypto not available
	nodeWebCrypto = undefined;
}

function getCrypto(): Crypto {
	// Browser/Electron environment
	if (typeof window !== 'undefined' && window.crypto) {
		return window.crypto;
	}

	// Node.js environment
	if (nodeWebCrypto) {
		return nodeWebCrypto as unknown as Crypto;
	}

	throw new Error('No Web Crypto API available in this environment');
}
```

**Step 3: Add eslint-disable comments**

If require() is truly necessary (which it is for sync Node.js module loading in Obsidian), add proper eslint-disable comments with justification.

**Step 4: Test builds**

```bash
npm run build
```

**Step 5: Commit require() fixes**

```bash
git add src/
git commit -m "fix: improve require() usage with proper typing and comments"
```

---

## Task 6: Fix Settings UI - Use setHeading() API

**Files:**
- Modify: `src/settings.ts:130,133,240`

**Step 1: Replace h2 heading**

In `src/settings.ts:130`, replace:

```typescript
containerEl.createEl('h2', {text: 'MCP Server Settings'});
```

with:

```typescript
new Setting(containerEl)
	.setHeading()
	.setName('MCP Server Settings');
```

**Step 2: Replace h3 heading**

In `src/settings.ts:133`, replace:

```typescript
containerEl.createEl('h3', {text: 'Server Status'});
```

with:

```typescript
new Setting(containerEl)
	.setHeading()
	.setName('Server Status');
```

**Step 3: Replace h4 heading**

In `src/settings.ts:240`, replace:

```typescript
authDetails.createEl('h4', {text: 'MCP Client Configuration', cls: 'mcp-heading'});
```

with:

```typescript
new Setting(authDetails)
	.setHeading()
	.setName('MCP Client Configuration');
```

Note: The cls parameter will be lost, but setHeading() provides consistent styling.

**Step 4: Test settings UI**

Build and test in Obsidian to ensure headings render correctly.

**Step 5: Commit settings UI fixes**

```bash
git add src/settings.ts
git commit -m "fix: use Setting.setHeading() instead of createElement for headings"
```

---

## Task 7: Fix notification-history.ts Heading

**Files:**
- Modify: `src/ui/notification-history.ts:29`

**Step 1: Replace h2 in modal**

In `src/ui/notification-history.ts:29`, the modal already has a title. Check if the h2 is redundant or if it should use a different approach.

Read the file to understand context:

```bash
cat src/ui/notification-history.ts
```

**Step 2: Replace with Setting API if in settings context**

If this is in a modal content area and not using Setting API, this might be acceptable. Check the Obsidian API guidelines for modal headings.

For modals, direct createElement is often acceptable. However, if it should follow the same pattern, consider using a div with a class instead:

```typescript
contentEl.createEl('div', { text: 'MCP Notification History', cls: 'modal-title' });
```

Or keep it as-is if modals are exempt from the setHeading() requirement.

**Step 3: Verify with Obsidian guidelines**

Check if modal content should use setHeading() or if createElement is acceptable for modals.

**Step 4: Make appropriate changes**

Based on guidelines, either keep as-is or update accordingly.

**Step 5: Commit if changes were made**

```bash
git add src/ui/notification-history.ts
git commit -m "fix: update modal heading to follow Obsidian guidelines"
```

---

## Task 8: Fix UI Text Capitalization - Use Sentence Case

**Files:**
- Modify: `src/settings.ts` (multiple text strings)
- Modify: `src/main.ts` (command names, notices)
- Review all user-facing strings

**Step 1: Fix command names in main.ts**

Commands should use sentence case:

```typescript
// Line 54
name: 'Start server',  // Already correct

// Line 62
name: 'Stop server',  // Already correct

// Line 70
name: 'Restart server',  // Already correct

// Line 79
name: 'View notification history',  // Already correct
```

**Step 2: Fix Notice messages**

Review all Notice calls for proper capitalization:

```typescript
// Already mostly correct, but verify all instances
new Notice('MCP Server started on port ${this.settings.port}');
```

**Step 3: Fix settings.ts strings**

Review all setName() and setDesc() calls:

```typescript
// Examples that might need fixing:
.setName('Auto-start server')  // Check if correct
.setName('Show parameters')    // Check if correct
.setName('Notification duration')  // Check if correct
```

Sentence case means: "First word capitalized, rest lowercase unless proper noun"

**Step 4: Create a checklist of all user-facing strings**

```bash
grep -r "setName\|setDesc\|text:" src/ | grep -v node_modules > /tmp/ui-text-audit.txt
```

**Step 5: Fix each string to use sentence case**

Review the audit file and fix any Title Case or ALL CAPS strings to use sentence case.

**Step 6: Commit UI text fixes**

```bash
git add src/
git commit -m "fix: use sentence case for all UI text"
```

---

## Task 9: Optional Improvements - Use trashFile() Instead of delete()

**Files:**
- Modify: `src/tools/note-tools.ts` (delete_note tool)
- Modify: `src/adapters/file-manager-adapter.ts`

**Step 1: Find all Vault.delete() calls**

```bash
grep -n "vault.delete\|vault.trash" src/
```

**Step 2: Replace with FileManager.trashFile()**

In note-tools.ts and file-manager-adapter.ts, replace:

```typescript
await vault.delete(file);
```

with:

```typescript
await app.fileManager.trashFile(file);
```

This respects the user's "Delete to system trash" setting.

**Step 3: Update adapter interfaces**

If the adapter has a delete method, rename it to trash or add a trash method:

```typescript
async trashFile(path: string): Promise<void> {
	const file = this.vault.getAbstractFileByPath(path);
	if (!file || !(file instanceof TFile)) {
		throw new Error(`File not found: ${path}`);
	}
	await this.app.fileManager.trashFile(file);
}
```

**Step 4: Update tool to use trash**

Update the delete_note tool to call the new trash method.

**Step 5: Commit trash improvements**

```bash
git add src/
git commit -m "feat: use trashFile to respect user deletion preferences"
```

---

## Task 10: Clean Up Unused Imports

**Files:**
- Review all files for unused imports

**Step 1: Run TypeScript unused import check**

```bash
npx tsc --noEmit --noUnusedLocals 2>&1 | grep "declared but never used"
```

**Step 2: Remove unused imports from each file**

For each file with unused imports:
- `MCPPluginSettings` (if unused)
- `TFile` (if unused)
- `VaultInfo` (if unused)

**Step 3: Commit unused import cleanup**

```bash
git add src/
git commit -m "chore: remove unused imports"
```

---

## Task 11: Fix Regular Expression Control Characters

**Files:**
- Search for regex with null bytes or control characters

**Step 1: Find the problematic regex**

```bash
grep -r "\\x00\|\\x1f" src/
```

**Step 2: Fix or remove control characters**

The review mentioned "One regex pattern contains unexpected control characters (null and unit separator bytes)". Find and fix this regex.

**Step 3: Test regex patterns**

Ensure all regex patterns are valid and don't contain unintended control characters.

**Step 4: Commit regex fixes**

```bash
git add src/
git commit -m "fix: remove control characters from regex pattern"
```

---

## Task 12: Fix Switch Case Variable Scoping

**Files:**
- Search for switch statements with variable declarations

**Step 1: Find switch statements**

```bash
grep -B 2 -A 10 "switch\s*(" src/**/*.ts
```

**Step 2: Wrap case blocks with braces**

If any case statement declares variables, wrap in braces:

```typescript
// Before:
case 'foo':
	const x = 123;
	return x;

// After:
case 'foo': {
	const x = 123;
	return x;
}
```

**Step 3: Test switch statements**

Ensure no TypeScript errors about variable redeclaration.

**Step 4: Commit scoping fixes**

```bash
git add src/
git commit -m "fix: add block scoping to switch case statements"
```

---

## Task 13: Clean Up Unused Variables

**Files:**
- All files with unused variable declarations

**Step 1: Run unused variable check**

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | grep "declared but never"
```

**Step 2: Remove or prefix unused variables**

For each unused variable:
- Remove if truly unused
- Prefix with `_` if intentionally unused (e.g., `_error`)
- Use if it should be used

**Step 3: Commit cleanup**

```bash
git add src/
git commit -m "chore: remove unused variables"
```

---

## Task 14: Final Verification and Testing

**Files:**
- All source files

**Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build with no errors

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Test in Obsidian**

1. Copy build artifacts to test vault
2. Reload Obsidian
3. Test server start/stop
4. Test settings UI
5. Test all commands
6. Test MCP tool calls

**Step 5: Create verification report**

Document all fixes in a summary:

```markdown
# Obsidian Plugin Submission Fixes - Verification Report

## Fixed Issues

1. ✅ Type Safety - Replaced 39+ instances of `any` with proper types
2. ✅ Console Statements - Removed console.log, kept only warn/error/debug
3. ✅ Command IDs - Verified correct (no changes needed)
4. ✅ Promise Handling - Fixed async/await usage and error handling
5. ✅ Require Imports - Improved require() usage with typing
6. ✅ Settings UI - Used setHeading() API for headings
7. ✅ Text Capitalization - Applied sentence case throughout
8. ✅ Regex Issues - Fixed control characters
9. ✅ Switch Scoping - Added block scoping to case statements
10. ✅ Unused Code - Removed unused imports and variables
11. ✅ Trash Files - Used trashFile() instead of delete()

## Test Results

- Build: ✅ Pass
- Tests: ✅ Pass
- Type Check: ✅ Pass
- Manual Testing: ✅ Pass

## Ready for Resubmission

All issues from the review have been addressed.
```

---

## Execution Notes

**Prerequisites:**
- Node.js and npm installed
- TypeScript and project dependencies installed (`npm install`)
- Test Obsidian vault for manual testing

**Estimated Time:** 3-4 hours for all tasks

**Testing Strategy:**
- Run type checking after each task
- Build after each major change
- Full manual test at the end

**Risk Areas:**
- Electron/Node.js require() imports may need special handling
- Crypto module imports in different environments
- Settings UI changes may affect visual layout

**Success Criteria:**
- No TypeScript errors
- No linting errors from Obsidian's submission validator
- All functionality works in Obsidian
- Plugin ready for resubmission to community marketplace
