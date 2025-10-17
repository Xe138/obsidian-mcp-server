# Release Notes: Version 1.1.0

**Release Date:** October 16, 2025  
**Type:** Minor Version (Feature Release)  
**Compatibility:** Fully backward compatible with v1.0.0

## 🎯 Overview

Version 1.1.0 implements **Phase 1.1** of the roadmap, focusing on robustness, cross-platform compatibility, and significantly improved user experience through enhanced error messages and path handling.

## ✨ What's New

### Path Normalization & Validation

**Cross-platform path handling** that works seamlessly on Windows, macOS, and Linux:
- Automatic conversion of backslashes to forward slashes
- Windows drive letter handling
- Leading/trailing slash normalization
- Security: Prevents directory traversal attacks
- Case sensitivity awareness (macOS/Linux vs Windows)

### Enhanced Error Messages

**Actionable error messages** that help users fix issues quickly:
- Context-aware troubleshooting tips
- Dynamic suggestions (e.g., "Use list_notes('folder') to see available files")
- Clear examples of correct path formats
- Platform-specific guidance
- Operation-specific recommendations

**Example:**
```
Parent folder does not exist: "projects/2024/q4"

Cannot create "projects/2024/q4/report.md" because its parent folder is missing.

Troubleshooting tips:
• Create the parent folder first using Obsidian
• Verify the folder path with list_notes("projects/2024")
• Check that the parent folder path is correct (vault-relative, case-sensitive on macOS/Linux)
• Note: Automatic parent folder creation is not currently enabled
```

### Improved Tool Descriptions

**AI agents now receive comprehensive guidance** directly in the MCP schema:
- Critical constraints stated upfront
- Workflow suggestions (e.g., "use list_notes() first if unsure")
- Multiple concrete examples per tool
- Failure modes explicitly documented
- Self-documenting without external docs

### Testing Infrastructure

**Professional testing setup** for reliability:
- Jest testing framework configured
- 43 unit tests (all passing)
- Mock Obsidian API for isolated testing
- Cross-platform test coverage
- Easy to run: `npm test`

### Comprehensive Documentation

**New documentation for users and developers:**
- **Tool Selection Guide** (400+ lines) - Complete guide on choosing the right tool
- **Error Message Improvements** - Documentation of all enhancements
- **Tool Description Improvements** - AI agent guidance documentation
- **Testing Guide** - How to run and write tests
- **Phase 1.1 Implementation Summary** - Technical details

## 🔧 Technical Improvements

### New Utilities

**`PathUtils` class** (`src/utils/path-utils.ts`):
- 15+ utility methods for path operations
- Type-safe file/folder resolution
- Existence checking
- Path manipulation (parent, basename, join)
- Markdown extension handling

**`ErrorMessages` class** (`src/utils/error-messages.ts`):
- 11 specialized error message generators
- Dynamic context-based suggestions
- Consistent formatting
- Reusable across all tools

### Updated Tool Implementations

All tools now use the new utilities:
- ✅ `readNote()` - Enhanced validation and error messages
- ✅ `createNote()` - Parent folder validation, conflict detection
- ✅ `updateNote()` - Better error handling
- ✅ `deleteNote()` - Folder detection with clear error
- ✅ `listNotes()` - Path validation and verification

## 🐛 Bug Fixes

- **Windows path handling** - Backslashes now converted automatically
- **Delete folder error** - Clear message instead of confusing "not a folder" error
- **Parent folder detection** - Specific guidance when parent missing
- **Error contradictions** - All error messages now internally consistent
- **Path validation** - Prevents invalid characters and security issues

## 📊 Statistics

- **New Files:** 8 (utilities, tests, mocks, docs)
- **Modified Files:** 5 (tool implementations, package.json, manifest)
- **Lines Added:** ~2,500+
- **Test Coverage:** 43 tests, 100% PathUtils coverage
- **Documentation:** 1,000+ lines of new documentation

## 🚀 Upgrade Instructions

### For Users

1. **Backup settings** (optional, but recommended)
2. **Update plugin files** to v1.1.0
3. **Restart Obsidian** or reload the plugin
4. **No configuration changes needed** - fully backward compatible

### For Developers

1. **Install new dev dependencies:**
   ```bash
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Build:**
   ```bash
   npm run build
   ```

## ⚠️ Breaking Changes

**None** - Version 1.1.0 is fully backward compatible with v1.0.0.

All existing integrations will continue to work without modification. The improvements are additive and enhance the existing functionality.

## 📈 Roadmap Progress

### Completed ✅
- **Phase 1.1** - Path Normalization & Error Handling (100%)
  - Path utilities ✅
  - Enhanced error messages ✅
  - Tool implementation updates ✅
  - Testing infrastructure ✅

### Next Up 🔜
- **Phase 1.5** - Enhanced Authentication & Security
  - Secure API key management
  - Multiple API keys with labels
  - Key expiration and rotation
  - Rate limiting
  - Audit logging

- **Phase 2** - API Unification & Typed Results
  - Standardize parameter naming
  - Structured, typed responses
  - Better consistency

## 🎓 Learning Resources

### New Documentation
- Read `docs/TOOL_SELECTION_GUIDE.md` for comprehensive tool usage guide
- Check `docs/ERROR_MESSAGE_IMPROVEMENTS.md` for error message details
- See `tests/README.md` for testing setup and guidelines

### Quick Reference
```
┌─────────────────────────────────────────────────────────┐
│  OBSIDIAN MCP TOOL QUICK REFERENCE                      │
├─────────────────────────────────────────────────────────┤
│  List folder:    list_notes("folder")                   │
│  Read file:      read_note("folder/file.md")            │
│  Create file:    create_note("path.md", "content")      │
│  Update file:    update_note("path.md", "new content")  │
│  Delete file:    delete_note("path.md")                 │
│  Search:         search_notes("query")                  │
│  Vault info:     get_vault_info()                       │
├─────────────────────────────────────────────────────────┤
│  ✓ Paths are vault-relative (no leading /)             │
│  ✓ Use forward slashes: folder/file.md                 │
│  ✓ Case-sensitive on macOS/Linux                       │
│  ✓ Include file extensions: .md, .png, etc.            │
└─────────────────────────────────────────────────────────┘
```

## 💡 Tips for AI Agents

If you're an AI agent using this plugin:

1. **Always use `list_notes()` first** when unsure about paths
2. **Read before updating** - Use `read_note()` then `update_note()` for partial changes
3. **Verify parent folders** - Use `list_notes()` to check folders exist before creating files
4. **Pay attention to error messages** - They include specific troubleshooting steps
5. **Use vault-relative paths** - No leading slashes, include file extensions

## 🙏 Acknowledgments

Thanks to all testers and users who provided feedback that shaped these improvements!

## 📞 Support

- **Documentation:** See README.md and docs/ folder
- **Issues:** Report bugs with version number (1.1.0)
- **Questions:** Check TOOL_SELECTION_GUIDE.md first

---

**Full Changelog:** See [CHANGELOG.md](CHANGELOG.md) for complete details.
