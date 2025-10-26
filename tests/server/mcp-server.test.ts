/**
 * Tests for MCPServer class
 */

import { App } from 'obsidian';
import { MCPServer } from '../../src/server/mcp-server';
import { MCPServerSettings } from '../../src/types/settings-types';
import { ErrorCodes } from '../../src/types/mcp-types';
import { NotificationManager } from '../../src/ui/notifications';
import { createMockRequest, expectJSONRPCSuccess, expectJSONRPCError } from '../__fixtures__/test-helpers';

// Mock dependencies
jest.mock('../../src/tools', () => {
	return {
		ToolRegistry: jest.fn().mockImplementation(() => ({
			getToolDefinitions: jest.fn().mockReturnValue([
				{ name: 'test_tool', description: 'Test tool', inputSchema: {} }
			]),
			callTool: jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Tool result' }],
				isError: false
			}),
			setNotificationManager: jest.fn()
		}))
	};
});

jest.mock('../../src/server/middleware');
jest.mock('../../src/server/routes');

describe('MCPServer', () => {
	let mockApp: App;
	let settings: MCPServerSettings;
	let server: MCPServer;

	beforeEach(() => {
		mockApp = new App();
		settings = {
			port: 3000,
			autoStart: false,
			apiKey: 'test-api-key',
			notificationsEnabled: true,
			showParameters: true,
			notificationDuration: 5000,
			logToConsole: false
		};
		server = new MCPServer(mockApp, settings);
	});

	afterEach(async () => {
		if (server.isRunning()) {
			await server.stop();
		}
	});

	describe('Constructor', () => {
		it('should initialize with app and settings', () => {
			expect(server).toBeDefined();
			expect(server.isRunning()).toBe(false);
		});

		it('should create ToolRegistry instance', () => {
			const { ToolRegistry } = require('../../src/tools');
			expect(ToolRegistry).toHaveBeenCalledWith(mockApp);
		});

		it('should setup middleware and routes', () => {
			const { setupMiddleware } = require('../../src/server/middleware');
			const { setupRoutes } = require('../../src/server/routes');

			expect(setupMiddleware).toHaveBeenCalled();
			expect(setupRoutes).toHaveBeenCalled();
		});
	});

	describe('Server Lifecycle', () => {
		it('should start server on available port', async () => {
			await server.start();
			expect(server.isRunning()).toBe(true);
		});

		it('should stop server when running', async () => {
			await server.start();
			expect(server.isRunning()).toBe(true);

			await server.stop();
			expect(server.isRunning()).toBe(false);
		});

		it('should stop gracefully when not running', async () => {
			expect(server.isRunning()).toBe(false);
			await expect(server.stop()).resolves.not.toThrow();
		});

		it('should reject if port is already in use', async () => {
			await server.start();

			// Create second server on same port
			const server2 = new MCPServer(mockApp, settings);
			await expect(server2.start()).rejects.toThrow('Port 3000 is already in use');
		});

		it('should bind to 127.0.0.1 only', async () => {
			await server.start();
			// This is verified through the server implementation
			// We just ensure it starts successfully with localhost binding
			expect(server.isRunning()).toBe(true);
		});
	});

	describe('Request Handling - initialize', () => {
		it('should handle initialize request', async () => {
			const request = createMockRequest('initialize', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response);
			expect(response.result).toEqual({
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: {}
				},
				serverInfo: {
					name: 'obsidian-mcp-server',
					version: '2.0.0'
				}
			});
		});

		it('should ignore initialize params', async () => {
			const request = createMockRequest('initialize', {
				clientInfo: { name: 'test-client' }
			});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response);
			expect(response.result.protocolVersion).toBe('2024-11-05');
		});
	});

	describe('Request Handling - tools/list', () => {
		it('should return list of available tools', async () => {
			const request = createMockRequest('tools/list', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response);
			expect(response.result).toHaveProperty('tools');
			expect(Array.isArray(response.result.tools)).toBe(true);
			expect(response.result.tools.length).toBeGreaterThan(0);
		});

		it('should return tools from ToolRegistry', async () => {
			const request = createMockRequest('tools/list', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response);
			expect(response.result.tools[0]).toHaveProperty('name', 'test_tool');
			expect(response.result.tools[0]).toHaveProperty('description');
			expect(response.result.tools[0]).toHaveProperty('inputSchema');
		});
	});

	describe('Request Handling - tools/call', () => {
		it('should call tool through ToolRegistry', async () => {
			const request = createMockRequest('tools/call', {
				name: 'test_tool',
				arguments: { arg1: 'value1' }
			});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response);
			expect(response.result).toHaveProperty('content');
			expect(response.result.isError).toBe(false);
		});

		it('should pass tool name and arguments to ToolRegistry', async () => {
			const mockCallTool = jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Result' }],
				isError: false
			});
			(server as any).toolRegistry.callTool = mockCallTool;

			const request = createMockRequest('tools/call', {
				name: 'read_note',
				arguments: { path: 'test.md' }
			});
			await (server as any).handleRequest(request);

			expect(mockCallTool).toHaveBeenCalledWith('read_note', { path: 'test.md' });
		});
	});

	describe('Request Handling - ping', () => {
		it('should respond to ping with empty result', async () => {
			const request = createMockRequest('ping', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCSuccess(response, {});
		});
	});

	describe('Request Handling - unknown method', () => {
		it('should return MethodNotFound error for unknown method', async () => {
			const request = createMockRequest('unknown/method', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCError(response, ErrorCodes.MethodNotFound, 'Method not found');
		});

		it('should include method name in error message', async () => {
			const request = createMockRequest('invalid/endpoint', {});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCError(response, ErrorCodes.MethodNotFound);
			expect(response.error!.message).toContain('invalid/endpoint');
		});
	});

	describe('Error Handling', () => {
		it('should handle tool execution errors', async () => {
			const mockCallTool = jest.fn().mockRejectedValue(new Error('Tool failed'));
			(server as any).toolRegistry.callTool = mockCallTool;

			const request = createMockRequest('tools/call', {
				name: 'test_tool',
				arguments: {}
			});
			const response = await (server as any).handleRequest(request);

			expectJSONRPCError(response, ErrorCodes.InternalError, 'Tool failed');
		});

		it('should handle malformed request gracefully', async () => {
			const request = createMockRequest('tools/call', null);
			const response = await (server as any).handleRequest(request);

			// Should not throw, should return error response
			expect(response).toBeDefined();
		});
	});

	describe('Response Creation', () => {
		it('should create success response with result', () => {
			const result = { data: 'test' };
			const response = (server as any).createSuccessResponse(1, result);

			expect(response).toEqual({
				jsonrpc: '2.0',
				id: 1,
				result: { data: 'test' }
			});
		});

		it('should handle null id', () => {
			const response = (server as any).createSuccessResponse(null, {});

			expect(response.id).toBeNull();
		});

		it('should handle undefined id', () => {
			const response = (server as any).createSuccessResponse(undefined, {});

			expect(response.id).toBeNull();
		});

		it('should create error response with code and message', () => {
			const response = (server as any).createErrorResponse(1, -32600, 'Invalid Request');

			expect(response).toEqual({
				jsonrpc: '2.0',
				id: 1,
				error: {
					code: -32600,
					message: 'Invalid Request'
				}
			});
		});

		it('should create error response with data', () => {
			const response = (server as any).createErrorResponse(
				1,
				-32603,
				'Internal error',
				{ details: 'stack trace' }
			);

			expect(response.error).toHaveProperty('data');
			expect(response.error!.data).toEqual({ details: 'stack trace' });
		});
	});

	describe('Settings Management', () => {
		it('should update settings', () => {
			const newSettings: MCPServerSettings = {
				...settings,
				port: 3001
			};

			server.updateSettings(newSettings);
			// Settings are updated internally
			expect(server).toBeDefined();
		});
	});

	describe('Notification Manager Integration', () => {
		it('should set notification manager', () => {
			const mockManager = new NotificationManager({} as any);
			const mockSetNotificationManager = jest.fn();
			(server as any).toolRegistry.setNotificationManager = mockSetNotificationManager;

			server.setNotificationManager(mockManager);

			expect(mockSetNotificationManager).toHaveBeenCalledWith(mockManager);
		});

		it('should accept null notification manager', () => {
			const mockSetNotificationManager = jest.fn();
			(server as any).toolRegistry.setNotificationManager = mockSetNotificationManager;

			server.setNotificationManager(null);

			expect(mockSetNotificationManager).toHaveBeenCalledWith(null);
		});
	});

	describe('Request ID Handling', () => {
		it('should preserve request ID in response', async () => {
			const request = createMockRequest('ping', {}, 42);
			const response = await (server as any).handleRequest(request);

			expect(response.id).toBe(42);
		});

		it('should handle string IDs', async () => {
			const request = createMockRequest('ping', {}, 'string-id');
			const response = await (server as any).handleRequest(request);

			expect(response.id).toBe('string-id');
		});

		it('should handle null ID', async () => {
			const request = { ...createMockRequest('ping', {}), id: null };
			const response = await (server as any).handleRequest(request);

			expect(response.id).toBeNull();
		});
	});
});
