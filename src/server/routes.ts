import { Express, Request, Response } from 'express';
import { JSONRPCRequest, JSONRPCResponse, ErrorCodes } from '../types/mcp-types';

export function setupRoutes(
	app: Express,
	handleRequest: (request: JSONRPCRequest) => Promise<JSONRPCResponse>,
	createErrorResponse: (id: string | number | null, code: number, message: string) => JSONRPCResponse
): void {
	// Main MCP endpoint
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

	// Health check endpoint
	app.get('/health', (_req: Request, res: Response) => {
		res.json({ status: 'ok', timestamp: Date.now() });
	});
}
