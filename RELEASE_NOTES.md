# Release Notes

## v0.2.1 (2025-10-31)

### Bug Fixes

- Fixed npx compatibility on Windows by adding scoped package name to bin entries
- Package now registers both `@andrebremer/mcp-policy-server` and `mcp-policy-server` as executables
- Resolves "is not recognized as an internal or external command" error when using npx on Windows

---

## v0.2.0 (2025-10-30)

### ⚠️ BREAKING CHANGES

Configuration format changed from `stems` object to `files` array with glob pattern support. Manual migration required.

- **Old:** `{"stems": {"APP": "policy-application"}}`
- **New:** `{"files": ["./policies/*.md"]}` or `export MCP_POLICY_CONFIG="./policies/*.md"`

See docs/CONFIGURATION_REFERENCE.md for migration guide.

### Changes

- Section indexing with O(1) lookups (replaced O(n) file scanning)
- Automatic file watching with lazy refresh (policy changes appear on next tool call, no restart needed)
- Glob pattern support for flexible file matching (`*`, `**`, `{a,b}`)
- Three configuration formats: direct glob via env var, JSON file, inline JSON
- Added fast-glob dependency

---

## v0.1.1 (2025-10-25)

### Bug Fixes

- Fixed fenced code block detection with language identifiers (`` ```markdown ``, `` ```typescript ``)
- Fixed handling of unclosed fenced blocks in extracted sections
- Added reference chain tracking to error messages (shows which section referenced which)
- Updated regex pattern in `src/parser.ts` and `src/validator.ts`

### Documentation

- Clarified agent instructions with explicit tool call examples
- Updated installation instructions with platform-specific guidance
- Added documentation for code block handling in policy files
- Enhanced troubleshooting section in Getting Started guide

### Testing

- Added 189 new tests (62 parser, 127 validator)
- Added test fixtures for edge cases
- Total test count: 260 tests

---

## v0.1.0 (2025-10-24)

Initial release of MCP Policy Server.
