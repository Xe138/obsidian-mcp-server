# Manual Integration Testing Checklist
## Task 9: CORS Simplification and Mandatory Auth

**Date:** 2025-10-25
**Implementation Plan:** docs/plans/2025-10-25-simplify-cors-mandatory-auth.md
**Purpose:** Verify that all code changes work correctly in a real Obsidian environment

---

## Test 1: Fresh Install Test

### Prerequisites
- Access to a test vault
- Built plugin files (main.js, manifest.json, styles.css)

### Steps
1. ✅ Remove plugin from test vault (if exists): `rm -rf .obsidian/plugins/obsidian-mcp-server/`
2. ✅ Build plugin: `npm run build`
3. ✅ Copy built plugin files to vault: `.obsidian/plugins/obsidian-mcp-server/`
4. ✅ Enable plugin in Obsidian Settings → Community Plugins
5. ✅ Open browser console (Ctrl+Shift+I)
6. ✅ Verify log message: "Generating new API key..."
7. ✅ Check `.obsidian/plugins/obsidian-mcp-server/data.json`:
   - Key should be present
   - Key should start with "encrypted:" (if encryption available)
8. ✅ Verify server starts successfully (check plugin settings or console)

### Expected Results
- [ ] API key auto-generated on first install
- [ ] Key is encrypted in data.json
- [ ] No CORS settings in data.json
- [ ] Server starts without errors
- [ ] No "enableCORS" or "allowedOrigins" fields in data.json

---

## Test 2: Migration Test

### Prerequisites
- Test vault with plugin already installed
- Access to data.json file

### Steps
1. ✅ Stop Obsidian
2. ✅ Manually edit `.obsidian/plugins/obsidian-mcp-server/data.json`:
   ```json
   {
     "port": 3000,
     "enableCORS": true,
     "allowedOrigins": ["*"],
     "enableAuth": false,
     "apiKey": "old-plaintext-key",
     "autoStart": false
   }
   ```
3. ✅ Save file
4. ✅ Start Obsidian
5. ✅ Open browser console
6. ✅ Verify log message: "Migrating legacy CORS settings..."
7. ✅ Check updated data.json:
   - "enableCORS" should be removed
   - "allowedOrigins" should be removed
   - "enableAuth" should be true
   - "apiKey" should be encrypted
8. ✅ Verify server still works

### Expected Results
- [ ] Legacy CORS settings removed from data.json
- [ ] enableAuth set to true
- [ ] API key encrypted (if not already)
- [ ] Other settings preserved (port, autoStart, notifications)
- [ ] Server functionality not affected

---

## Test 3: API Key Encryption Test

### Prerequisites
- Plugin installed and running
- Access to plugin settings UI

### Steps
1. ✅ Open plugin settings in Obsidian
2. ✅ Locate "API Key Management" section
3. ✅ Click "Copy Key" button
4. ✅ Note the plaintext key (save to clipboard)
5. ✅ Stop Obsidian completely
6. ✅ Open `.obsidian/plugins/obsidian-mcp-server/data.json`
7. ✅ Verify apiKey field starts with "encrypted:" (or is plaintext if encryption unavailable)
8. ✅ Restart Obsidian
9. ✅ Open plugin settings
10. ✅ Verify API key display shows the same plaintext key from step 4
11. ✅ Verify server starts and accepts the key

### Expected Results
- [ ] API key displayed in plaintext in UI
- [ ] API key encrypted in data.json file
- [ ] Same key works after restart
- [ ] "Copy Key" button copies plaintext key
- [ ] Encryption status indicator shows correct state

---

## Test 4: API Key Regeneration Test

### Prerequisites
- Plugin installed with existing API key
- Access to plugin settings UI

### Steps
1. ✅ Open plugin settings
2. ✅ Copy current API key (note it down)
3. ✅ Click "Regenerate Key" button
4. ✅ Verify success notification
5. ✅ Verify displayed key has changed
6. ✅ Copy new key
7. ✅ Verify old key ≠ new key
8. ✅ Stop Obsidian
9. ✅ Check data.json - verify encrypted key has changed
10. ✅ Restart Obsidian
11. ✅ Verify new key is displayed correctly
12. ✅ Verify server restart prompt if server was running

### Expected Results
- [ ] Regenerate button generates a new key
- [ ] New key is different from old key
- [ ] New key is properly encrypted on disk
- [ ] New key persists across restart
- [ ] Server restart prompted if needed

---

## Test 5: Authentication Test

### Prerequisites
- Plugin installed and server running
- curl or similar HTTP client

### Steps
1. ✅ Start MCP server from plugin settings
2. ✅ Copy API key from settings UI
3. ✅ Try request WITHOUT auth:
   ```bash
   curl -X POST http://127.0.0.1:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"ping","id":1}'
   ```
4. ✅ Verify response is 401 Unauthorized
5. ✅ Try request WITH correct Bearer token:
   ```bash
   curl -X POST http://127.0.0.1:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY_HERE" \
     -d '{"jsonrpc":"2.0","method":"ping","id":1}'
   ```
6. ✅ Verify response is 200 OK with pong result
7. ✅ Try request with WRONG Bearer token:
   ```bash
   curl -X POST http://127.0.0.1:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer wrong-token" \
     -d '{"jsonrpc":"2.0","method":"ping","id":1}'
   ```
8. ✅ Verify response is 401 Unauthorized

### Expected Results
- [ ] Requests without auth rejected (401)
- [ ] Requests with invalid token rejected (401)
- [ ] Requests with valid token accepted (200)
- [ ] No way to bypass authentication

---

## Test 6: CORS Test (Optional - Requires Web Client)

### Prerequisites
- MCP server running
- Simple HTML file or local web server

### Steps
1. ✅ Create test HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <button onclick="testCORS()">Test CORS</button>
     <div id="result"></div>
     <script>
       async function testCORS() {
         const apiKey = 'YOUR_API_KEY_HERE';
         try {
           const response = await fetch('http://localhost:3000/mcp', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${apiKey}`
             },
             body: JSON.stringify({"jsonrpc":"2.0","method":"ping","id":1})
           });
           document.getElementById('result').innerText =
             `Success: ${response.status} ${await response.text()}`;
         } catch(e) {
           document.getElementById('result').innerText = `Error: ${e.message}`;
         }
       }
     </script>
   </body>
   </html>
   ```
2. ✅ Serve HTML from localhost:8080: `python3 -m http.server 8080`
3. ✅ Open http://localhost:8080 in browser
4. ✅ Update apiKey in HTML with actual key
5. ✅ Click "Test CORS" button
6. ✅ Verify request succeeds (CORS allowed from localhost:8080)
7. ✅ Try accessing from non-localhost origin (if possible)
8. ✅ Verify CORS blocks non-localhost origins

### Expected Results
- [ ] Requests from localhost origins succeed
- [ ] Requests from 127.0.0.1 origins succeed
- [ ] Requests from non-localhost origins blocked by CORS
- [ ] HTTPS localhost origins also work

---

## Test 7: Settings UI Verification

### Prerequisites
- Plugin installed
- Access to plugin settings

### Steps
1. ✅ Open Obsidian Settings → Community Plugins → Obsidian MCP Server
2. ✅ Verify NO "Enable CORS" toggle is visible
3. ✅ Verify NO "Allowed origins" text input is visible
4. ✅ Verify NO "Enable authentication" toggle is visible
5. ✅ Verify "Authentication" heading is present
6. ✅ Verify description text mentions "mandatory" and "encrypted"
7. ✅ Verify encryption status indicator is displayed:
   - 🔒 "Encryption: Available" OR
   - ⚠️ "Encryption: Unavailable"
8. ✅ Verify "API Key Management" section is always visible
9. ✅ Verify API key is displayed in monospace font
10. ✅ Verify "Copy Key" and "Regenerate Key" buttons are visible
11. ✅ Verify "MCP Client Configuration" section always includes Authorization header

### Expected Results
- [ ] No CORS configuration options visible
- [ ] No authentication toggle (always enabled)
- [ ] Clear messaging about mandatory auth
- [ ] Encryption status displayed
- [ ] API key section always visible
- [ ] Configuration snippet includes auth header

---

## Test 8: No Regressions Test

### Prerequisites
- Plugin installed and server running
- Test vault with notes

### Steps
1. ✅ Test all MCP tools work:
   - `read_note` - Read an existing note
   - `create_note` - Create a new note
   - `update_note` - Modify a note
   - `delete_note` - Delete a note
   - `list` - List notes in vault
   - `search` - Search for text
   - Other tools as applicable
2. ✅ Test notifications (if enabled):
   - Enable notifications in settings
   - Call an MCP tool
   - Verify notification appears in Obsidian
3. ✅ Test server controls:
   - Stop server
   - Start server
   - Restart server
4. ✅ Test settings save/load:
   - Change port number
   - Toggle autoStart
   - Restart Obsidian
   - Verify settings preserved

### Expected Results
- [ ] All MCP tools function correctly
- [ ] No errors in console related to CORS/auth changes
- [ ] Notifications work as before
- [ ] Server controls work correctly
- [ ] Settings persist across restarts
- [ ] No functionality regressions

---

## Test 9: Error Handling Test

### Prerequisites
- Plugin installed

### Steps
1. ✅ Test empty API key scenario:
   - Stop Obsidian
   - Edit data.json to set `apiKey: ""`
   - Start Obsidian
   - Verify new key is auto-generated
2. ✅ Test decryption failure:
   - Stop Obsidian
   - Edit data.json to set `apiKey: "encrypted:invalid-base64!!!"`
   - Start Obsidian
   - Verify error notice displayed
   - Verify user prompted to regenerate key
3. ✅ Test server start with no API key:
   - Stop Obsidian
   - Edit data.json to remove apiKey field entirely
   - Start Obsidian
   - Verify key auto-generated
   - Verify server can start

### Expected Results
- [ ] Empty API key triggers auto-generation
- [ ] Invalid encrypted key shows error notice
- [ ] User can recover from decryption failures
- [ ] Server doesn't start with invalid key state

---

## Summary Checklist

After completing all tests above, verify:

- [ ] Fresh install generates and encrypts API key
- [ ] Legacy CORS settings are migrated correctly
- [ ] API keys are encrypted at rest
- [ ] API key regeneration works
- [ ] Authentication is mandatory and enforced
- [ ] CORS allows localhost origins only
- [ ] Settings UI shows correct options (no CORS, no auth toggle)
- [ ] Encryption status is displayed
- [ ] All existing MCP tools work correctly
- [ ] No console errors related to changes
- [ ] Error scenarios handled gracefully

---

## Test Results

**Tester:** [Name]
**Date:** [Date]
**Obsidian Version:** [Version]
**Plugin Version:** [Version]
**Platform:** [Windows/macOS/Linux]

**Overall Status:** [ ] PASS / [ ] FAIL
**Notes:**
