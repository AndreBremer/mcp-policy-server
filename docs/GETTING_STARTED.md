# Getting Started with MCP Policy Server

This guide walks you through setting up the Policy Server from scratch. You'll create policy files, configure the server, and write your first subagent that uses policy references.

**Note:** Designed for Claude Code subagents and commands (slash commands). The § notation works most effectively when subagents can programmatically fetch policy sections via MCP tools.

## Step 1: Install the Server

See [INSTALLATION.md](INSTALLATION.md) for prerequisites and complete installation instructions. Once installed, continue with this guide to create your policies.

## Step 2: Create Policy Files

Create your first policy file with section markers.

**policies/policy-coding.md:**
```markdown
# Coding Standards

## {§CODE.1}
### General Principles

Code must be readable, maintainable, and well-tested. Follow language-specific style guides and document complex logic.

## {§CODE.2}
### Error Handling

All functions must handle errors explicitly:
- Use try-catch blocks for async operations
- Return error objects, don't throw strings
- Log errors with context for debugging

See §CODE.5 for logging standards.

## {§CODE.3}
### Testing Requirements

Every feature requires:
- Unit tests covering core logic (80% coverage minimum)
- Integration tests for API endpoints
- E2E tests for critical user flows

Use mocking frameworks to isolate units under test.

## {§CODE.4}
### Code Review Process

All code requires peer review before merging:
1. Self-review first (check §CODE.1, §CODE.2, §CODE.3)
2. Request review from team member
3. Address feedback within 24 hours
4. Obtain approval before merge

## {§CODE.5}
### Logging Standards

Use structured logging with severity levels:
- ERROR: System failures requiring immediate attention
- WARN: Degraded functionality, should be investigated
- INFO: Normal operations, audit trail
- DEBUG: Development troubleshooting only

Include request IDs for traceability.
```

**Key points:**
- Use format `## {§PREFIX.N}` for section markers (see [Policy Reference](POLICY_REFERENCE.md) for complete syntax)
- Sections can reference other sections (§CODE.5 referenced from §CODE.2)

## Step 3: Configure Policy Files

The server requires a configuration specifying which policy files to load. You can configure this in three ways:

### Option 1: Direct Glob Pattern (Recommended - Simplest)

Set `MCP_POLICY_CONFIG` environment variable to a glob pattern in your `.mcp.json` file:

**Linux/macOS - .mcp.json in project root:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/*.md"
      }
    }
  }
}
```

**Windows - .mcp.json in project root:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/*.md"
      }
    }
  }
}
```

**Supported glob patterns:**
- `./policies/*.md` - All .md files in directory
- `./policies/policy-*.md` - Files matching pattern
- `./policies/**/*.md` - Recursive directory search
- `./{policies,docs}/*.md` - Brace expansion for multiple directories

### Option 2: JSON Configuration File

Create a `policies.json` file listing your policy files:

**policies/policies.json:**
```json
{
  "files": [
    "./policy-*.md"
  ]
}
```

Set `MCP_POLICY_CONFIG` to the JSON file path (or omit to use default `./policies.json`):

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/policies.json"
      }
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/policies.json"
      }
    }
  }
}
```

**If `MCP_POLICY_CONFIG` is not set**, the server loads `./policies.json` from the working directory.

### Option 3: Inline JSON Configuration

Pass the configuration directly as a JSON string:

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "{\"files\": [\"./policies/*.md\"]}"
      }
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "{\"files\": [\"./policies/*.md\"]}"
      }
    }
  }
}
```

### Path Resolution Rules

- **File-based configuration** (Option 2): Relative paths resolve from the directory containing `policies.json`
- **Environment variable configuration** (Options 1 and 3): Relative paths resolve from the working directory (where the server process starts)
- **Absolute paths**: Always use absolute paths in MCP client configurations to avoid ambiguity

See [Configuration Reference](./CONFIGURATION_REFERENCE.md) for complete configuration options and examples.

## Step 4: Test the Server

See [README.md](../README.md#available-mcp-tools) for complete tool documentation. To verify installation, ask Claude Code to list available policies:

```
Use the MCP list_sources tool to show me available policies
```

You should see your configured policy files and available section prefixes.

## Step 5: Create a Subagent That Uses Policies

Create a subagent file that references your policies.

**Key principle:** Subagents must be explicitly instructed to call `mcp__policy-server__fetch_policies` with the sections they need. Simply mentioning § references is not enough - subagents need clear instructions to fetch them.

**.claude/agents/code-reviewer.md:**
```markdown
---
name: code-reviewer
description: Reviews code changes for compliance with policy standards
tools: mcp__policy-server__fetch_policies, Read, Glob
model: inherit
---

You are a code reviewer ensuring adherence to team standards.

## Process

When reviewing code:

1. **Fetch relevant standards** by calling the `mcp__policy-server__fetch_policies` tool with:
   ```json
   {"sections": ["§CODE.1", "§CODE.2", "§CODE.3", "§CODE.4"]}
   ```
   This retrieves:
   - §CODE.1 - General principles
   - §CODE.2 - Error handling
   - §CODE.3 - Testing requirements
   - §CODE.4 - Code review process

2. **Review the code** against fetched standards

3. **Provide feedback** structured as:
   - **Strengths**: What's done well
   - **Issues**: Specific violations with section references
   - **Recommendations**: How to fix with code examples

## Important

Always fetch policies FIRST before reviewing. The § references in step 1 are placeholders - you must actually call the tool to get the policy content.

Cite specific policy sections (§CODE.N) when noting violations.
```

## Step 6: Use the Subagent

Invoke your code review subagent with a code sample:

```
@agent-code-reviewer review @path/to/code-file.js:
```

**What happens:**
1. Subagent reads its instructions
2. Subagent sees references to §CODE.1, §CODE.2, §CODE.3
3. Subagent calls MCP `mcp__policy-server__fetch_policies` tool with those sections
4. Server returns requested sections PLUS §CODE.5 (referenced from §CODE.2)
5. Subagent reviews code against current standards
6. Subagent provides feedback with specific policy citations

## Step 7: Automatic Policy Updates

Policy files are watched automatically for changes. Updates appear on the next tool call without restarting the server.

**How it works:**
1. Server monitors all configured policy files for changes
2. When a file changes, the section index is marked stale
3. On the next MCP tool call, the index rebuilds automatically
4. Changes appear within seconds after saving your policy files

**What triggers updates:**
- File content changes (save/modify)
- File deletion
- File rename

**No restart needed:**
```markdown
# Edit your policy file
## {§CODE.1}
### General Principles

Updated content here...  # <-- Save the file

# Next tool call automatically sees the changes
```

**Limitations:**
- New files matching existing glob patterns require server restart
- Configuration changes (adding new patterns) require server restart
- Files on network drives or WSL may have delayed updates

## Step 8: Expand Your Policies

Add more policy files as needed:

**policies/policy-api.md:**
```markdown
# API Standards

## {§API.1}
### REST Endpoint Design

All REST endpoints follow these conventions:
- Use plural nouns for resources (/users, /orders)
- Use proper HTTP verbs (GET, POST, PUT, DELETE)
- Return appropriate status codes

See §CODE.2 for error response format.

## {§API.2}
### Authentication

All endpoints require authentication except /health and /metrics:
- Use Bearer tokens in Authorization header
- Validate tokens on every request
- Return 401 for invalid tokens, 403 for insufficient permissions
```

If using a glob pattern, the new file is automatically included (no configuration changes needed):

**Configuration:**
```json
{
  "files": [
    "./policies/policy-*.md"
  ]
}
```

The pattern `./policies/policy-*.md` matches both `policy-coding.md` and `policy-api.md`. Restart the server to detect the new file.

See [Configuration Reference](CONFIGURATION_REFERENCE.md#examples) for advanced examples.

Create subagents that reference API policies:

**.claude/agents/api-designer.md:**
```markdown
You design REST APIs following company standards.

Before designing endpoints, fetch:
- §API.1 (endpoint design conventions)
- §API.2 (authentication requirements)
- §CODE.2 (error handling patterns)
```

## Advanced Features

The server supports advanced § notation features:

- **Range notation**: `§CODE.1-3` expands to sections 1, 2, and 3 (see [Policy Reference](POLICY_REFERENCE.md#range-notation) for complete syntax and rules)
- **Subsections**: `§API.3.1` for nested content organization
- **Hyphenated prefixes**: `§API-REST.1` resolves via base prefix
- **Automatic reference resolution**: Fetching `§CODE.2` also fetches any sections it references (like `§CODE.5`)

See [Policy Reference](POLICY_REFERENCE.md) for complete § notation syntax and examples.

## Troubleshooting

### Configuration Issues
- **Server won't start**: Check `MCP_POLICY_CONFIG` is set and points to valid file/pattern
- **No files found**: Verify glob pattern matches `.md` files
- **Windows paths**: Use forward slashes: `C:/path/to/policies.json`

### Section Issues
- **Section not found**: Check section exists and format is `## {§CODE.1}`
- **Prefix not recognized**: Verify policy file is in configured files list
- **Duplicates**: Same section ID in multiple files - remove from one

### Subagent Issues
- **Subagent ignoring policies**: Add explicit tool call instructions (see Step 5)
- **Stale content**: Edit policy file to trigger reload, or restart server

## Tips

- Use Claude Code to generate policy files from codebase patterns
- Use `mcp__policy-server__validate_references` tool to check subagent policy references
- Use `mcp__policy-server__extract_references` to find which subagents use specific policies

## Next Steps

- **Add more policies**: Create additional policy files matching your glob pattern
- **Organize with prefixes**: Use hyphenated prefixes (CODE-JS, CODE-PY) for language-specific standards
- **Create specialized subagents**: Build subagents for specific tasks (security review, performance review)
- **Cross-reference policies**: Link related sections with § notation for automatic dependency resolution
- **Validate references**: Use `mcp__policy-server__validate_references` tool before deploying subagents to production
- **Monitor updates**: Check server logs for `[WATCH]` and `[INDEX]` messages to see automatic updates in action

## Reference

- [Configuration Reference](CONFIGURATION_REFERENCE.md) - Detailed configuration options
- [Policy Reference](POLICY_REFERENCE.md) - Complete § notation syntax

## Examples

See the `tests/fixtures/sample-policies/` directory in the repository for example policy files with various section structures.
