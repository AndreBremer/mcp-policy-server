# Policy Documentation Server

**Give your AI agents instant, token-efficient access to your team's standards, guidelines, and best practices.**

Stop copying entire policy documents into prompts. Reference specific sections with compact § notation and let agents fetch exactly what they need, when they need it.

**Best suited for AI tools utilizing subagents or prompt libraries (commands).** Tested with Claude Code. May work with other MCP-compatible clients that support agent-based workflows.

## Why Use This?

### The Problem

Teams document standards in markdown files (coding guidelines, architecture principles, deployment procedures). When you want AI agents to follow these standards, you face a dilemma:

- **Copy everything into prompts, full memory, or markdown files**: Wastes tokens, requires agents to discover and read entire documents to select relevant information, hits context limits, makes prompts unmaintainable
- **Copy nothing**: Agents don't follow your standards, output quality suffers
- **Manually copy specific sections**: Time-consuming, error-prone, references get stale

### The Solution

Reference policy sections with compact notation like `§API.7` or `§DEPLOY.3.1-5`. Agents automatically fetch referenced sections on demand. Your standards stay in markdown files. Agents always get current, relevant content without token waste.

### Key Benefits

- **No unreliable discovery**: Direct section references eliminate file searching and guesswork
- **No wasted context**: Fetch only the sections you need, not entire documents
- **Shared standards**: Single source of truth maintained across all agents automatically
- **Fast mechanical lookups**: Hard references, no semantic search, instant retrieval
- **Always current**: Update markdown files once, all agents get latest standards
- **Automatic resolution**: Reference §DOC.5, server fetches §DOC.5 plus any sections it references
- **Per-project policies**: Same server installation, different policy sets per project

## Quick Example

**Note:** Examples below use CODE, API, and TEST as policy prefixes. These are user-defined prefixes you configure in policies.json. You can use any prefix naming that fits your team's needs.

**Agent file (`.claude/agents/code-reviewer.md`):**
```markdown
---
name: code-reviewer
description: Reviews code changes for compliance with policy standards
tools: mcp__policy-server__fetch_policies, Read, Glob
model: inherit
---

You are a code reviewer following our team standards.

**Before reviewing code:** use fetch_policies to retrieve the relevant policies:
- §API.7 - REST API Design Principles
```

**Policy file (`policies/policy-api.md`):**
```markdown
## {§API.7} - REST API Design Principles

All endpoints follow RESTful conventions:
- Use proper HTTP verbs (GET, POST, PUT, DELETE)
- Return appropriate status codes (200, 201, 400, 404, 500)
- Include request/response examples

See also §CODE.3 for error handling implementation.
```

**What happens:**
When the agent calls MCP fetch_policies with those sections, the server returns requested sections plus any embedded references (like §CODE.3 mentioned in §API.7). See [Getting Started Guide](docs/GETTING_STARTED.md#step-6-use-the-agent) for detailed workflow.

See [Policy Reference](docs/POLICY_REFERENCE.md) for complete § notation syntax.

## Getting Started

See [Installation Guide](docs/INSTALLATION.md) to set up the server, then [Getting Started](docs/GETTING_STARTED.md) to create policies.

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Installation and setup
- [Getting Started Guide](docs/GETTING_STARTED.md) - Creating policies and configuring agents
- [Configuration Reference](docs/CONFIGURATION_REFERENCE.md) - Detailed configuration options
- [Policy Reference](docs/POLICY_REFERENCE.md) - Complete § notation syntax

## Available MCP Tools

### `fetch_policies` - Retrieve Policy Sections
Fetch one or more policy sections. Automatically resolves embedded § references.

```json
{"sections": ["§API.7", "§CODE.3", "§TEST.5"]}
```

### `extract_references` - Find All § References
Scan a file to find all policy references.

```json
{"file_path": "/path/to/agent.md"}
```
Returns: `["§API.7", "§CODE.3"]`

### `validate_references` - Check References Exist
Verify policy sections exist before using them.

```json
{"references": ["§API.7", "§MISSING.1"]}
```

### `list_sources` - See Available Policies
List all configured policy files and their prefixes.

### Other Tools
- `resolve_references` - Map sections to source files
- `inspect_context` - Debug server configuration

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed usage examples.

## Use Cases

### Code Review Agents
Reference coding standards, style guides, architecture principles. Agents fetch only relevant sections for the code being reviewed.

### Deployment Agents
Reference deployment procedures, security checklists, rollback protocols. Agents get step-by-step guidance for specific deployment scenarios.

### Documentation Agents
Reference documentation standards, template requirements, review processes. Agents maintain consistency across all generated docs.

### Testing Agents
Reference test coverage requirements, mocking patterns, integration test setup. Agents write tests that match your team's standards.

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidelines and architecture overview.

## Troubleshooting

See [Getting Started Guide](docs/GETTING_STARTED.md#troubleshooting) for installation, configuration, and usage issues.

## License

GPL-3.0-or-later
