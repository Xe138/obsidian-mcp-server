/**
 * Unit tests for network-utils
 */

import { parseAllowedIPs, isIPAllowed, AllowedIPEntry } from '../src/utils/network-utils';

describe('parseAllowedIPs', () => {
	test('should return empty array for empty string', () => {
		expect(parseAllowedIPs('')).toEqual([]);
	});

	test('should return empty array for whitespace-only string', () => {
		expect(parseAllowedIPs('   ')).toEqual([]);
	});

	test('should parse a single IP', () => {
		const result = parseAllowedIPs('192.168.1.1');
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('ip');
	});

	test('should parse multiple comma-separated IPs', () => {
		const result = parseAllowedIPs('192.168.1.1, 10.0.0.5');
		expect(result).toHaveLength(2);
	});

	test('should parse CIDR notation', () => {
		const result = parseAllowedIPs('100.64.0.0/10');
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('cidr');
	});

	test('should parse mixed IPs and CIDRs', () => {
		const result = parseAllowedIPs('192.168.1.1, 10.0.0.0/8, 172.16.0.5');
		expect(result).toHaveLength(3);
		expect(result[0].type).toBe('ip');
		expect(result[1].type).toBe('cidr');
		expect(result[2].type).toBe('ip');
	});

	test('should handle extra whitespace', () => {
		const result = parseAllowedIPs('  192.168.1.1 ,  10.0.0.5  ');
		expect(result).toHaveLength(2);
	});

	test('should skip invalid entries', () => {
		const result = parseAllowedIPs('192.168.1.1, invalid, 10.0.0.5');
		expect(result).toHaveLength(2);
	});

	test('should skip invalid CIDR prefix', () => {
		const result = parseAllowedIPs('10.0.0.0/33');
		expect(result).toHaveLength(0);
	});

	test('should skip entries with invalid octets', () => {
		const result = parseAllowedIPs('256.0.0.1');
		expect(result).toHaveLength(0);
	});

	test('should handle trailing commas', () => {
		const result = parseAllowedIPs('192.168.1.1,');
		expect(result).toHaveLength(1);
	});
});

describe('isIPAllowed', () => {
	test('should always allow 127.0.0.1 with empty list', () => {
		expect(isIPAllowed('127.0.0.1', [])).toBe(true);
	});

	test('should always allow localhost with empty list', () => {
		expect(isIPAllowed('localhost', [])).toBe(true);
	});

	test('should always allow IPv4-mapped localhost', () => {
		expect(isIPAllowed('::ffff:127.0.0.1', [])).toBe(true);
	});

	test('should reject non-localhost with empty list', () => {
		expect(isIPAllowed('192.168.1.1', [])).toBe(false);
	});

	test('should match exact IP', () => {
		const allowList = parseAllowedIPs('192.168.1.50');
		expect(isIPAllowed('192.168.1.50', allowList)).toBe(true);
		expect(isIPAllowed('192.168.1.51', allowList)).toBe(false);
	});

	test('should match CIDR range', () => {
		const allowList = parseAllowedIPs('10.0.0.0/8');
		expect(isIPAllowed('10.0.0.1', allowList)).toBe(true);
		expect(isIPAllowed('10.255.255.255', allowList)).toBe(true);
		expect(isIPAllowed('11.0.0.1', allowList)).toBe(false);
	});

	test('should match Tailscale CGNAT range (100.64.0.0/10)', () => {
		const allowList = parseAllowedIPs('100.64.0.0/10');
		expect(isIPAllowed('100.64.0.1', allowList)).toBe(true);
		expect(isIPAllowed('100.100.50.25', allowList)).toBe(true);
		expect(isIPAllowed('100.127.255.255', allowList)).toBe(true);
		expect(isIPAllowed('100.128.0.0', allowList)).toBe(false);
		expect(isIPAllowed('100.63.255.255', allowList)).toBe(false);
	});

	test('should handle IPv4-mapped IPv6 addresses', () => {
		const allowList = parseAllowedIPs('192.168.1.50');
		expect(isIPAllowed('::ffff:192.168.1.50', allowList)).toBe(true);
		expect(isIPAllowed('::ffff:192.168.1.51', allowList)).toBe(false);
	});

	test('should handle IPv4-mapped IPv6 with CIDR', () => {
		const allowList = parseAllowedIPs('10.0.0.0/8');
		expect(isIPAllowed('::ffff:10.5.3.1', allowList)).toBe(true);
		expect(isIPAllowed('::ffff:11.0.0.1', allowList)).toBe(false);
	});

	test('should match against multiple entries', () => {
		const allowList = parseAllowedIPs('192.168.1.0/24, 10.0.0.5');
		expect(isIPAllowed('192.168.1.100', allowList)).toBe(true);
		expect(isIPAllowed('10.0.0.5', allowList)).toBe(true);
		expect(isIPAllowed('10.0.0.6', allowList)).toBe(false);
	});

	test('should handle /32 CIDR as single IP', () => {
		const allowList = parseAllowedIPs('192.168.1.1/32');
		expect(isIPAllowed('192.168.1.1', allowList)).toBe(true);
		expect(isIPAllowed('192.168.1.2', allowList)).toBe(false);
	});

	test('should handle /0 CIDR as allow-all', () => {
		const allowList = parseAllowedIPs('0.0.0.0/0');
		expect(isIPAllowed('1.2.3.4', allowList)).toBe(true);
		expect(isIPAllowed('255.255.255.255', allowList)).toBe(true);
	});

	test('should return false for invalid IP input', () => {
		const allowList = parseAllowedIPs('10.0.0.0/8');
		expect(isIPAllowed('not-an-ip', allowList)).toBe(false);
	});
});
