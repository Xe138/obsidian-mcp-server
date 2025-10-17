---
trigger: always_on
description: Commands and settings implementation guidelines
---

# Commands & Settings

## Commands

- Add user-facing commands via `this.addCommand(...)`
- **Use stable command IDs** - Don't rename once released
- Ensure commands are unique and descriptive

### Example: Add a Command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

## Settings

- Provide a settings tab if the plugin has configuration
- Always provide sensible defaults
- Persist settings using `this.loadData()` / `this.saveData()`
- Provide defaults and validation in settings

### Example: Persist Settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

## Resource Management

- Write idempotent code paths so reload/unload doesn't leak listeners or intervals
- Use `this.register*` helpers for everything that needs cleanup

### Example: Register Listeners Safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```