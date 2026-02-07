# Remote IP access for MCP server

Date: 2026-02-06

## Problem

The MCP server is hardcoded to localhost-only access (bind address, CORS, host header validation). This prevents use cases where Obsidian runs in a Docker container or remote machine and MCP clients connect over a Tailscale VPN or other private network.

## Design

### New setting: `allowedIPs`

A comma-separated string of IPs and CIDR ranges. Default: `""` (empty).

- When empty: server behaves exactly as today (binds to `127.0.0.1`, localhost-only)
- When populated: server binds to `0.0.0.0` and allows connections from listed IPs/CIDRs
- Localhost (`127.0.0.1`) is always implicitly allowed regardless of the setting
- Examples: `100.64.0.0/10`, `192.168.1.50`, `10.0.0.0/8`

### Middleware changes (src/server/middleware.ts)

Three layers are updated:

1. **Source IP validation (new)** - Checks `req.socket.remoteAddress` against the allow-list before auth. Rejects connections from unlisted IPs with 403. Localhost always passes.

2. **CORS policy update** - Extends the origin check to allow origins whose hostname matches the allow-list, in addition to the existing localhost regex.

3. **Host header validation update** - Extends to accept Host headers matching allowed IPs, in addition to localhost.

All three use a shared `isIPAllowed()` utility.

### Server bind (src/server/mcp-server.ts)

The `start()` method computes bind address dynamically:
- `allowedIPs` non-empty (trimmed) -> bind `0.0.0.0`
- `allowedIPs` empty -> bind `127.0.0.1` (current behavior)

### Network utilities (src/utils/network-utils.ts)

New file (~40 lines) exporting:

- `parseAllowedIPs(setting: string): AllowedIPEntry[]` - Parses comma-separated string into structured list of individual IPs and CIDR ranges
- `isIPAllowed(ip: string, allowList: AllowedIPEntry[]): boolean` - Checks if an IP matches any entry. Handles IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) that Node.js uses for `req.socket.remoteAddress`

CIDR matching is standard bit arithmetic, no external dependencies needed.

### Settings UI (src/settings.ts)

New text field below the Port setting:
- Name: "Allowed IPs"
- Description: "Comma-separated IPs or CIDR ranges allowed to connect (e.g., 100.64.0.0/10, 192.168.1.50). Leave empty for localhost only. Restart required."
- Placeholder: `100.64.0.0/10, 192.168.1.0/24`
- Shows restart warning when changed while server is running
- Shows security note when non-empty: "Server is accessible from non-localhost IPs. Ensure your API key is kept secure."

Status display updates to show actual bind address (`0.0.0.0` vs `127.0.0.1`).

Generated client configs (Windsurf/Claude Code) stay as `127.0.0.1` - users adjust manually for remote access.

### Settings type (src/types/settings-types.ts)

Add `allowedIPs: string` to `MCPServerSettings` with default `""`.

## Security model

- **Auth is still mandatory.** IP allow-list is defense-in-depth, not a replacement for Bearer token authentication.
- **Localhost always allowed.** Cannot accidentally lock out local access.
- **Empty default = current behavior.** Zero-change upgrade for existing users. Feature is opt-in.
- **Three-layer validation:** Source IP check + CORS + Host header validation + Bearer auth.

## Testing

New file `tests/network-utils.test.ts`:
- Individual IP match/mismatch
- CIDR range matching (e.g., `100.64.0.0/10` matches `100.100.1.1`)
- IPv4-mapped IPv6 handling (`::ffff:192.168.1.1`)
- Edge cases: empty string, malformed entries, extra whitespace
- Localhost always allowed regardless of list contents

## Files changed

1. `src/types/settings-types.ts` - Add `allowedIPs` field
2. `src/utils/network-utils.ts` - New file: CIDR parsing + IP matching
3. `src/server/middleware.ts` - Update CORS, host validation, add source IP check
4. `src/server/mcp-server.ts` - Dynamic bind address
5. `src/settings.ts` - New text field + security note
6. `tests/network-utils.test.ts` - New test file
