# Release Notes

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
