import { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { MCPServerSettings } from '../types/settings-types';
import { ErrorCodes } from '../types/mcp-types';

export function setupMiddleware(app: Express, settings: MCPServerSettings, createErrorResponse: (id: any, code: number, message: string) => any): void {
	// Parse JSON bodies
	app.use(express.json());

	// CORS configuration
	if (settings.enableCORS) {
		const corsOptions = {
			origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
				// Allow requests with no origin (like mobile apps or curl requests)
				if (!origin) return callback(null, true);
				
				if (settings.allowedOrigins.includes('*') || 
					settings.allowedOrigins.includes(origin)) {
					callback(null, true);
				} else {
					callback(new Error('Not allowed by CORS'));
				}
			},
			credentials: true
		};
		app.use(cors(corsOptions));
	}

	// Authentication middleware
	if (settings.enableAuth) {
		app.use((req: Request, res: Response, next: any) => {
			// Defensive check: if auth is enabled but no API key is set, reject all requests
			if (!settings.apiKey || settings.apiKey.trim() === '') {
				return res.status(500).json(createErrorResponse(null, ErrorCodes.InternalError, 'Server misconfigured: Authentication enabled but no API key set'));
			}
			
			const authHeader = req.headers.authorization;
			const apiKey = authHeader?.replace('Bearer ', '');
			
			if (apiKey !== settings.apiKey) {
				return res.status(401).json(createErrorResponse(null, ErrorCodes.InvalidRequest, 'Unauthorized'));
			}
			next();
		});
	}

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
