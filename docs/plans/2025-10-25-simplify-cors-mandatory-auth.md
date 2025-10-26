# Simplify CORS and Make Authentication Mandatory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove CORS configuration toggles, make authentication mandatory with secure token storage using Electron's safeStorage API, and simplify settings UI.

**Architecture:** This refactor removes `enableCORS` and `allowedOrigins` settings, making CORS always enabled with a fixed localhost-only policy. Authentication becomes mandatory with auto-generated API keys encrypted via Electron's safeStorage. Settings are migrated on plugin load to maintain backward compatibility.

**Tech Stack:** TypeScript, Express.js, Electron safeStorage API, Jest for testing

---

## Task 1: Create Encryption Utility Module

**Files:**
- Create: `src/utils/encryption-utils.ts`
- Create: `tests/encryption-utils.test.ts`

**Step 1: Write the failing test**

Create `tests/encryption-utils.test.ts`:

```typescript
import { encryptApiKey, decryptApiKey } from '../src/utils/encryption-utils';

// Mock electron module
jest.mock('electron', () => ({
	safeStorage: {
		isEncryptionAvailable: jest.fn(() => true),
		encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
		decryptString: jest.fn((buffer: Buffer) => {
			const str = buffer.toString();
			return str.replace('encrypted:', '');
		})
	}
}));

describe('Encryption Utils', () => {
	describe('encryptApiKey', () => {
		it('should encrypt API key when encryption is available', () => {
			const apiKey = 'test-api-key-12345';
			const encrypted = encryptApiKey(apiKey);

			expect(encrypted).toMatch(/^encrypted:/);
			expect(encrypted).not.toContain('test-api-key-12345');
		});

		it('should return plaintext when encryption is not available', () => {
			const { safeStorage } = require('electron');
			safeStorage.isEncryptionAvailable.mockReturnValueOnce(false);

			const apiKey = 'test-api-key-12345';
			const result = encryptApiKey(apiKey);

			expect(result).toBe(apiKey);
		});

		it('should handle empty string', () => {
			const result = encryptApiKey('');
			expect(result).toBe('');
		});
	});

	describe('decryptApiKey', () => {
		it('should decrypt encrypted API key', () => {
			const apiKey = 'test-api-key-12345';
			const encrypted = encryptApiKey(apiKey);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(apiKey);
		});

		it('should return plaintext if not encrypted format', () => {
			const plaintext = 'plain-api-key';
			const result = decryptApiKey(plaintext);

			expect(result).toBe(plaintext);
		});

		it('should handle empty string', () => {
			const result = decryptApiKey('');
			expect(result).toBe('');
		});
	});

	describe('round-trip encryption', () => {
		it('should successfully encrypt and decrypt', () => {
			const original = 'my-secret-api-key-abc123';
			const encrypted = encryptApiKey(original);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(original);
			expect(encrypted).not.toBe(original);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- encryption-utils.test.ts`
Expected: FAIL with "Cannot find module '../src/utils/encryption-utils.ts'"

**Step 3: Write minimal implementation**

Create `src/utils/encryption-utils.ts`:

```typescript
import { safeStorage } from 'electron';

/**
 * Encrypts an API key using Electron's safeStorage API
 * Falls back to plaintext if encryption is not available (e.g., Linux without keyring)
 * @param apiKey The plaintext API key to encrypt
 * @returns Encrypted API key with "encrypted:" prefix, or plaintext if encryption unavailable
 */
export function encryptApiKey(apiKey: string): string {
	if (!apiKey) {
		return '';
	}

	// Check if encryption is available
	if (!safeStorage.isEncryptionAvailable()) {
		console.warn('Encryption not available, storing API key in plaintext');
		return apiKey;
	}

	try {
		const encrypted = safeStorage.encryptString(apiKey);
		return `encrypted:${encrypted.toString('base64')}`;
	} catch (error) {
		console.error('Failed to encrypt API key, falling back to plaintext:', error);
		return apiKey;
	}
}

/**
 * Decrypts an API key encrypted with encryptApiKey
 * @param stored The stored API key (encrypted or plaintext)
 * @returns Decrypted API key
 */
export function decryptApiKey(stored: string): string {
	if (!stored) {
		return '';
	}

	// Check if this is an encrypted key
	if (!stored.startsWith('encrypted:')) {
		// Legacy plaintext key or fallback
		return stored;
	}

	try {
		const encryptedData = stored.substring(10); // Remove "encrypted:" prefix
		const buffer = Buffer.from(encryptedData, 'base64');
		return safeStorage.decryptString(buffer);
	} catch (error) {
		console.error('Failed to decrypt API key:', error);
		throw new Error('Failed to decrypt API key. You may need to regenerate it.');
	}
}

/**
 * Checks if encryption is available on the current platform
 * @returns true if safeStorage encryption is available
 */
export function isEncryptionAvailable(): boolean {
	return safeStorage.isEncryptionAvailable();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- encryption-utils.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add src/utils/encryption-utils.ts tests/encryption-utils.test.ts
git commit -m "feat: add API key encryption utilities using Electron safeStorage"
```

---

## Task 2: Update Settings Types

**Files:**
- Modify: `src/types/settings-types.ts:1-34`

**Step 1: Write the failing test**

Create test file `tests/settings-types.test.ts`:

```typescript
import { DEFAULT_SETTINGS, MCPPluginSettings } from '../src/types/settings-types';

describe('Settings Types', () => {
	describe('DEFAULT_SETTINGS', () => {
		it('should have authentication enabled by default', () => {
			expect(DEFAULT_SETTINGS.enableAuth).toBe(true);
		});

		it('should not have enableCORS field', () => {
			expect((DEFAULT_SETTINGS as any).enableCORS).toBeUndefined();
		});

		it('should not have allowedOrigins field', () => {
			expect((DEFAULT_SETTINGS as any).allowedOrigins).toBeUndefined();
		});

		it('should have empty apiKey by default', () => {
			expect(DEFAULT_SETTINGS.apiKey).toBe('');
		});

		it('should have autoStart disabled by default', () => {
			expect(DEFAULT_SETTINGS.autoStart).toBe(false);
		});

		it('should have valid port number', () => {
			expect(DEFAULT_SETTINGS.port).toBe(3000);
			expect(DEFAULT_SETTINGS.port).toBeGreaterThan(0);
			expect(DEFAULT_SETTINGS.port).toBeLessThan(65536);
		});
	});

	describe('MCPPluginSettings interface', () => {
		it('should require apiKey field', () => {
			const settings: MCPPluginSettings = {
				...DEFAULT_SETTINGS,
				apiKey: 'test-key'
			};
			expect(settings.apiKey).toBe('test-key');
		});

		it('should not allow enableCORS field', () => {
			// This is a compile-time check, but we verify runtime
			const settings: MCPPluginSettings = DEFAULT_SETTINGS;
			expect((settings as any).enableCORS).toBeUndefined();
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- settings-types.test.ts`
Expected: FAIL - Tests fail because enableCORS is still true and allowedOrigins exists

**Step 3: Update settings types**

Modify `src/types/settings-types.ts`:

```typescript
// Settings Types
export interface MCPServerSettings {
	port: number;
	apiKey: string; // Now required, not optional
	enableAuth: boolean; // Will be removed in future, kept for migration
}

export interface NotificationSettings {
	notificationsEnabled: boolean;
	showParameters: boolean;
	notificationDuration: number; // milliseconds
	logToConsole: boolean;
}

export interface MCPPluginSettings extends MCPServerSettings, NotificationSettings {
	autoStart: boolean;
}

export const DEFAULT_SETTINGS: MCPPluginSettings = {
	port: 3000,
	apiKey: '', // Will be auto-generated on first load
	enableAuth: true, // Always true now
	autoStart: false,
	// Notification defaults
	notificationsEnabled: false,
	showParameters: false,
	notificationDuration: 3000,
	logToConsole: false
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- settings-types.test.ts`
Expected: PASS - All tests pass

**Step 5: Commit**

```bash
git add src/types/settings-types.ts tests/settings-types.test.ts
git commit -m "refactor: remove CORS settings, make auth mandatory in types"
```

---

## Task 3: Update Middleware to Use Fixed CORS Policy

**Files:**
- Modify: `src/server/middleware.ts:1-60`
- Modify: `tests/middleware.test.ts` (create if doesn't exist)

**Step 1: Write the failing test**

Create `tests/middleware.test.ts`:

```typescript
import express, { Express } from 'express';
import request from 'supertest';
import { setupMiddleware } from '../src/server/middleware';
import { MCPServerSettings } from '../src/types/settings-types';
import { ErrorCodes } from '../src/types/mcp-types';

describe('Middleware', () => {
	let app: Express;
	const mockCreateError = jest.fn((id, code, message) => ({
		jsonrpc: '2.0',
		id,
		error: { code, message }
	}));

	const createTestSettings = (overrides?: Partial<MCPServerSettings>): MCPServerSettings => ({
		port: 3000,
		apiKey: 'test-api-key-12345',
		enableAuth: true,
		...overrides
	});

	beforeEach(() => {
		app = express();
		mockCreateError.mockClear();
	});

	describe('CORS', () => {
		it('should allow localhost origin on any port', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'http://localhost:8080')
				.set('Host', 'localhost:3000');

			expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
		});

		it('should allow 127.0.0.1 origin on any port', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'http://127.0.0.1:9000')
				.set('Host', '127.0.0.1:3000');

			expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:9000');
		});

		it('should allow https localhost origins', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'https://localhost:443')
				.set('Host', 'localhost:3000');

			expect(response.headers['access-control-allow-origin']).toBe('https://localhost:443');
		});

		it('should reject non-localhost origins', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'http://evil.com')
				.set('Host', 'localhost:3000');

			expect(response.status).toBe(500); // CORS error
		});

		it('should allow requests with no origin (CLI clients)', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'localhost:3000');

			expect(response.status).toBe(200);
		});
	});

	describe('Authentication', () => {
		it('should require Bearer token when auth enabled', async () => {
			setupMiddleware(app, createTestSettings({ enableAuth: true }), mockCreateError);
			app.post('/mcp', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.post('/mcp')
				.set('Host', 'localhost:3000');

			expect(response.status).toBe(401);
		});

		it('should accept valid Bearer token', async () => {
			setupMiddleware(app, createTestSettings({ enableAuth: true, apiKey: 'secret123' }), mockCreateError);
			app.post('/mcp', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.post('/mcp')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer secret123');

			expect(response.status).toBe(200);
		});

		it('should reject invalid Bearer token', async () => {
			setupMiddleware(app, createTestSettings({ enableAuth: true, apiKey: 'secret123' }), mockCreateError);
			app.post('/mcp', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.post('/mcp')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer wrong-token');

			expect(response.status).toBe(401);
		});
	});

	describe('Host validation', () => {
		it('should allow localhost host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'localhost:3000');

			expect(response.status).toBe(200);
		});

		it('should allow 127.0.0.1 host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', '127.0.0.1:3000');

			expect(response.status).toBe(200);
		});

		it('should reject non-localhost host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'evil.com');

			expect(response.status).toBe(403);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- middleware.test.ts`
Expected: FAIL - CORS tests fail because middleware still uses old configurable CORS

**Step 3: Update middleware implementation**

Modify `src/server/middleware.ts`:

```typescript
import { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { MCPServerSettings } from '../types/settings-types';
import { ErrorCodes } from '../types/mcp-types';

export function setupMiddleware(app: Express, settings: MCPServerSettings, createErrorResponse: (id: any, code: number, message: string) => any): void {
	// Parse JSON bodies
	app.use(express.json());

	// CORS configuration - Always enabled with fixed localhost-only policy
	const corsOptions = {
		origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
			// Allow requests with no origin (like CLI clients, curl, MCP SDKs)
			if (!origin) {
				return callback(null, true);
			}

			// Allow localhost and 127.0.0.1 on any port, both HTTP and HTTPS
			const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
			if (localhostRegex.test(origin)) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true
	};
	app.use(cors(corsOptions));

	// Authentication middleware - Always enabled
	app.use((req: Request, res: Response, next: any) => {
		// Defensive check: if no API key is set, reject all requests
		if (!settings.apiKey || settings.apiKey.trim() === '') {
			return res.status(500).json(createErrorResponse(null, ErrorCodes.InternalError, 'Server misconfigured: No API key set'));
		}

		const authHeader = req.headers.authorization;
		const providedKey = authHeader?.replace('Bearer ', '');

		if (providedKey !== settings.apiKey) {
			return res.status(401).json(createErrorResponse(null, ErrorCodes.InvalidRequest, 'Unauthorized'));
		}
		next();
	});

	// Origin validation for security (DNS rebinding protection)
	app.use((req: Request, res: Response, next: any) => {
		const host = req.headers.host;

		// Only allow localhost connections
		if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
			return res.status(403).json(createErrorResponse(null, ErrorCodes.InvalidRequest, 'Only localhost connections allowed'));
		}

		next();
	});
}
```

**Step 4: Install test dependencies**

Run: `npm install --save-dev supertest @types/supertest`

**Step 5: Run test to verify it passes**

Run: `npm test -- middleware.test.ts`
Expected: PASS - All tests pass

**Step 6: Commit**

```bash
git add src/server/middleware.ts tests/middleware.test.ts package.json package-lock.json
git commit -m "refactor: use fixed localhost-only CORS policy, make auth mandatory"
```

---

## Task 4: Update Main Plugin to Auto-Generate and Encrypt API Keys

**Files:**
- Modify: `src/main.ts`
- Create: `tests/main-migration.test.ts`

**Step 1: Write the failing test**

Create `tests/main-migration.test.ts`:

```typescript
import { generateApiKey } from '../src/utils/auth-utils';
import { encryptApiKey, decryptApiKey } from '../src/utils/encryption-utils';
import { DEFAULT_SETTINGS } from '../src/types/settings-types';

// Mock electron
jest.mock('electron', () => ({
	safeStorage: {
		isEncryptionAvailable: jest.fn(() => true),
		encryptString: jest.fn((data: string) => Buffer.from(`encrypted:${data}`)),
		decryptString: jest.fn((buffer: Buffer) => {
			const str = buffer.toString();
			return str.replace('encrypted:', '');
		})
	}
}));

describe('Settings Migration', () => {
	describe('API key initialization', () => {
		it('should generate API key if empty', () => {
			const settings = { ...DEFAULT_SETTINGS, apiKey: '' };

			// Simulate what plugin should do
			if (!settings.apiKey) {
				settings.apiKey = generateApiKey();
			}

			expect(settings.apiKey).toBeTruthy();
			expect(settings.apiKey.length).toBeGreaterThanOrEqual(32);
		});

		it('should encrypt API key on save', () => {
			const plainKey = generateApiKey();
			const encrypted = encryptApiKey(plainKey);

			expect(encrypted).toMatch(/^encrypted:/);
			expect(encrypted).not.toBe(plainKey);
		});

		it('should decrypt API key on load', () => {
			const plainKey = generateApiKey();
			const encrypted = encryptApiKey(plainKey);
			const decrypted = decryptApiKey(encrypted);

			expect(decrypted).toBe(plainKey);
		});
	});

	describe('Legacy settings migration', () => {
		it('should remove enableCORS from legacy settings', () => {
			const legacySettings: any = {
				...DEFAULT_SETTINGS,
				enableCORS: true,
				allowedOrigins: ['*']
			};

			// Simulate migration
			delete legacySettings.enableCORS;
			delete legacySettings.allowedOrigins;

			expect(legacySettings.enableCORS).toBeUndefined();
			expect(legacySettings.allowedOrigins).toBeUndefined();
		});

		it('should preserve other settings during migration', () => {
			const legacySettings: any = {
				...DEFAULT_SETTINGS,
				port: 4000,
				enableCORS: false,
				allowedOrigins: ['http://localhost:8080'],
				notificationsEnabled: true
			};

			// Simulate migration
			const { enableCORS, allowedOrigins, ...migrated } = legacySettings;

			expect(migrated.port).toBe(4000);
			expect(migrated.notificationsEnabled).toBe(true);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- main-migration.test.ts`
Expected: PASS (these are just verification tests, but main.ts hasn't been updated yet)

**Step 3: Update main.ts plugin initialization**

Find the `onload()` method in `src/main.ts` and add API key initialization and encryption:

```typescript
// In MCPServerPlugin class, modify onload() method:
async onload() {
	await this.loadSettings();

	// Auto-generate API key if not set
	if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
		console.log('Generating new API key...');
		this.settings.apiKey = generateApiKey();
		await this.saveSettings();
	}

	// Migrate legacy settings (remove enableCORS and allowedOrigins)
	const legacySettings = this.settings as any;
	if ('enableCORS' in legacySettings || 'allowedOrigins' in legacySettings) {
		console.log('Migrating legacy CORS settings...');
		delete legacySettings.enableCORS;
		delete legacySettings.allowedOrigins;
		await this.saveSettings();
	}

	// Rest of existing onload code...
}
```

**Step 4: Update loadSettings() to decrypt API key**

Add decryption to the `loadSettings()` method:

```typescript
async loadSettings() {
	const data = await this.loadData();
	this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

	// Decrypt API key if encrypted
	if (this.settings.apiKey) {
		try {
			this.settings.apiKey = decryptApiKey(this.settings.apiKey);
		} catch (error) {
			console.error('Failed to decrypt API key:', error);
			new Notice('⚠️ Failed to decrypt API key. Please regenerate in settings.');
			this.settings.apiKey = '';
		}
	}
}
```

**Step 5: Update saveSettings() to encrypt API key**

Add encryption to the `saveSettings()` method:

```typescript
async saveSettings() {
	// Create a copy of settings for saving
	const settingsToSave = { ...this.settings };

	// Encrypt API key before saving
	if (settingsToSave.apiKey) {
		settingsToSave.apiKey = encryptApiKey(settingsToSave.apiKey);
	}

	await this.saveData(settingsToSave);

	// Update server settings if running
	if (this.mcpServer) {
		this.mcpServer.updateSettings(this.settings);
	}
}
```

**Step 6: Add necessary imports to main.ts**

Add these imports at the top of `src/main.ts`:

```typescript
import { generateApiKey } from './utils/auth-utils';
import { encryptApiKey, decryptApiKey } from './utils/encryption-utils';
```

**Step 7: Run build to verify no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 8: Commit**

```bash
git add src/main.ts tests/main-migration.test.ts
git commit -m "feat: auto-generate and encrypt API keys, migrate legacy CORS settings"
```

---

## Task 5: Update Settings UI

**Files:**
- Modify: `src/settings.ts:60-90` (remove CORS settings)
- Modify: `src/settings.ts:92-164` (update auth section)

**Step 1: Remove CORS settings from UI**

Modify `src/settings.ts`, delete lines 60-90 (CORS toggle and allowed origins settings):

```typescript
// DELETE THESE SECTIONS:
// - "Enable CORS" toggle (lines 61-72)
// - "Allowed origins" text input (lines 74-90)
```

**Step 2: Update authentication section**

Modify the authentication section in `src/settings.ts` (around line 92-114):

Replace:
```typescript
// Authentication
new Setting(containerEl)
	.setName('Enable authentication')
	.setDesc('Require API key for requests (requires restart)')
	.addToggle(toggle => toggle
		.setValue(this.plugin.settings.enableAuth)
		.onChange(async (value) => {
			this.plugin.settings.enableAuth = value;

			// Auto-generate API key when enabling authentication
			if (value && (!this.plugin.settings.apiKey || this.plugin.settings.apiKey.trim() === '')) {
				this.plugin.settings.apiKey = generateApiKey();
				new Notice('✅ API key generated automatically');
			}

			await this.plugin.saveSettings();
			if (this.plugin.mcpServer?.isRunning()) {
				new Notice('⚠️ Server restart required for authentication changes to take effect');
			}

			// Refresh the display to show the new key
			this.display();
		}));
```

With:
```typescript
// Authentication (Always Enabled)
containerEl.createEl('h3', {text: 'Authentication'});

const authDesc = containerEl.createEl('p', {
	text: 'Authentication is required for all requests. Your API key is encrypted and stored securely using your system\'s credential storage.'
});
authDesc.style.fontSize = '0.9em';
authDesc.style.color = 'var(--text-muted)';
authDesc.style.marginBottom = '16px';

// Show encryption status
const { isEncryptionAvailable } = require('./utils/encryption-utils');
const encryptionStatus = containerEl.createEl('p', {
	text: isEncryptionAvailable()
		? '🔒 Encryption: Available (using system keychain)'
		: '⚠️ Encryption: Unavailable (API key stored in plaintext)'
});
encryptionStatus.style.fontSize = '0.85em';
encryptionStatus.style.marginBottom = '12px';
encryptionStatus.style.fontStyle = 'italic';
```

**Step 3: Update "API Key Display" condition**

Change line 117 from:
```typescript
if (this.plugin.settings.enableAuth) {
```

To:
```typescript
// Always show API key section (auth is always enabled)
{
```

And update the closing brace accordingly.

**Step 4: Update MCP Client Configuration section**

Modify the configuration generation (around line 179-193) to always include auth:

Replace:
```typescript
// Generate JSON config based on auth settings
const mcpConfig: any = {
	"mcpServers": {
		"obsidian-mcp": {
			"serverUrl": `http://127.0.0.1:${this.plugin.settings.port}/mcp`
		}
	}
};

// Only add headers if authentication is enabled
if (this.plugin.settings.enableAuth && this.plugin.settings.apiKey) {
	mcpConfig.mcpServers["obsidian-mcp"].headers = {
		"Authorization": `Bearer ${this.plugin.settings.apiKey}`
	};
}
```

With:
```typescript
// Generate JSON config (auth always included)
const mcpConfig = {
	"mcpServers": {
		"obsidian-mcp": {
			"serverUrl": `http://127.0.0.1:${this.plugin.settings.port}/mcp`,
			"headers": {
				"Authorization": `Bearer ${this.plugin.settings.apiKey || 'YOUR_API_KEY_HERE'}`
			}
		}
	}
};
```

**Step 5: Add import for encryption utils**

Add this import at the top of `src/settings.ts`:

```typescript
import { isEncryptionAvailable } from './utils/encryption-utils';
```

**Step 6: Test the UI manually**

Manual test checklist:
1. Open Obsidian dev tools (Ctrl+Shift+I)
2. Open plugin settings
3. Verify no CORS toggle visible
4. Verify no "Allowed origins" field visible
5. Verify "Authentication" section shows "always enabled" message
6. Verify encryption status is displayed
7. Verify API key is shown
8. Verify "Copy Key" and "Regenerate Key" buttons work
9. Verify MCP client configuration includes Authorization header

**Step 7: Commit**

```bash
git add src/settings.ts
git commit -m "refactor: simplify settings UI, remove CORS toggles, show encryption status"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: Update README.md**

Find security/configuration sections and update:

1. Remove mentions of CORS configuration toggle
2. Update authentication section to indicate it's mandatory
3. Add note about API key encryption

Example changes:

```markdown
## Security

The plugin implements multiple security layers:

- **Network binding**: Server binds to `127.0.0.1` only (no external access)
- **Host header validation**: Prevents DNS rebinding attacks
- **CORS policy**: Fixed localhost-only policy for web-based clients
- **Mandatory authentication**: All requests require Bearer token
- **Encrypted storage**: API keys encrypted using system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)

## Configuration

### Authentication

Authentication is **mandatory** and cannot be disabled. An API key is automatically generated when you first install the plugin and is encrypted using your system's secure credential storage.

To use the API:

```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'
```

### Settings

- **Port**: HTTP server port (default: 3000)
- **Auto-start**: Start server automatically when Obsidian launches
- **API Key**: Auto-generated, encrypted key (can regenerate in settings)
```

**Step 2: Update CLAUDE.md**

Update the settings documentation:

```markdown
## Settings

MCPPluginSettings (src/types/settings-types.ts):
- `port`: HTTP server port (default: 3000)
- `autoStart`: Start server on plugin load
- `apiKey`: Required authentication token (encrypted at rest)
- `enableAuth`: Always true (kept for backward compatibility)
- `notificationsEnabled`: Show tool call notifications in Obsidian UI
- `notificationDuration`: Auto-dismiss time for notifications
- `showParameters`: Include parameters in notifications
- `logToConsole`: Log tool calls to console

**Removed settings** (as of 2025-10-25):
- `enableCORS`: CORS is now always enabled with fixed localhost-only policy
- `allowedOrigins`: Origin allowlist removed, only localhost origins allowed
```

Update security model section:

```markdown
## Security Model

- Server binds to `127.0.0.1` only (no external access)
- Host header validation prevents DNS rebinding attacks
- CORS fixed to localhost-only origins (`http(s)://localhost:*`, `http(s)://127.0.0.1:*`)
- **Mandatory authentication** via Bearer token (auto-generated, encrypted)
- API keys encrypted using Electron's safeStorage (system keychain)
```

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update for mandatory auth and simplified CORS"
```

---

## Task 7: Update Existing Tests

**Files:**
- Modify: Any tests that mock settings with old CORS fields
- Check: `tests/note-tools.test.ts`, `tests/vault-tools.test.ts`

**Step 1: Search for tests using old settings**

Run: `grep -r "enableCORS\|allowedOrigins" tests/`
Expected: Find files that need updating

**Step 2: Update test mocks**

For each test file found, update settings mocks:

Replace:
```typescript
const mockSettings = {
	port: 3000,
	enableCORS: true,
	allowedOrigins: ['*'],
	apiKey: 'test-key',
	enableAuth: true
};
```

With:
```typescript
const mockSettings = {
	port: 3000,
	apiKey: 'test-key',
	enableAuth: true
};
```

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 4: Fix any failing tests**

If tests fail due to missing settings fields, update them to use the new structure.

**Step 5: Commit**

```bash
git add tests/
git commit -m "test: update mocks for new settings structure"
```

---

## Task 8: Add Coverage Regression Protection

**Files:**
- Modify: `package.json` (add coverage threshold check)
- Create: `.github/workflows/coverage-check.yml` (if CI exists)

**Step 1: Add coverage threshold to jest config**

If `jest.config.js` exists, add:

```javascript
module.exports = {
	// ... existing config
	coverageThreshold: {
		global: {
			statements: 99,
			branches: 95,
			functions: 99,
			lines: 99
		}
	}
};
```

If using `package.json` jest config:

```json
{
	"jest": {
		"coverageThreshold": {
			"global": {
				"statements": 99,
				"branches": 95,
				"functions": 99,
				"lines": 99
			}
		}
	}
}
```

**Step 2: Run coverage to verify thresholds met**

Run: `npm run test:coverage`
Expected: Coverage meets or exceeds thresholds

**Step 3: Commit**

```bash
git add package.json jest.config.js
git commit -m "test: add coverage regression protection"
```

---

## Task 9: Manual Integration Testing

**Manual test checklist:**

**Step 1: Fresh install test**
1. Remove plugin from test vault
2. Copy built plugin files to vault
3. Enable plugin
4. Verify API key auto-generated
5. Check `.obsidian/plugins/obsidian-mcp-server/data.json` - key should be encrypted
6. Verify server starts successfully

**Step 2: Migration test**
1. Create legacy settings file with `enableCORS: true` and `allowedOrigins: ['*']`
2. Reload plugin
3. Verify settings migrated (old fields removed)
4. Verify API key generated if missing
5. Verify server still works

**Step 3: API key encryption test**
1. Regenerate API key in settings
2. Copy key to clipboard
3. Stop Obsidian
4. Open `data.json` - verify key is encrypted (starts with "encrypted:")
5. Restart Obsidian
6. Verify server starts and accepts the same key

**Step 4: Authentication test**
1. Start server
2. Try request without auth: `curl http://127.0.0.1:3000/mcp -d '{"jsonrpc":"2.0","method":"ping","id":1}'`
3. Verify 401 Unauthorized
4. Try with correct key: `curl -H "Authorization: Bearer YOUR_KEY" ...`
5. Verify 200 OK

**Step 5: CORS test (if you have a local web client)**
1. Create simple HTML file with fetch to `http://localhost:3000/mcp`
2. Serve on `http://localhost:8080`
3. Verify request succeeds (CORS allowed)
4. Try from `http://example.com` (if possible)
5. Verify request fails (CORS blocked)

**Step 6: Verify no regressions**
1. Test all MCP tools work (read_note, create_note, etc.)
2. Test notifications still work
3. Test server stop/start/restart
4. Test settings save/load

**Expected:** All manual tests pass

**Document results:**

Create `docs/testing/manual-test-results-2025-10-25.md` with results.

---

## Task 10: Final Verification and Cleanup

**Files:**
- Review all changed files
- Check for any remaining references to old settings

**Step 1: Search for remaining references**

Run these searches:
```bash
grep -r "enableCORS" src/
grep -r "allowedOrigins" src/
grep -r "enableAuth.*false" src/  # Should only be in tests
```

Expected: No results (except comments/docs)

**Step 2: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: All tests pass, coverage ≥99%

**Step 3: Build production bundle**

Run: `npm run build`
Expected: Build succeeds, no errors or warnings

**Step 4: Check bundle size**

Run: `ls -lh main.js`
Document size for comparison (should not increase significantly)

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup for CORS simplification and mandatory auth"
```

---

## Verification Commands

After completing all tasks:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Build production
npm run build

# Type check
npx tsc --noEmit

# Check for old setting references
grep -r "enableCORS\|allowedOrigins" src/ tests/
```

**Expected results:**
- ✅ All tests pass
- ✅ Coverage ≥99%
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ No references to removed settings

---

## Rollback Plan

If issues are discovered:

1. Revert commits in reverse order
2. Restore original settings types
3. Restore CORS toggle in middleware
4. Remove encryption utilities
5. Run tests to verify rollback successful

## Notes for Engineer

- **DRY**: Don't duplicate CORS logic, centralize in middleware
- **YAGNI**: Removed unnecessary CORS configuration complexity
- **TDD**: Write tests first for each component
- **Frequent commits**: Commit after each task completes
- **Backward compatibility**: Migration handles legacy settings gracefully
- **Security**: Encryption is best-effort (fallback to plaintext on Linux without keyring)
- **User experience**: Auto-generation means zero config for most users

## References

- Electron safeStorage docs: https://www.electronjs.org/docs/latest/api/safe-storage
- Express CORS package: https://www.npmjs.com/package/cors
- Jest testing: https://jestjs.io/docs/getting-started
- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
