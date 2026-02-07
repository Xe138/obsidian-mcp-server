import { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import { MCPServerSettings } from '../types/settings-types';
import { ErrorCodes, JSONRPCResponse } from '../types/mcp-types';
import { parseAllowedIPs, isIPAllowed } from '../utils/network-utils';

export function setupMiddleware(app: Express, settings: MCPServerSettings, createErrorResponse: (id: string | number | null, code: number, message: string) => JSONRPCResponse): void {
	const allowList = parseAllowedIPs(settings.allowedIPs);

	// Parse JSON bodies
	app.use(express.json());

	// Source IP validation - reject connections from unlisted IPs before any other checks
	app.use((req: Request, res: Response, next: NextFunction) => {
		const remoteAddress = req.socket.remoteAddress;
		if (remoteAddress && !isIPAllowed(remoteAddress, allowList)) {
			return res.status(403).json(createErrorResponse(null, ErrorCodes.InvalidRequest, 'Connection from this IP is not allowed'));
		}
		next();
	});

	// CORS configuration
	const corsOptions = {
		origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
			// Allow requests with no origin (like CLI clients, curl, MCP SDKs)
			if (!origin) {
				return callback(null, true);
			}

			// Allow localhost and 127.0.0.1 on any port, both HTTP and HTTPS
			const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
			if (localhostRegex.test(origin)) {
				return callback(null, true);
			}

			// Check if origin hostname is in the allow-list
			if (allowList.length > 0) {
				try {
					const url = new URL(origin);
					if (isIPAllowed(url.hostname, allowList)) {
						return callback(null, true);
					}
				} catch {
					// Invalid origin URL, fall through to reject
				}
			}

			callback(new Error('Not allowed by CORS'));
		},
		credentials: true
	};
	app.use(cors(corsOptions));

	// Authentication middleware - Always enabled
	app.use((req: Request, res: Response, next: NextFunction) => {
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

	// Host header validation for security (DNS rebinding protection)
	app.use((req: Request, res: Response, next: NextFunction) => {
		const host = req.headers.host;

		if (!host) {
			return next();
		}

		// Strip port from host header
		const hostname = host.split(':')[0];

		// Always allow localhost
		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			return next();
		}

		// Check against allow-list
		if (allowList.length > 0 && isIPAllowed(hostname, allowList)) {
			return next();
		}

		return res.status(403).json(createErrorResponse(null, ErrorCodes.InvalidRequest, 'Connection from this host is not allowed'));
	});
}
