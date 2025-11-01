# Configuration Reference

Complete reference for configuring the Policy Documentation Server.

## Overview

Configure via `MCP_POLICY_CONFIG` environment variable using one of three formats:

1. **Direct glob** (simplest): `./policies/*.md`
2. **JSON file**: Path to `policies.json`
3. **Inline JSON**: `{"files": ["./policies/*.md"]}`

**Default:** If `MCP_POLICY_CONFIG` is not set, the server loads `./policies.json` from the working directory.

## Configuration Format

### JSON Structure

```json
{
  "files": [
    "./policies/policy-*.md",
    "./policies/**/*.md"
  ],
  "maxChunkTokens": 10000
}
```

**fields** (required)
- Array of file paths or glob patterns
- All files must be `.md`
- Expanded once at startup

**maxChunkTokens** (optional, default: 10000)
- Large responses split at section boundaries
- Adjust based on client timeout limits

### Path Resolution

**Relative paths:**
- JSON file: relative to `policies.json` directory
- Direct glob/inline: relative to working directory
- **Use absolute paths to avoid confusion**

**Windows:** Use forward slashes: `C:/path/to/policies.json`

## Configuration Methods

### 1. Direct Glob (Recommended)

Simplest approach - use glob pattern directly:

```json
{
  "env": {
    "MCP_POLICY_CONFIG": "./policies/*.md"
  }
}
```

Supports multiple directories:
```json
{
  "env": {
    "MCP_POLICY_CONFIG": "./{policies,docs}/*.md"
  }
}
```

### 2. JSON File

For complex patterns or multiple directories:

**policies.json:**
```json
{
  "files": [
    "./policies/core/*.md",
    "./policies/guides/*.md"
  ]
}
```

**Config:**
```json
{
  "env": {
    "MCP_POLICY_CONFIG": "./policies/policies.json"
  }
}
```

### 3. Inline JSON

For testing:

```json
{
  "env": {
    "MCP_POLICY_CONFIG": "{\"files\": [\"./policies/*.md\"]}"
  }
}
```

## Glob Patterns

Basic syntax:
- `*` - Any characters (single directory)
- `**` - Recursive (all subdirectories)
- `?` - Single character
- `{a,b}` - Alternatives

Examples:
```
./policies/*.md              → All .md files
./policies/**/*.md           → All .md files recursively
./{policies,docs}/*.md       → Both directories
./policies/policy-*.md       → Files starting with policy-
```

## File Watching

Policy file changes reload automatically. No restart needed.

**Restart required for:**
- New files matching glob patterns
- Configuration changes
- New glob patterns

## Troubleshooting

### "Pattern matched zero files"
- Check directory exists
- Verify file names (case-sensitive)

### "Policy file not found"
- Use absolute paths
- Check path resolution rules above

### "Invalid JSON"
- Validate JSON syntax (no trailing commas)
- Ensure `files` is an array

### Changes not appearing
- Edit policy file to trigger reload
- Check server logs for `[WATCH]` events
- Restart server if needed

### Duplicate sections
- Same section ID in multiple files
- Remove duplicates from one file
- Restart server

## Policy File Format

Mark sections with § notation:

```markdown
## {§DOC.1}
Content until next section or {§END}

### {§DOC.1.1}
Subsection content
```

Prefixes extracted from section IDs automatically. No manual mapping needed.

Sections can reference others:
```markdown
## {§CODE.1}
See §CODE.2 for details.
```

Server resolves references recursively.

## Best Practices

- Use direct glob for simple cases
- Use JSON file for complex patterns
- Keep consistent file naming
- Ensure section IDs are unique
