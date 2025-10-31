# Best Practices

Patterns and strategies for using the MCP Policy Server effectively.

## Policy Organization

### File Structure

**Domain-based organization:**
```
policies/
  policy-coding.md       # General coding standards
  policy-api.md          # API design patterns
  policy-security.md     # Security requirements
  policy-database.md     # Data layer patterns
```

**When to split vs. consolidate:**
- Split when file exceeds 500 lines or domains have distinct owners
- Consolidate when sections frequently reference each other
- Use subsections before creating new files

### Naming Conventions

**Prefixes:**
- Uppercase alphabetic (CODE, API, SEC)
- 2-6 characters for readability
- Hyphenated for specialization (CODE-JS, CODE-PY)

**Section numbering:**
- Sequential (§CODE.1, §CODE.2)
- Leave gaps for future additions (1, 2, 5, 10)
- Use subsections (§CODE.2.1, §CODE.2.2)

**Files:**
- Consistent patterns: `policy-*.md`
- Descriptive names: `policy-api-rest.md` not `api.md`
- Lowercase, hyphens only

### Subsections

Use hierarchical organization:

```markdown
## {§API.3}
### Authentication

### {§API.3.1}
#### Token Validation
...

### {§API.3.2}
#### Session Management
...
```

**Benefits:**
- Fetch parent (§API.3) gets all content
- Fetch child (§API.3.1) gets granular content

**Avoid over-nesting:** Maximum 2 levels (§PREFIX.N.N)

## Version Control

### Commit Strategy

Separate policy and subagent changes:
```bash
# Good
git commit -m "Add §API.4 for rate limiting"
git commit -m "Update api-designer subagent to use §API.4"
```

### Breaking Changes

Deprecate first, remove later:

```markdown
## {§CODE.5}
### Logging Standards (DEPRECATED)
**Moved to §OBS.2**

See §OBS.2 for current requirements.
```

Don't renumber sections - breaks subagent references. Use gaps or subsections instead.

## Performance

### Efficient Fetching

Use range notation:
```markdown
# Efficient - 1 call
fetch_policies(["§CODE.1-5"])

# Inefficient - 5 calls
fetch_policies(["§CODE.1"])
fetch_policies(["§CODE.2"])
...
```

### Automatic Resolution

Design policies to leverage recursive resolution:

```markdown
## {§CODE.2}
### Error Handling
See §CODE.5 for logging and §SEC.3 for security.
```

Fetching §CODE.2 automatically includes §CODE.5 and §SEC.3.

## Workflow Patterns

### Policy-First Development

1. Define standards as policies
2. Create subagents that reference policies
3. Implement according to fetched standards
4. Review against policies

### Subagent Instructions

Make tool calls explicit:

```markdown
# Weak
Review code according to standards.

# Strong
1. Fetch §CODE.1-5 using mcp__policy-server__fetch_policies
2. Review code against fetched standards
3. Cite specific sections in feedback
```

### Policy Bundles

Create bundles that reference related policies:

```markdown
## {§BACKEND.1}
### Backend Standards

Follow:
- §CODE.1-5 (coding standards)
- §API.1-3 (API design)
- §DATA.1-2 (database patterns)
- §SEC.1-4 (security)
```

Subagents fetch one bundle, get all dependencies automatically.

### Language-Specific Standards

Use hyphenated prefixes:

```markdown
# policy-coding.md
## {§CODE.1}
General principles

# policy-coding-python.md
## {§CODE-PY.1}
Python type hints

# policy-coding-javascript.md
## {§CODE-JS.1}
JavaScript modules
```

Configure: `"files": ["./policies/policy-coding*.md"]`

Subagents request: `§CODE.1-3, §CODE-PY.1-2`

## Production

### Configuration

**Use absolute paths:**
```json
{
  "files": ["/etc/company/policies/policy-*.md"]
}
```

**Multi-team setup:**
```json
{
  "files": [
    "/shared/policies/policy-*.md",
    "/team-a/team-a-*.md"
  ]
}
```

### Repository Structure

Centralized policy repository:
```
company-policies/  # Standalone repo
  policies.json
  policies/
    policy-coding.md
    policy-api.md
```

Project repositories with policies as sub-repo:
```
project-a/
  company-policies/  # Git submodule or subtree
    policies.json
    policies/
      policy-coding.md
      policy-api.md
  .mcp.json  # Points to ./company-policies/policies/*.md
  .claude/
    agents/
      code-reviewer.md  # References §CODE.*, §API.* from company policies
```

Team workflow:
1. Update policies via PR to company-policies repo
2. Review and merge
3. Pull submodule updates in project repos
4. All projects' subagents auto-use updates (no restart needed for policy content changes)

### Monitoring

The MCP Policy Server logs to stderr with basic startup, file watching, and indexing events:
- `[STARTUP]` - Server initialization
- `[WATCH]` - File change detection
- `[INDEX]` - Section index rebuilds

For tool usage analytics (frequently fetched sections, failed lookups), you would need to:
1. Enable logging in your MCP client (Claude Code)
2. Parse client logs for `mcp__policy-server__fetch_policies` calls
3. Extract section parameters from tool invocations

**Note:** The server itself does not currently log individual tool calls or maintain usage metrics.

## Reference

- [Getting Started](GETTING_STARTED.md) - Initial setup
- [Configuration Reference](CONFIGURATION_REFERENCE.md) - Config options
- [Policy Reference](POLICY_REFERENCE.md) - § notation syntax
