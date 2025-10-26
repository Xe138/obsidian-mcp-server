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
