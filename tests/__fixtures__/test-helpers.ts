/**
 * Shared test fixtures and helper functions
 */

import { JSONRPCRequest, JSONRPCResponse } from '../../src/types/mcp-types';

/**
 * Create a mock JSON-RPC request
 */
export function createMockRequest(
	method: string,
	params?: any,
	id: string | number = 1
): JSONRPCRequest {
	return {
		jsonrpc: '2.0',
		id,
		method,
		params: params || {}
	};
}

/**
 * Create a mock Express Request object
 */
export function createMockExpressRequest(body: any = {}): any {
	return {
		body,
		headers: {
			host: '127.0.0.1:3000',
			authorization: 'Bearer test-api-key'
		},
		get: function(header: string) {
			return this.headers[header.toLowerCase()];
		}
	};
}

/**
 * Create a mock Express Response object
 */
export function createMockExpressResponse(): any {
	const res: any = {
		statusCode: 200,
		headers: {},
		body: null,
		status: jest.fn(function(code: number) {
			this.statusCode = code;
			return this;
		}),
		json: jest.fn(function(data: any) {
			this.body = data;
			return this;
		}),
		set: jest.fn(function(field: string, value: string) {
			this.headers[field] = value;
			return this;
		}),
		get: jest.fn(function(field: string) {
			return this.headers[field];
		})
	};
	return res;
}

/**
 * Create a mock Express Next function
 */
export function createMockNext(): jest.Mock {
	return jest.fn();
}

/**
 * Verify a JSON-RPC response structure
 */
export function expectValidJSONRPCResponse(response: JSONRPCResponse): void {
	expect(response).toHaveProperty('jsonrpc', '2.0');
	expect(response).toHaveProperty('id');
	expect(response.id !== undefined).toBe(true);

	// Should have either result or error, but not both
	if ('result' in response) {
		expect(response).not.toHaveProperty('error');
	} else {
		expect(response).toHaveProperty('error');
		expect(response.error).toHaveProperty('code');
		expect(response.error).toHaveProperty('message');
	}
}

/**
 * Verify a JSON-RPC error response
 */
export function expectJSONRPCError(
	response: JSONRPCResponse,
	expectedCode: number,
	messagePattern?: string | RegExp
): void {
	expectValidJSONRPCResponse(response);
	expect(response).toHaveProperty('error');
	expect(response.error!.code).toBe(expectedCode);

	if (messagePattern) {
		if (typeof messagePattern === 'string') {
			expect(response.error!.message).toContain(messagePattern);
		} else {
			expect(response.error!.message).toMatch(messagePattern);
		}
	}
}

/**
 * Verify a JSON-RPC success response
 */
export function expectJSONRPCSuccess(
	response: JSONRPCResponse,
	expectedResult?: any
): void {
	expectValidJSONRPCResponse(response);
	expect(response).toHaveProperty('result');

	if (expectedResult !== undefined) {
		expect(response.result).toEqual(expectedResult);
	}
}

/**
 * Create mock tool call arguments for testing
 */
export const mockToolArgs = {
	read_note: {
		path: 'test.md',
		parseFrontmatter: false
	},
	create_note: {
		path: 'new.md',
		content: 'Test content'
	},
	update_note: {
		path: 'test.md',
		content: 'Updated content'
	},
	delete_note: {
		path: 'test.md',
		soft: true
	},
	search: {
		query: 'test',
		isRegex: false
	},
	list: {
		path: '',
		recursive: false
	},
	stat: {
		path: 'test.md'
	},
	exists: {
		path: 'test.md'
	}
};

/**
 * Wait for a promise to resolve (useful for testing async operations)
 */
export function waitFor(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock CallToolResult
 */
export function createMockToolResult(isError: boolean = false, text: string = 'Success'): any {
	return {
		content: [{ type: 'text', text }],
		isError
	};
}
