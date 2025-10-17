---
trigger: always_on
description: Security, privacy, and compliance requirements
---

# Security, Privacy, and Compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**.

## Network & External Services

- **Default to local/offline operation** - Only make network requests when essential to the feature
- **No hidden telemetry** - If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings
- **Never execute remote code** - Don't fetch and eval scripts, or auto-update plugin code outside of normal releases
- **Clearly disclose external services** - Document any external services used, data sent, and risks

## Data Access & Privacy

- **Minimize scope** - Read/write only what's necessary inside the vault
- **Do not access files outside the vault**
- **Respect user privacy** - Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented
- **No deceptive patterns** - Avoid ads or spammy notifications

## Resource Management

- **Register and clean up all resources** - Use the provided `register*` helpers so the plugin unloads safely
- Clean up DOM, app, and interval listeners properly