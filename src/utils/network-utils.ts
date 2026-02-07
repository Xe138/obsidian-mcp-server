export interface AllowedIPEntry {
	type: 'ip' | 'cidr';
	ip: number; // 32-bit numeric IPv4
	mask: number; // 32-bit subnet mask (only for CIDR)
}

/**
 * Convert dotted IPv4 string to 32-bit number.
 * Returns null if invalid.
 */
function ipToNumber(ip: string): number | null {
	const parts = ip.split('.');
	if (parts.length !== 4) return null;
	let num = 0;
	for (const part of parts) {
		const octet = parseInt(part, 10);
		if (isNaN(octet) || octet < 0 || octet > 255) return null;
		num = (num << 8) | octet;
	}
	return num >>> 0; // Ensure unsigned
}

/**
 * Strip IPv4-mapped IPv6 prefix (::ffff:) if present.
 */
function normalizeIP(ip: string): string {
	if (ip.startsWith('::ffff:')) {
		return ip.slice(7);
	}
	return ip;
}

/**
 * Parse a comma-separated string of IPs and CIDRs into structured entries.
 * Invalid entries are silently skipped.
 */
export function parseAllowedIPs(setting: string): AllowedIPEntry[] {
	if (!setting || !setting.trim()) return [];

	const entries: AllowedIPEntry[] = [];
	for (const raw of setting.split(',')) {
		const trimmed = raw.trim();
		if (!trimmed) continue;

		if (trimmed.includes('/')) {
			const [ipStr, prefixStr] = trimmed.split('/');
			const ip = ipToNumber(ipStr);
			const prefix = parseInt(prefixStr, 10);
			if (ip === null || isNaN(prefix) || prefix < 0 || prefix > 32) continue;
			const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
			entries.push({ type: 'cidr', ip: (ip & mask) >>> 0, mask });
		} else {
			const ip = ipToNumber(trimmed);
			if (ip === null) continue;
			entries.push({ type: 'ip', ip, mask: 0xFFFFFFFF });
		}
	}
	return entries;
}

/**
 * Check if an IP address is allowed by the given allow-list.
 * Localhost (127.0.0.1) is always allowed.
 */
export function isIPAllowed(ip: string, allowList: AllowedIPEntry[]): boolean {
	const normalized = normalizeIP(ip);

	// Localhost is always allowed
	if (normalized === '127.0.0.1' || normalized === 'localhost') return true;

	if (allowList.length === 0) return false;

	const num = ipToNumber(normalized);
	if (num === null) return false;

	for (const entry of allowList) {
		if (entry.type === 'ip') {
			if (num === entry.ip) return true;
		} else {
			if (((num & entry.mask) >>> 0) === entry.ip) return true;
		}
	}
	return false;
}
