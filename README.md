# MCP Policy Server

**Give your Claude Code subagents instant, token-efficient access to your team's standards, guidelines, and best practices.**

Stop copying entire policy documents into prompts. Reference specific sections with compact § notation and let subagents fetch exactly what they need, when they need it.

**Designed for Claude Code subagents and commands (slash commands).** May work with other MCP-compatible clients that support agent-based workflows.

## Why Use This?

### The Problem

Teams document standards in markdown files (coding guidelines, architecture principles, deployment procedures). When you want Claude Code subagents to follow these standards, you're stuck with imperfect options:

- **Reference entire documents**: Wastes tokens, hits context limits
- **Maintain each subagent separately**: Unnecessary duplication, hard to keep consistent
- **Put everything in memory like CLAUDE.md**: Signal loss, high token costs due to implicit context

### The Solution

Reference sections with notation like `§API.7` or `§DEPLOY.3.1-5`. Subagents fetch referenced sections on demand. Your standards stay in markdown files. Subagents always get current content without token waste.

### Key Benefits

- **No wasted context**: Fetch only needed sections, not entire documents
- **Always current**: Update files, changes appear automatically (no restart needed for file edits; new files matching existing patterns require restart)
- **Automatic resolution**: Reference `§DOC.5`, server fetches it plus any sections it references
- **Fast lookups**: O(1) retrieval via section indexing
- **Per-project policies**: Same installation, different policy sets per project

## Quick Example

**Subagent file (`.claude/agents/code-reviewer.md`):**
```markdown
---
name: code-reviewer
description: Reviews code changes for compliance with policy standards
tools: mcp__policy-server__fetch_policies, Read, Glob
---

You are a code reviewer following our team standards.

**Before reviewing code:** call `mcp__policy-server__fetch_policies` with `{"sections": ["§API.7", "§CODE.3"]}`

This retrieves:
- §API.7 - REST API Design Principles
- §CODE.3 - Error Handling
```

**Policy file (`policies/policy-api.md`):**
```markdown
## {§API.7}
### REST API Design Principles

All endpoints follow RESTful conventions:
- Use proper HTTP verbs (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Include request/response examples

See also §CODE.3 for error handling.
```

**What happens:**
Subagent calls `mcp__policy-server__fetch_policies` with those sections. Server returns requested sections plus embedded references (`§CODE.3`). See [Getting Started](docs/GETTING_STARTED.md#step-6-use-the-agent) for detailed workflow.

## Installation

### Quick Start (Claude Code)

**Linux/macOS:**
```bash
claude mcp add-json policy-server ('{' `
  '"type": "stdio", "command": "npx",' + `
  '"args": ["-y", "@andrebremer/mcp-policy-server"], ' + `
  '"env": {"MCP_POLICY_CONFIG": "./policies/*.md"}}') `
  --scope project
```

**Windows:**
```powershell
claude mcp add-json policy-server ('{' `
  '"type": "stdio", "command": "cmd",' + `
  '"args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"], ' + `
  '"env": {"MCP_POLICY_CONFIG": "./policies/*.md"}}') `
  --scope project
```

### Manual Configuration

Create `.mcp.json` in your project root:

**Linux/macOS:**
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

**Windows:**
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

Restart Claude Code after creating `.mcp.json`.

See [Installation Guide](docs/INSTALLATION.md) for detailed setup and development installation.

## Configuration

### Direct Glob Pattern (Recommended)

```bash
MCP_POLICY_CONFIG="./policies/*.md"
```

Supports brace expansion:
```bash
MCP_POLICY_CONFIG="./{policies,docs}/*.md"
```

### JSON File

If not set, server loads `./policies.json` by default.

Create `policies.json` for multiple patterns:
```json
{
  "files": [
    "./policies/policy-*.md",
    "./policies/**/rules-*.md"
  ]
}
```

Point to it:
```bash
MCP_POLICY_CONFIG="./policies.json"
```

### Inline JSON

```bash
MCP_POLICY_CONFIG='{"files": ["./policies/*.md"]}'
```

### Glob Patterns

- `*` - Match any characters (e.g., `./policies/policy-*.md`)
- `**` - Include subdirectories (e.g., `./policies/**/*.md`)
- `{a,b}` - Alternatives (e.g., `./{policies,docs}/*.md`)

See [Configuration Reference](docs/CONFIGURATION_REFERENCE.md) for details.

## Removing the Server

```bash
claude mcp remove policy-server -s project
```

## Getting Started

1. [Install the server](docs/INSTALLATION.md)
2. Create policy files with § notation (see [Getting Started](docs/GETTING_STARTED.md))
3. Configure `MCP_POLICY_CONFIG`
4. Create subagents that reference policies
5. Restart Claude Code

## Available MCP Tools

### `mcp__policy-server__fetch_policies` - Retrieve Policy Sections
Fetch sections with automatic reference resolution:
```json
{"sections": ["§API.7", "§CODE.3"]}
```

### `mcp__policy-server__extract_references` - Find § References
Scan files for policy references:
```json
{"file_path": "/path/to/agent.md"}
```

### `mcp__policy-server__validate_references` - Check References Exist
Verify sections exist:
```json
{"references": ["§API.7", "§CODE.3"]}
```

### `mcp__policy-server__list_sources` - See Available Policies
List all configured policy files and prefixes.

### Other Tools
- `mcp__policy-server__resolve_references` - Map sections to source files

## Use Cases

- **Code Review**: Reference coding standards, style guides, architecture principles
- **Deployment**: Reference procedures, security checklists, rollback protocols
- **Documentation**: Reference standards, templates, review processes
- **Testing**: Reference coverage requirements, mocking patterns, integration setup

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Setup instructions
- [Getting Started](docs/GETTING_STARTED.md) - Creating policies and agents
- [Configuration Reference](docs/CONFIGURATION_REFERENCE.md) - Config options
- [Policy Reference](docs/POLICY_REFERENCE.md) - § notation syntax
- [Best Practices](docs/BEST_PRACTICES.md) - Patterns and strategies

## License

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)
