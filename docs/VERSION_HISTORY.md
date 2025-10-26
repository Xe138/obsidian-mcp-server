# Version History

## Public Release Version Strategy

### Initial Public Release: 1.0.0 (2025-10-26)

This plugin's first public release is marked as **version 1.0.0**.

### Development History

Prior to public release, the plugin went through private development with internal versions 1.0.0 through 3.0.0. These versions were used during development and testing but were never publicly released.

When preparing for public release, the version was reset to 1.0.0 to clearly mark this as the first public version available to users.

### Why Reset to 1.0.0?

**Semantic Versioning**: Version 1.0.0 signals the first stable, public release of the plugin. It indicates:
- The API is stable and ready for public use
- All core features are implemented and tested
- The plugin is production-ready

**User Clarity**: Starting at 1.0.0 for the public release avoids confusion:
- Users don't wonder "what happened to versions 1-2?"
- Version number accurately reflects the public release history
- Clear signal that this is the first version they can install

**Git History Preserved**: The development history (95 commits) is preserved to:
- Demonstrate development quality and security practices
- Show comprehensive testing and iterative refinement
- Provide context for future contributors
- Maintain git blame and bisect capabilities

### Version Numbering Going Forward

From 1.0.0 onward, the plugin follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.x.x): Incompatible API changes or breaking changes
- **MINOR** version (x.1.x): New functionality in a backward-compatible manner
- **PATCH** version (x.x.1): Backward-compatible bug fixes

### Development Version Mapping

For reference, here's what the private development versions contained:

| Dev Version | Key Features Added |
|-------------|-------------------|
| 1.0.0 | Initial MCP server, basic CRUD tools |
| 1.1.0 | Path normalization, error handling |
| 1.2.0 | Enhanced authentication, parent folder detection |
| 2.0.0 | API unification, typed results |
| 2.1.0 | Discovery endpoints (stat, exists) |
| 3.0.0 | Enhanced list operations |

All these features are included in the public 1.0.0 release.

### Commit History

The git repository contains the complete development history showing the evolution from initial implementation through all features. This history demonstrates:

- Security-conscious development (API key encryption, authentication)
- Comprehensive test coverage (100% coverage goals)
- Careful refactoring and improvements
- Documentation and planning
- Bug fixes and edge case handling

No sensitive data exists in the git history (verified via audit).

---

## Future Versioning

**Next versions** will be numbered according to the changes made:

- **1.0.1**: Bug fixes and patches
- **1.1.0**: New features (e.g., Resources API, Prompts API)
- **2.0.0**: Breaking changes to tool schemas or behavior

The CHANGELOG.md will document all public releases starting from 1.0.0.
