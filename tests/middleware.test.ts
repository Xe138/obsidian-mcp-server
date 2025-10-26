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
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
		});

		it('should allow 127.0.0.1 origin on any port', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'http://127.0.0.1:9000')
				.set('Host', '127.0.0.1:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:9000');
		});

		it('should allow https localhost origins', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'https://localhost:443')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.headers['access-control-allow-origin']).toBe('https://localhost:443');
		});

		it('should reject non-localhost origins', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Origin', 'http://evil.com')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.status).toBe(500); // CORS error
		});

		it('should allow requests with no origin (CLI clients)', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

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

		it('should reject requests when API key is empty', async () => {
			setupMiddleware(app, createTestSettings({ apiKey: '' }), mockCreateError);
			app.post('/mcp', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.post('/mcp')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer any-token');

			expect(response.status).toBe(500);
			expect(response.body.error.message).toContain('No API key set');
		});
	});

	describe('Host validation', () => {
		it('should allow localhost host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'localhost:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.status).toBe(200);
		});

		it('should allow 127.0.0.1 host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', '127.0.0.1:3000')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.status).toBe(200);
		});

		it('should reject non-localhost host header', async () => {
			setupMiddleware(app, createTestSettings(), mockCreateError);
			app.get('/test', (req, res) => res.json({ ok: true }));

			const response = await request(app)
				.get('/test')
				.set('Host', 'evil.com')
				.set('Authorization', 'Bearer test-api-key-12345');

			expect(response.status).toBe(403);
		});
	});
});
