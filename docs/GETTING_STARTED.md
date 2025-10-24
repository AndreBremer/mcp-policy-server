# Getting Started with Policy Documentation Server

This guide walks you through setting up the Policy Documentation Server from scratch. You'll create policy files, configure the server, and write your first agent that uses policy references.

**Note:** This server is best suited for AI tools that utilize subagents or prompt libraries (commands), such as Claude Code with its agent system or custom slash commands. The § notation works most effectively when agents can programmatically fetch policy sections via MCP tools.

## Step 1: Install the Server

See [INSTALLATION.md](INSTALLATION.md) for prerequisites and complete installation instructions. Once installed, continue with this guide to create your policies.

## Step 2: Write Policy Files

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

## Step 3: Create Configuration File

Create `policies.json` in your policies directory (created during installation) to map prefixes to policy files:

**policies/policies.json:**
```json
{
  "prefixes": {
    "CODE": "policy-coding"
  }
}
```

This maps `§CODE.1` to section 1 in `policy-coding.md`. See [Configuration Reference](./CONFIGURATION_REFERENCE.md) for advanced configuration options.

## Step 4: Test the Server

See [README.md](../README.md#available-mcp-tools) for complete tool documentation. To verify installation, ask Claude Code to list available policies:

```
Use the MCP list_sources tool to show me available policies
```

You should see your configured prefixes and policy files.

## Step 5: Create an Agent That Uses Policies

Create an agent file that references your policies.

**.claude/agents/code-reviewer.md:**
```markdown
You are a code reviewer ensuring adherence to team standards.

## Process

When reviewing code:

1. **Fetch relevant standards** using the MCP `fetch` tool:
   - §CODE.1 - General principles
   - §CODE.2 - Error handling
   - §CODE.3 - Testing requirements
   - §CODE.4 - Code review process

2. **Review the code** against fetched standards

3. **Provide feedback** structured as:
   - **Strengths**: What's done well
   - **Issues**: Specific violations with section references
   - **Recommendations**: How to fix with code examples

## Standards References

Before each review, fetch these sections:
- §CODE.1 (general principles)
- §CODE.2 (error handling)
- §CODE.3 (testing requirements)

The fetch tool will automatically retrieve any sections referenced within these (like §CODE.5 logging standards referenced from §CODE.2).

## Review Criteria

- Code readability and maintainability
- Error handling completeness
- Test coverage adequacy
- Adherence to style guidelines

Cite specific policy sections (§CODE.N) when noting violations.
```

## Step 6: Use the Agent

Invoke your code review agent with a code sample:

```
@code-reviewer please review this function:

[paste code here]
```

**What happens:**
1. Agent reads its instructions
2. Agent sees references to §CODE.1, §CODE.2, §CODE.3
3. Agent calls MCP `fetch` tool with those sections
4. Server returns requested sections PLUS §CODE.5 (referenced from §CODE.2)
5. Agent reviews code against current standards
6. Agent provides feedback with specific policy citations

## Step 7: Expand Your Policies

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

Update `policies.json` to add the API prefix. See [Configuration Reference](CONFIGURATION_REFERENCE.md#examples) for advanced examples:

```json
{
  "prefixes": {
    "CODE": "policy-coding",
    "API": "policy-api"
  }
}
```

Create agents that reference API policies:

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

### Server Won't Start

**Error:** "MCP_POLICY_CONFIG environment variable must be set"

**Solution:**
- Verify `env.MCP_POLICY_CONFIG` is present in configuration
- Use absolute path (not `~/` or relative paths)
- Point to `policies.json` file itself, not the directory

**Error:** "Policy configuration not found"

**Solution:**
- Verify file exists at the specified path
- Check file permissions (must be readable)
- Ensure no typos in path

### Server Not Appearing in MCP List

**Solution:**
- Restart your AI client after configuration changes
- Check configuration file syntax (valid JSON)
- Verify `command` and `args` are correct for your installation method

### Windows Path Issues

**Solution:**
- Always use forward slashes in JSON configuration files
- Example: `"MCP_POLICY_CONFIG": "C:/my-project/policies/policies.json"`
- Do not use backslashes (they require escaping)

### Section Not Found

**Error:** "Section §CODE.99 not found in policy-coding.md"

**Solution:**
- Verify section exists in policy file
- Check section marker format: `## {§CODE.99}` (with curly braces, see [Policy Reference](POLICY_REFERENCE.md))
- Ensure prefix matches (case-sensitive)
- Use `list_sources` tool to see available sections

### Prefix Not Recognized

**Error:** "Unknown prefix: MISSING"

**Solution:**
- Add prefix to `policies.json` prefixes object (see [Configuration Reference](CONFIGURATION_REFERENCE.md) for details)
- Create corresponding policy file
- Restart your AI client

### Agent Not Fetching Policies

**Symptom:** Agent responds without consulting policies

**Solution:**
- Make agent instructions explicit: "Use the MCP fetch tool to retrieve §CODE.1"
- List specific sections to fetch
- Include clear process steps (1. Fetch policies, 2. Apply to task)

### Stale Policy Content

**Symptom:** Agent using outdated policy content

**Solution:**
- Policies are read from files on each fetch
- Simply update markdown files and save
- No server restart needed
- Clear agent context/start new conversation if needed

## Next Steps

- **Add more policies**: Create additional policy files for different domains
- **Organize with prefixes**: Use hyphenated prefixes (CODE-JS, CODE-PY) for language-specific standards
- **Create specialized agents**: Build agents for specific tasks (security review, performance review)
- **Cross-reference policies**: Link related sections with § notation for automatic dependency resolution
- **Validate references**: Use `validate_references` tool before deploying agents to production

## Reference

- [Configuration Reference](CONFIGURATION_REFERENCE.md) - Detailed configuration options
- [Policy Reference](POLICY_REFERENCE.md) - Complete § notation syntax

## Examples

See the `tests/fixtures/sample-policies/` directory in the repository for example policy files with various section structures.
