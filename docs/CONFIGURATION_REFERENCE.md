# Configuration Reference

Complete reference for configuring the Policy Documentation Server.

See [Policy Reference](POLICY_REFERENCE.md) for § notation syntax and prefix naming conventions.

## Overview

The server uses a single configuration file:

**Prefix Mapping** (`policies.json`) - Maps § prefixes to policy file stems

The configuration file location is specified via the `MCP_POLICY_CONFIG` environment variable. Policy markdown files must be in the same directory as `policies.json`.

## Prefix Mapping

### File Location

Place `policies.json` in the same directory as your policy markdown files. Set the `MCP_POLICY_CONFIG` environment variable to the absolute path of this file.

### Format

```json
{
  "prefixes": {
    "PREFIX1": "file-stem-1",
    "PREFIX2": "file-stem-2",
    "PREFIX3": "file-stem-3"
  }
}
```

### Fields

**prefixes** (required, object)
- Maps uppercase prefix names to lowercase file stems
- Keys: Uppercase prefix identifiers (DOC, API, GUIDE, etc.)
- Values: Lowercase file stems without .md extension

### Rules

1. **Only base prefixes required** - Hyphenated extensions resolve automatically
2. **Prefix case** - Must be uppercase (DOC not doc)
3. **Stem case** - Must be lowercase (policy-api not Policy-API)
4. **No extensions** - Omit .md from stems (policy-api not policy-api.md)

### Examples

**Basic configuration:**
```json
{
  "prefixes": {
    "DOC": "policy-documentation",
    "API": "policy-api",
    "GUIDE": "policy-guide"
  }
}
```

**Multiple policy types:**
```json
{
  "prefixes": {
    "SECURITY": "policy-security",
    "PRIVACY": "policy-privacy",
    "COMPLIANCE": "policy-compliance",
    "OPERATIONS": "policy-operations"
  }
}
```

**Company-specific prefixes:**
```json
{
  "prefixes": {
    "ENG": "engineering-standards",
    "PROD": "product-guidelines",
    "DESIGN": "design-system",
    "OPS": "operations-manual"
  }
}
```

## Prefix Resolution

### Base Prefixes

Base prefixes map directly to configured file stems:

- `§DOC` → `policy-documentation.md`
- `§API` → `policy-api.md`
- `§GUIDE` → `policy-guide.md`

### Hyphenated Extensions

Hyphenated prefixes automatically extract base prefix:

- `§DOC-GUIDE.1` → Extract `DOC` → `policy-documentation.md`
- `§API-REST.2` → Extract `API` → `policy-api.md`
- `§GUIDE-QUICK.3` → Extract `GUIDE` → `policy-guide.md`

### Extension Pattern

Format: `§BASE-EXTENSION.N`

The server:
1. Splits on first hyphen
2. Extracts base prefix (DOC, API, GUIDE)
3. Looks up base prefix in configuration
4. Resolves to corresponding file

### Benefits

Hyphenated extensions allow organizing sections without config maintenance:

**Before (multiple configs):**
```json
{
  "prefixes": {
    "DOC": "policy-documentation",
    "DOC-GUIDE": "policy-documentation",
    "DOC-API": "policy-documentation",
    "DOC-REF": "policy-documentation"
  }
}
```

**After (single config):**
```json
{
  "prefixes": {
    "DOC": "policy-documentation"
  }
}
```

All DOC-* prefixes resolve automatically.

## File Discovery

Server discovers policy files by:
1. Extracting base prefix from § reference (§DOC-GUIDE.1 → DOC)
2. Looking up stem in policies.json (DOC → policy-documentation)
3. Finding matching files (policy-documentation.md, policy-documentation-*.md)
4. Searching all files for requested section
5. Returning first match

Supports both exact matches (policy-documentation.md) and extensions (policy-documentation-guides.md).

## Environment Variables

### MCP_POLICY_CONFIG

**Purpose:** Specify path to `policies.json` configuration file (required)

**Usage:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "node",
      "args": ["path/to/policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "/absolute/path/to/policies.json"
      }
    }
  }
}
```

**Behavior:**
- Server loads prefix mappings from this file
- Policy directory determined from file location
- All policy files resolved relative to directory containing `policies.json`

**Path Resolution:**
- Config file location: `{MCP_POLICY_CONFIG}`
- Base directory: `dirname({MCP_POLICY_CONFIG})`
- Policy files: `{baseDir}/policy-*.md`

**Common use cases:**
- Production deployment with fixed configuration location
- Testing with different policy structures
- Running server from any directory
- CI/CD environments with custom paths

## Configuration Validation

### Startup Validation

The server validates configuration on startup:

**Checks:**
1. `MCP_POLICY_CONFIG` environment variable is set
2. `policies.json` file exists at specified path
3. `prefixes` field is present and valid
4. Policy directory is accessible

**Errors:**
- Missing MCP_POLICY_CONFIG → Error message requiring environment variable
- Missing config file → Clear error message with expected path
- Invalid JSON → Parse error with line number
- Missing prefixes → Lists available prefixes
- Missing policy files → Lists searched locations

### Section Uniqueness

The server checks for duplicate section IDs:

**Process:**
1. Scan all policy files
2. Extract all `{§PREFIX.N}` markers
3. Identify duplicates
4. Log warnings (does not prevent startup)

**Example warning:**
```
Warning: Duplicate section IDs found:
  §DOC.1 appears in:
    - policy-documentation.md
    - policy-documentation-guides.md
```

## Configuration Examples

### Simple Project

**Structure:**
```
policies/
  policies.json
  policy-api.md
  policy-guide.md
```

**`policies/policies.json`:**
```json
{
  "prefixes": {
    "API": "policy-api",
    "GUIDE": "policy-guide"
  }
}
```

**MCP Configuration:**
```json
{
  "env": {
    "MCP_POLICY_CONFIG": "/absolute/path/to/policies/policies.json"
  }
}
```

### Complex Project

**Structure:**
```
company/standards/policies/
  policies.json
  policy-engineering.md
  policy-engineering-backend.md
  policy-engineering-frontend.md
  policy-security.md
  policy-operations.md
```

**`policies/policies.json`:**
```json
{
  "prefixes": {
    "ENG": "policy-engineering",
    "SEC": "policy-security",
    "OPS": "policy-operations"
  }
}
```

**MCP Configuration:**
```json
{
  "env": {
    "MCP_POLICY_CONFIG": "/absolute/path/to/company/standards/policies/policies.json"
  }
}
```

**Usage:**
- `§ENG.1` → `policy-engineering.md`
- `§ENG-BACKEND.1` → Searches all `policy-engineering*.md` files
- `§SEC.1` → `policy-security.md`
- `§OPS.1` → `policy-operations.md`

## Troubleshooting

### Configuration Not Found

**Error:** "MCP_POLICY_CONFIG environment variable must be set"

**Solutions:**
1. Set `MCP_POLICY_CONFIG` in MCP server configuration
2. Verify path points to `policies.json` file
3. Ensure path is absolute, not relative

**Error:** "Policy configuration not found"

**Solutions:**
1. Check file exists at path specified by `MCP_POLICY_CONFIG`
2. Verify file path is correct (case-sensitive on Unix)
3. Ensure JSON is valid (use JSON validator)

### Prefix Not Found

**Error:** "Unknown prefix: PREFIX"

**Solutions:**
1. Check `policies.json` contains prefix definition
2. Verify prefix is defined in `prefixes` object
3. Ensure prefix is uppercase
4. Check JSON syntax is valid

### Section Not Found

**Error:** "Section §PREFIX.N not found"

**Solutions:**
1. Verify section exists in policy file
2. Check section header format: `## {§PREFIX.N}`
3. Ensure prefix matches configuration
4. Use `list_sources` tool to see available sections

### Duplicate Section IDs

**Warning:** "Duplicate section IDs found"

**Solutions:**
1. Review warning output for conflicting IDs
2. Locate duplicate markers in policy files
3. Renumber or merge duplicate sections
4. Consider if sections should be in different files
5. Note: Examples in code blocks may trigger false positives

## Best Practices

### Naming Conventions

**Prefixes:**
- Use descriptive abbreviations (DOC not D)
- Keep consistent length (3-4 characters ideal)
- Avoid ambiguous names (API not AP)

**Stems:**
- Use kebab-case (policy-documentation not policy_documentation)
- Include "policy" prefix for clarity
- Match prefix meaning (policy-api for API prefix)

### File Organization

**Single file per prefix:**
- Good for small policy sets
- Easier to maintain
- Faster searches

**Base + extension files:**
- Good for large policy sets
- Better organization
- Allows logical grouping

### Configuration Management

**Version control:**
- Commit both configuration files
- Document configuration changes
- Keep configurations in sync across team

**Documentation:**
- Document custom prefixes
- Explain organizational structure
- Provide examples in README

### Migration Strategy

**Adding new prefixes:**
1. Add entry to `policies.json`
2. Create policy file with sections
3. Update documentation
4. Notify team

**Renaming prefixes:**
1. Add new prefix to configuration
2. Update all § references
3. Remove old prefix after migration
4. Test with `validate_references` tool

**Moving policy files:**
1. Move policy files and `policies.json` to new location
2. Update `MCP_POLICY_CONFIG` to point to new `policies.json` path
3. Test with `list_sources` tool
4. Commit changes
