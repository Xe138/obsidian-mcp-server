# Obsidian Plugin Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all required issues from the Nov 16, 2025 ObsidianReviewBot code review to unblock plugin submission approval.

**Architecture:** Systematic file-by-file fixes addressing: sentence case UI text, async/await cleanup, eslint directive removal, require() to ES6 import conversion, and promise handling improvements.

**Tech Stack:** TypeScript, Obsidian API, ESLint

---

## Task 1: Fix Sentence Case in main.ts

**Files:**
- Modify: `src/main.ts:45`

**Step 1: Fix ribbon icon tooltip**

Change line 45 from:
```typescript
this.addRibbonIcon('server', 'Toggle MCP Server', async () => {
```

To:
```typescript
this.addRibbonIcon('server', 'Toggle MCP server', async () => {
```

**Step 2: Fix onunload promise issue (lines 96-98)**

Change from:
```typescript
async onunload() {
    await this.stopServer();
}
```

To:
```typescript
onunload() {
    void this.stopServer();
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "fix: sentence case and onunload promise in main.ts"
```

---

## Task 2: Fix Sentence Case in settings.ts

**Files:**
- Modify: `src/settings.ts:209,319`

**Step 1: Fix authentication section header (line 209)**

Change from:
```typescript
authSummary.setText('Authentication & Configuration');
```

To:
```typescript
authSummary.setText('Authentication & configuration');
```

**Step 2: Fix notifications section header (line 319)**

Change from:
```typescript
notifSummary.setText('UI Notifications');
```

To:
```typescript
notifSummary.setText('UI notifications');
```

**Step 3: Verify build**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/settings.ts
git commit -m "fix: sentence case for section headers in settings.ts"
```

---

## Task 3: Fix mcp-server.ts Issues

**Files:**
- Modify: `src/server/mcp-server.ts:57,70,77-79,117`

**Step 1: Remove async from handleInitialize (line 57)**

Change from:
```typescript
private async handleInitialize(_params: JSONRPCParams): Promise<InitializeResult> {
```

To:
```typescript
private handleInitialize(_params: JSONRPCParams): InitializeResult {
```

**Step 2: Remove async from handleListTools (line 70)**

Change from:
```typescript
private async handleListTools(): Promise<ListToolsResult> {
```

To:
```typescript
private handleListTools(): ListToolsResult {
```

**Step 3: Update handleRequest callers (lines 41-43)**

Since handleInitialize and handleListTools are no longer async, remove the await:

Change from:
```typescript
case 'initialize':
    return this.createSuccessResponse(request.id, await this.handleInitialize(request.params ?? {}));
case 'tools/list':
    return this.createSuccessResponse(request.id, await this.handleListTools());
```

To:
```typescript
case 'initialize':
    return this.createSuccessResponse(request.id, this.handleInitialize(request.params ?? {}));
case 'tools/list':
    return this.createSuccessResponse(request.id, this.handleListTools());
```

**Step 4: Remove eslint-disable and fix any type (lines 77-79)**

Change from:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments come from JSON-RPC and need runtime validation
const paramsObj = params as { name: string; arguments: any };
```

To:
```typescript
const paramsObj = params as { name: string; arguments: Record<string, unknown> };
```

**Step 5: Fix promise rejection to use Error (line 117)**

Change from:
```typescript
reject(error);
```

To:
```typescript
reject(error instanceof Error ? error : new Error(String(error)));
```

**Step 6: Verify build**

Run: `npm run build`
Expected: No errors

**Step 7: Commit**

```bash
git add src/server/mcp-server.ts
git commit -m "fix: async/await, eslint directive, and promise rejection in mcp-server.ts"
```

---

## Task 4: Fix routes.ts Promise Issue

**Files:**
- Modify: `src/server/routes.ts:10-19`

**Step 1: Wrap async handler to handle void context**

Change from:
```typescript
app.post('/mcp', async (req: Request, res: Response) => {
    try {
        const request = req.body as JSONRPCRequest;
        const response = await handleRequest(request);
        res.json(response);
    } catch (error) {
        console.error('MCP request error:', error);
        res.status(500).json(createErrorResponse(null, ErrorCodes.InternalError, 'Internal server error'));
    }
});
```

To:
```typescript
app.post('/mcp', (req: Request, res: Response) => {
    void (async () => {
        try {
            const request = req.body as JSONRPCRequest;
            const response = await handleRequest(request);
            res.json(response);
        } catch (error) {
            console.error('MCP request error:', error);
            res.status(500).json(createErrorResponse(null, ErrorCodes.InternalError, 'Internal server error'));
        }
    })();
});
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/routes.ts
git commit -m "fix: wrap async handler with void for proper promise handling"
```

---

## Task 5: Fix tools/index.ts ESLint Directive

**Files:**
- Modify: `src/tools/index.ts:477-478`

**Step 1: Remove eslint-disable and fix type**

Change from:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments come from JSON-RPC and require runtime validation
async callTool(name: string, args: any): Promise<CallToolResult> {
```

To:
```typescript
async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/tools/index.ts
git commit -m "fix: remove eslint-disable directive in tools/index.ts"
```

---

## Task 6: Fix vault-tools.ts Async Methods

**Files:**
- Modify: `src/tools/vault-tools.ts:18,63,310,498,925`

**Step 1: Remove async from getVaultInfo (line 18)**

Change from:
```typescript
async getVaultInfo(): Promise<CallToolResult> {
```

To:
```typescript
getVaultInfo(): CallToolResult {
```

**Step 2: Remove async from listNotes (line 63)**

Change from:
```typescript
async listNotes(path?: string): Promise<CallToolResult> {
```

To:
```typescript
listNotes(path?: string): CallToolResult {
```

**Step 3: Remove async from createFileMetadataWithFrontmatter (line 310)**

Change from:
```typescript
private async createFileMetadataWithFrontmatter(
```

To:
```typescript
private createFileMetadataWithFrontmatter(
```

Also update the return type from `Promise<FileMetadataWithFrontmatter>` to `FileMetadataWithFrontmatter`.

**Step 4: Remove async from exists (line 498)**

Change from:
```typescript
async exists(path: string): Promise<CallToolResult> {
```

To:
```typescript
exists(path: string): CallToolResult {
```

**Step 5: Remove async from resolveWikilink (line 925)**

Change from:
```typescript
async resolveWikilink(sourcePath: string, linkText: string): Promise<CallToolResult> {
```

To:
```typescript
resolveWikilink(sourcePath: string, linkText: string): CallToolResult {
```

**Step 6: Update callers if any use await on these methods**

Search for any `await this.getVaultInfo()`, `await this.listNotes()`, `await this.exists()`, `await this.resolveWikilink()`, `await this.createFileMetadataWithFrontmatter()` and remove the `await` keyword.

**Step 7: Verify build**

Run: `npm run build`
Expected: No errors

**Step 8: Commit**

```bash
git add src/tools/vault-tools.ts
git commit -m "fix: remove async from methods without await in vault-tools.ts"
```

---

## Task 7: Fix notifications.ts ESLint Directives

**Files:**
- Modify: `src/ui/notifications.ts:10-11,78-79,145-146,179`

**Step 1: Fix interface args type (lines 10-11)**

Change from:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments come from JSON-RPC and can be any valid JSON structure
args: any;
```

To:
```typescript
args: Record<string, unknown>;
```

**Step 2: Fix showToolCall parameter type (lines 78-79)**

Change from:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments come from JSON-RPC and can be any valid JSON structure
showToolCall(toolName: string, args: any, duration?: number): void {
```

To:
```typescript
showToolCall(toolName: string, args: Record<string, unknown>, duration?: number): void {
```

**Step 3: Fix formatArgs parameter type (lines 145-146)**

Change from:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments come from JSON-RPC and can be any valid JSON structure
private formatArgs(args: any): string {
```

To:
```typescript
private formatArgs(args: Record<string, unknown>): string {
```

**Step 4: Fix unused 'e' variable (line 179)**

Change from:
```typescript
} catch (e) {
```

To:
```typescript
} catch {
```

**Step 5: Verify build**

Run: `npm run build`
Expected: No errors

**Step 6: Commit**

```bash
git add src/ui/notifications.ts
git commit -m "fix: remove eslint directives and unused catch variable in notifications.ts"
```

---

## Task 8: Fix crypto-adapter.ts Require Import

**Files:**
- Modify: `src/utils/crypto-adapter.ts:18-34`

**Step 1: Replace require with dynamic approach**

The challenge here is that require() is used for synchronous access. We need to restructure to use a lazy initialization pattern.

Change the entire Node.js section from:
```typescript
// Node.js environment (15+) - uses Web Crypto API standard
if (typeof global !== 'undefined') {
    try {
        // Using require() is necessary for synchronous crypto access in Obsidian desktop plugins
        // ES6 dynamic imports would create race conditions as crypto must be available synchronously
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- Synchronous Node.js crypto API access required
        const nodeCrypto = require('crypto') as typeof import('crypto');
        if (nodeCrypto?.webcrypto) {
            return nodeCrypto.webcrypto as unknown as Crypto;
        }
    } catch {
        // Crypto module not available or failed to load
    }
}
```

To (using globalThis.crypto which is available in Node 19+ and Electron):
```typescript
// Node.js/Electron environment - globalThis.crypto available in modern runtimes
if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/crypto-adapter.ts
git commit -m "fix: use globalThis.crypto instead of require('crypto')"
```

---

## Task 9: Fix encryption-utils.ts Require Import

**Files:**
- Modify: `src/utils/encryption-utils.ts:8-18`

**Step 1: Restructure electron import**

Since Electron's safeStorage must be accessed synchronously at module load time, and ES6 dynamic imports are async, we need to use a different approach. In Obsidian plugins running in Electron, we can access electron through the window object.

Change from:
```typescript
// Safely import safeStorage - may not be available in all environments
let safeStorage: ElectronSafeStorage | null = null;
try {
    // Using require() is necessary for synchronous access to Electron's safeStorage API in Obsidian desktop plugins
    // ES6 dynamic imports would create race conditions as this module must be available synchronously
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- Synchronous Electron API access required for Obsidian plugin
    const electron = require('electron') as typeof import('electron');
    safeStorage = electron.safeStorage || null;
} catch (error) {
    console.warn('Electron safeStorage not available, API keys will be stored in plaintext');
}
```

To:
```typescript
// Safely import safeStorage - may not be available in all environments
let safeStorage: ElectronSafeStorage | null = null;
try {
    // Access electron through the global window object in Obsidian's Electron environment
    // This avoids require() while still getting synchronous access
    const electronRemote = (window as Window & { require?: (module: string) => typeof import('electron') }).require;
    if (electronRemote) {
        const electron = electronRemote('electron');
        safeStorage = electron.safeStorage || null;
    }
} catch {
    console.warn('Electron safeStorage not available, API keys will be stored in plaintext');
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/encryption-utils.ts
git commit -m "fix: use window.require pattern instead of bare require for electron"
```

---

## Task 10: Fix link-utils.ts Async Method

**Files:**
- Modify: `src/utils/link-utils.ts:448`

**Step 1: Remove async from validateLinks**

Change from:
```typescript
static async validateLinks(
    vault: IVaultAdapter,
    metadata: IMetadataCacheAdapter,
    content: string,
    sourcePath: string
): Promise<LinkValidationResult> {
```

To:
```typescript
static validateLinks(
    vault: IVaultAdapter,
    metadata: IMetadataCacheAdapter,
    content: string,
    sourcePath: string
): LinkValidationResult {
```

**Step 2: Update any callers that await this method**

Search for `await LinkUtils.validateLinks` or `await this.validateLinks` and remove the `await`.

**Step 3: Verify build**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/utils/link-utils.ts
git commit -m "fix: remove async from validateLinks method"
```

---

## Task 11: Final Build and Test

**Step 1: Run full build**

Run: `npm run build`
Expected: No errors

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit any remaining changes**

```bash
git status
# If any uncommitted changes:
git add -A
git commit -m "fix: final cleanup for code review issues"
```

---

## Optional Tasks (if time permits)

### Optional Task A: Fix Unused Error Variables

**Files:**
- `src/tools/vault-tools.ts:289,359,393,445,715`
- `src/utils/encryption-utils.ts:16`
- `src/utils/frontmatter-utils.ts:76,329,358`
- `src/utils/search-utils.ts:117,326`
- `src/utils/waypoint-utils.ts:103`

For each occurrence, change `catch (error) {` or `catch (e) {` or `catch (decompressError) {` to just `catch {`.

### Optional Task B: Use FileManager.trashFile()

**Files:**
- Modify: `src/adapters/vault-adapter.ts:46-48`
- Modify: `src/adapters/interfaces.ts` (update IVaultAdapter interface)

This requires passing the App or FileManager to the VaultAdapter, which is a larger refactor.

---

## Summary Checklist

- [ ] Task 1: main.ts sentence case + onunload
- [ ] Task 2: settings.ts sentence case
- [ ] Task 3: mcp-server.ts async/eslint/promise fixes
- [ ] Task 4: routes.ts promise handling
- [ ] Task 5: tools/index.ts eslint directive
- [ ] Task 6: vault-tools.ts async methods
- [ ] Task 7: notifications.ts eslint directives
- [ ] Task 8: crypto-adapter.ts require import
- [ ] Task 9: encryption-utils.ts require import
- [ ] Task 10: link-utils.ts async method
- [ ] Task 11: Final build and test
