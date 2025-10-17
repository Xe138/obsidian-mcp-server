---
description: Agent-specific do's and don'ts
---

# Agent Guidelines

## Do

- Add commands with stable IDs (don't rename once released)
- Provide defaults and validation in settings
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals
- Use `this.register*` helpers for everything that needs cleanup
- Keep `main.ts` minimal and focused on lifecycle management
- Split functionality across separate modules
- Organize code into logical folders (commands/, ui/, utils/)

## Don't

- Introduce network calls without an obvious user-facing reason and documentation
- Ship features that require cloud services without clear disclosure and explicit opt-in
- Store or transmit vault contents unless essential and consented
- Put all code in `main.ts` - delegate to separate modules
- Create files larger than 200-300 lines without splitting them
- Commit build artifacts to version control
- Change plugin `id` after release
- Rename command IDs after release
