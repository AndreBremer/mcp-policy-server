# Getting Started with MCP Policy Server

This guide walks you through setting up the Policy Server from scratch. You'll create policy files, configure the server, and write your first subagent that uses policy references.

**Note:** Designed for Claude Code subagents and commands (slash commands). The § notation works most effectively when subagents can programmatically fetch policy sections via MCP tools.

## Step 1: Install the Server

See [INSTALLATION.md](INSTALLATION.md) for prerequisites and complete installation instructions. Once installed, continue with this guide to create your policies.

## Step 2: Create Policy Files

Create your first policy file with section markers.

**policies/policy-example.md:**
```markdown
# Example Policy Document

## {§EXAMPLE.1} First Section

This is the content for the first section of your policy documentation.

## {§EXAMPLE.2} Second Section

Content for the second section goes here.

See §EXAMPLE.3 for additional information.

## {§EXAMPLE.3} Third Section

Additional policy details and guidelines.

Refer back to §EXAMPLE.1 for context.
```

**Key points:**
- Use format `## {§PREFIX.N}` for section markers (see [Policy Reference](POLICY_REFERENCE.md) for complete syntax)
- Sections can reference other sections (§EXAMPLE.3 referenced from §EXAMPLE.2)

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
      "args": ["-y", "@rcrsr/mcp-policy-server"],
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
      "args": ["/c", "npx", "-y", "@rcrsr/mcp-policy-server"],
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
      "args": ["-y", "@rcrsr/mcp-policy-server"],
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
      "args": ["/c", "npx", "-y", "@rcrsr/mcp-policy-server"],
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
      "args": ["-y", "@rcrsr/mcp-policy-server"],
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
      "args": ["/c", "npx", "-y", "@rcrsr/mcp-policy-server"],
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

**.claude/agents/policy-agent.md:**
````markdown
---
name: policy-agent
description: Example agent that uses policy sections
tools: mcp__policy-server__fetch_policies, Read
model: inherit
---

You are an agent that follows team policies.

## Process

When completing tasks:

1. **Fetch relevant policies** by calling the `mcp__policy-server__fetch_policies` tool with:
   ```json
   {"sections": ["§EXAMPLE.1", "§EXAMPLE.2"]}
   ```
   This retrieves the policy sections from your configured files.

2. **Apply the policies** to your work

3. **Provide output** that follows the fetched standards

## Important

Always fetch policies FIRST. The § references in step 1 are placeholders - you must actually call the tool to get the policy content.

Cite specific policy sections when explaining your decisions.
````

## Step 6: Use the Subagent

Invoke your subagent:

```
@agent-policy-agent complete the task
```

**What happens:**
1. Subagent reads its instructions
2. Subagent sees references to §EXAMPLE.1, §EXAMPLE.2
3. Subagent calls MCP `mcp__policy-server__fetch_policies` tool with those sections
4. Server returns requested sections PLUS §EXAMPLE.3 (referenced from §EXAMPLE.2)
5. Subagent applies policies to complete the task
6. Subagent provides output with specific policy citations

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
## {§EXAMPLE.1} First Section

Updated content here...  # <-- Save the file

# Next tool call automatically sees the changes
```

**Limitations:**
- New files matching existing glob patterns require server restart
- Configuration changes (adding new patterns) require server restart
- Files on network drives or WSL may have delayed updates

## Step 8: Expand Your Policies

Add more policy files as needed:

**policies/policy-other.md:**
```markdown
# Additional Policies

## {§OTHER.1} First Policy

Content for another policy section.

## {§OTHER.2} Second Policy

Additional guidelines and standards.

See §EXAMPLE.1 for related information.
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

The pattern `./policies/policy-*.md` matches both `policy-example.md` and `policy-other.md`. Restart the server to detect the new file.

See [Configuration Reference](CONFIGURATION_REFERENCE.md#examples) for advanced examples.

Create subagents that reference multiple policies:

**.claude/agents/multi-policy-agent.md:**
```markdown
You are an agent that follows multiple policy categories.

Before proceeding, fetch:
- §EXAMPLE.1 (first example section)
- §OTHER.1 (other policy section)
- §OTHER.2 (additional guidelines)
```

## Advanced Features

The server supports advanced § notation features:

- **Range notation**: `§EXAMPLE.1-3` expands to sections 1, 2, and 3 (see [Policy Reference](POLICY_REFERENCE.md#range-notation) for complete syntax and rules)
- **Subsections**: `§EXAMPLE.1.1` for nested content organization
- **Hyphenated prefixes**: `§PREFIX-EXT.1` resolves via base prefix
- **Automatic reference resolution**: Fetching `§EXAMPLE.2` also fetches any sections it references (like `§EXAMPLE.3`)

See [Policy Reference](POLICY_REFERENCE.md) for complete § notation syntax and examples.

## Troubleshooting

### Configuration Issues
- **Server won't start**: Check `MCP_POLICY_CONFIG` is set and points to valid file/pattern
- **No files found**: Verify glob pattern matches `.md` files
- **Windows paths**: Use forward slashes: `C:/path/to/policies.json`

### Section Issues
- **Section not found**: Check section exists and format is `## {§PREFIX.1}`
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
- **Organize with prefixes**: Use hyphenated prefixes for category organization
- **Create specialized subagents**: Build subagents for specific tasks
- **Cross-reference policies**: Link related sections with § notation for automatic dependency resolution
- **Validate references**: Use `mcp__policy-server__validate_references` tool before deploying subagents
- **Monitor updates**: Check server logs for `[WATCH]` and `[INDEX]` messages to see automatic updates in action

## Reference

- [Configuration Reference](CONFIGURATION_REFERENCE.md) - Detailed configuration options
- [Policy Reference](POLICY_REFERENCE.md) - Complete § notation syntax

## Examples

See the `tests/fixtures/sample-policies/` directory in the repository for example policy files with various section structures.
