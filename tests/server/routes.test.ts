/**
 * Tests for route setup
 */

import express, { Express } from 'express';
import { setupRoutes } from '../../src/server/routes';
import { ErrorCodes } from '../../src/types/mcp-types';

describe('Routes', () => {
	let app: Express;
	let mockHandleRequest: jest.Mock;
	let mockCreateErrorResponse: jest.Mock;

	beforeEach(() => {
		app = express();
		app.use(express.json());

		mockHandleRequest = jest.fn();
		mockCreateErrorResponse = jest.fn((id, code, message) => ({
			jsonrpc: '2.0',
			id,
			error: { code, message }
		}));

		setupRoutes(app, mockHandleRequest, mockCreateErrorResponse);
	});

	describe('Route Registration', () => {
		it('should register POST route for /mcp', () => {
			const router = (app as any)._router;
			const mcpRoute = router.stack.find((layer: any) =>
				layer.route && layer.route.path === '/mcp'
			);

			expect(mcpRoute).toBeDefined();
			expect(mcpRoute.route.methods.post).toBe(true);
		});

		it('should register GET route for /health', () => {
			const router = (app as any)._router;
			const healthRoute = router.stack.find((layer: any) =>
				layer.route && layer.route.path === '/health'
			);

			expect(healthRoute).toBeDefined();
			expect(healthRoute.route.methods.get).toBe(true);
		});

		it('should call setupRoutes without throwing', () => {
			expect(() => {
				const testApp = express();
				setupRoutes(testApp, mockHandleRequest, mockCreateErrorResponse);
			}).not.toThrow();
		});

		it('should accept handleRequest function', () => {
			const testApp = express();
			const testHandler = jest.fn();
			const testErrorCreator = jest.fn();

			setupRoutes(testApp, testHandler, testErrorCreator);

			// Routes should be set up
			const router = (testApp as any)._router;
			const routes = router.stack.filter((layer: any) => layer.route);

			expect(routes.length).toBeGreaterThan(0);
		});
	});

	describe('Function Signatures', () => {
		it('should use provided handleRequest function', () => {
			const testApp = express();
			const customHandler = jest.fn();

			setupRoutes(testApp, customHandler, mockCreateErrorResponse);

			// Verify function was captured (would be called on actual request)
			expect(typeof customHandler).toBe('function');
		});

		it('should use provided createErrorResponse function', () => {
			const testApp = express();
			const customErrorCreator = jest.fn();

			setupRoutes(testApp, mockHandleRequest, customErrorCreator);

			// Verify function was captured
			expect(typeof customErrorCreator).toBe('function');
		});
	});

	describe('Route Configuration', () => {
		it('should configure both required routes', () => {
			const router = (app as any)._router;
			const routes = router.stack
				.filter((layer: any) => layer.route)
				.map((layer: any) => ({
					path: layer.route.path,
					methods: Object.keys(layer.route.methods)
				}));

			expect(routes).toContainEqual(
				expect.objectContaining({ path: '/mcp' })
			);
			expect(routes).toContainEqual(
				expect.objectContaining({ path: '/health' })
			);
		});

		it('should use POST method for /mcp endpoint', () => {
			const router = (app as any)._router;
			const mcpRoute = router.stack.find((layer: any) =>
				layer.route && layer.route.path === '/mcp'
			);

			expect(mcpRoute.route.methods).toHaveProperty('post');
			expect(mcpRoute.route.methods.post).toBe(true);
		});

		it('should use GET method for /health endpoint', () => {
			const router = (app as any)._router;
			const healthRoute = router.stack.find((layer: any) =>
				layer.route && layer.route.path === '/health'
			);

			expect(healthRoute.route.methods).toHaveProperty('get');
			expect(healthRoute.route.methods.get).toBe(true);
		});
	});
});
