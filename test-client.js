#!/usr/bin/env node

/**
 * Test client for Obsidian MCP Server
 * Usage: node test-client.js [port] [api-key]
 */

const http = require('http');

const PORT = process.argv[2] || 3000;
const API_KEY = process.argv[3] || '';

function makeRequest(method, params = {}) {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify({
			jsonrpc: "2.0",
			id: Date.now(),
			method,
			params
		});

		const options = {
			hostname: '127.0.0.1',
			port: PORT,
			path: '/mcp',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		};

		if (API_KEY) {
			options.headers['Authorization'] = `Bearer ${API_KEY}`;
		}

		const req = http.request(options, (res) => {
			let body = '';
			res.on('data', (chunk) => body += chunk);
			res.on('end', () => {
				try {
					resolve(JSON.parse(body));
				} catch (e) {
					reject(new Error(`Failed to parse response: ${body}`));
				}
			});
		});

		req.on('error', reject);
		req.write(data);
		req.end();
	});
}

async function runTests() {
	console.log('🧪 Testing Obsidian MCP Server\n');
	console.log(`Server: http://127.0.0.1:${PORT}/mcp`);
	console.log(`API Key: ${API_KEY ? '***' : 'None'}\n`);

	try {
		// Test 1: Initialize
		console.log('1️⃣  Testing initialize...');
		const initResponse = await makeRequest('initialize', {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: {
				name: "test-client",
				version: "1.0.0"
			}
		});
		console.log('✅ Initialize successful');
		console.log('   Server:', initResponse.result.serverInfo.name, initResponse.result.serverInfo.version);
		console.log('   Protocol:', initResponse.result.protocolVersion);
		console.log();

		// Test 2: List tools
		console.log('2️⃣  Testing tools/list...');
		const toolsResponse = await makeRequest('tools/list');
		console.log('✅ Tools list successful');
		console.log(`   Found ${toolsResponse.result.tools.length} tools:`);
		toolsResponse.result.tools.forEach(tool => {
			console.log(`   - ${tool.name}: ${tool.description}`);
		});
		console.log();

		// Test 3: Get vault info
		console.log('3️⃣  Testing get_vault_info...');
		const vaultResponse = await makeRequest('tools/call', {
			name: 'get_vault_info',
			arguments: {}
		});
		console.log('✅ Vault info successful');
		const vaultInfo = JSON.parse(vaultResponse.result.content[0].text);
		console.log('   Vault:', vaultInfo.name);
		console.log('   Total files:', vaultInfo.totalFiles);
		console.log('   Markdown files:', vaultInfo.markdownFiles);
		console.log();

		// Test 4: List notes
		console.log('4️⃣  Testing list_notes...');
		const listResponse = await makeRequest('tools/call', {
			name: 'list_notes',
			arguments: {}
		});
		console.log('✅ List notes successful');
		const firstLine = listResponse.result.content[0].text.split('\n')[0];
		console.log('   ' + firstLine);
		console.log();

		// Test 5: Ping
		console.log('5️⃣  Testing ping...');
		const pingResponse = await makeRequest('ping');
		console.log('✅ Ping successful');
		console.log();

		console.log('🎉 All tests passed!');

	} catch (error) {
		console.error('❌ Test failed:', error.message);
		process.exit(1);
	}
}

// Check if server is running first
http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
	if (res.statusCode === 200) {
		runTests();
	} else {
		console.error('❌ Server health check failed');
		process.exit(1);
	}
}).on('error', () => {
	console.error('❌ Cannot connect to server. Is it running?');
	console.error(`   Try: http://127.0.0.1:${PORT}/health`);
	process.exit(1);
});
