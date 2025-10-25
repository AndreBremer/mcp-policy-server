# Best Practices

This guide covers advanced patterns, workflows, and strategies for using the MCP Policy Server effectively in production environments.

## Policy Organization

### File Structure

**Use domain-based organization:**
```
policies/
  policy-coding.md       # General coding standards
  policy-api.md          # API design patterns
  policy-security.md     # Security requirements
  policy-database.md     # Data layer patterns
  policy-deployment.md   # Release and deployment
```

**When to split vs. consolidate:**
- Split when domains have distinct owners or update cycles
- Split when file exceeds 500 lines or 20 sections
- Consolidate related subsections under one prefix
- Consolidate when sections frequently reference each other

**Example - Too granular:**
```
policy-api-rest.md
policy-api-graphql.md
policy-api-websocket.md
```

**Better - Organized by subsections:**
```markdown
# API Standards (policy-api.md)

## {§API.1}
### REST Endpoint Design
...

## {§API.2}
### GraphQL Schema Design
...

## {§API.3}
### WebSocket Event Patterns
...
```

### Naming Conventions

**Prefix naming:**
- Use uppercase alphabetic prefixes (CODE, API, SEC)
- Keep prefixes 2-6 characters for readability
- Use hyphenated extensions for specialization (CODE-JS, CODE-PY)
- Avoid underscores or special characters

**Section numbering:**
- Number whole sections sequentially (§CODE.1, §CODE.2)
- Use subsections for related details (§CODE.2.1, §CODE.2.2)
- Leave gaps for future insertions (1, 2, 5, 10 vs 1, 2, 3, 4)
- Document deprecated sections rather than renumbering

**File naming:**
```json
{
  "prefixes": {
    "CODE": "policy-coding",
    "API": "policy-api",
    "SEC": "policy-security"
  }
}
```

Hyphenated extensions (CODE-JS, CODE-PY) automatically resolve to the base prefix. You don't need to define them explicitly.

### Subsection Strategy

**Use subsections for hierarchical content:**

```markdown
## {§API.3}
### Authentication

All endpoints require authentication.

### {§API.3.1}
#### Token Validation

Validate tokens on every request:
- Check signature using public key
- Verify expiration timestamp
- Confirm required scopes present

### {§API.3.2}
#### Session Management

Sessions expire after 24 hours:
- Store session data in Redis
- Refresh tokens 1 hour before expiry
- Clear sessions on logout
```

**Benefits:**
- Fetch parent (§API.3) gets all authentication content
- Fetch child (§API.3.1) gets only token validation
- Agents can request granular or comprehensive content

**Avoid over-nesting:**
- Maximum 2 levels deep (§PREFIX.N.N)
- Deeper nesting suggests content should be split
- Use cross-references instead: "See §AUTH.2 for details"

## Version Control

### Commit Strategy

**Separate policy and agent changes:**

```bash
# Bad - mixed concerns
git commit -m "Update API standards and agents"

# Good - isolated changes
git commit -m "Add §API.4 for rate limiting requirements"
git commit -m "Update api-designer agent to reference §API.4"
```

**Rationale:**
- Policy changes affect multiple agents
- Easier to track which agents need updates
- Clearer rollback scenarios

### Breaking Changes

**When renaming or removing sections:**

1. **Deprecate first, remove later:**
```markdown
## {§CODE.5}
### Logging Standards (DEPRECATED)

**This section has moved to §OBS.2 (Observability Standards).**

See §OBS.2 for current logging requirements.
```

2. **Update agents in stages:**
```bash
# Stage 1: Add new section
git commit -m "Add §OBS.2 to replace §CODE.5"

# Stage 2: Update agents
git commit -m "Migrate api-designer agent to §OBS.2"
git commit -m "Migrate code-reviewer agent to §OBS.2"

# Stage 3: Remove deprecated section
git commit -m "Remove deprecated §CODE.5"
```

3. **Use validation tools:**
```
@agent-policy-maintainer find all agents still referencing §CODE.5
```

### Migration Workflow

**Renumbering sections safely:**

```markdown
# Before
## {§API.1}
### REST Endpoints
...

## {§API.2}
### GraphQL APIs
...

# After - add new section
## {§API.1}
### REST Endpoints
...

## {§API.1.5}
### REST Versioning (NEW)
...

## {§API.2}
### GraphQL APIs
...
```

**Why not renumber?**
- Agents reference sections by number
- Mass updates error-prone
- Git history becomes unclear
- Subsections or gaps better preserve stability

## Performance Optimization

### Efficient Fetching

**Use range notation:**

```markdown
# Inefficient - 5 separate tool calls
fetch_policies(["§CODE.1"])
fetch_policies(["§CODE.2"])
fetch_policies(["§CODE.3"])
fetch_policies(["§CODE.4"])
fetch_policies(["§CODE.5"])

# Efficient - 1 tool call
fetch_policies(["§CODE.1-5"])
```

**Group related sections:**

```markdown
# Agent instructions
Before reviewing code, fetch all coding standards:
- §CODE.1-5 (core standards)
- §SEC.1-3 (security requirements)
```

### Reference Resolution

**Leverage automatic resolution:**

```markdown
# policy-coding.md
## {§CODE.2}
### Error Handling

All functions must handle errors explicitly.
See §CODE.5 for logging standards.
See §SEC.3 for security error patterns.
```

When fetching `§CODE.2`, server automatically includes `§CODE.5` and `§SEC.3`. Agents don't need to make separate calls.

**Design policies for resolution:**
- Cross-reference related sections liberally
- Let resolution gather dependencies
- Reduces agent tool call complexity

### Tool Selection

**`fetch_policies` vs `resolve_references`:**

```markdown
# Use fetch_policies for content
fetch_policies(["§CODE.1-3"])
# Returns: Full section text

# Use resolve_references for discovery
resolve_references(["§CODE.2"])
# Returns: {
#   "policy-coding.md": ["§CODE.2", "§CODE.5"],
#   "policy-security.md": ["§SEC.3"]
# }
```

**When to use resolve_references:**
- Understanding policy dependencies
- Building section maps
- Validating reference chains
- Generating documentation

## Workflow Patterns

### Policy-First Development

**Start with requirements as policies:**

1. **Define standards before coding:**
```markdown
## {§DATA.1}
### User Data Schema

User records contain:
- id (UUID v4)
- email (validated, unique, indexed)
- created_at (ISO 8601 timestamp)
- status (enum: active, suspended, deleted)
```

2. **Create implementation agent:**
```markdown
Before implementing user management:
1. Fetch §DATA.1 for schema requirements
2. Fetch §API.1 for endpoint patterns
3. Fetch §SEC.2 for validation rules
4. Implement according to fetched standards
```

3. **Use policies in reviews:**
```markdown
When reviewing user-service PR:
1. Fetch §DATA.1, §API.1, §SEC.2
2. Verify implementation matches policies
3. Note deviations with section citations
```

### Code-First Documentation

**Extract standards from existing code:**

1. **Analyze codebase:**
```
Review the authentication middleware and create policy §AUTH.1
documenting the established patterns at policies/policy-auth.md.
```

2. **Validate extraction:**
```
@agent-code-reviewer verify that @src/auth/middleware.ts follows §AUTH.1
```

3. **Iterate until aligned:**
```
Update §AUTH.1 to reflect the token refresh pattern we actually use
```

### PR Review Integration

**Create review checklist agent:**

```markdown
---
name: pr-reviewer
description: Reviews PRs against policy compliance
tools: mcp__policy-server__fetch_policies, Read, Bash
---

## Process

1. **Identify changed areas** using git diff
2. **Fetch relevant policies** based on file paths:
   - src/api/* → §API.1-5
   - src/db/* → §DATA.1-3
   - src/auth/* → §SEC.1-4

3. **Review changes** against policies
4. **Generate report** with:
   - Compliance status per policy section
   - Required changes with code examples
   - Approval recommendation
```

**Use in CI/CD:**
```bash
# .github/workflows/pr-review.yml
- name: Policy Review
  run: |
    claude-code "@agent-pr-reviewer review this PR"
```

### Multi-Agent Coordination

**Create policy bundles:**

```json
{
  "prefixes": {
    "BACKEND": "policy-bundle-backend",
    "FRONTEND": "policy-bundle-frontend",
    "DATA": "policy-bundle-data"
  }
}
```

```markdown
# policy-bundle-backend.md

## {§BACKEND.1}
### Backend Development Standards

When implementing backend features, follow:
- §CODE.1-5 (coding standards)
- §API.1-3 (API design)
- §DATA.1-2 (database patterns)
- §SEC.1-4 (security requirements)
- §OBS.1-2 (observability)
```

**Agents reference bundles:**
```markdown
Before implementing any backend feature:
1. Fetch §BACKEND.1 for comprehensive standards
2. All dependencies automatically resolved
```

**Benefits:**
- Consistent standard sets across agents
- Single update point for related policies
- Simplified agent instructions

### Specialized Extensions

**Use hyphenated prefixes with extension files:**

```json
{
  "prefixes": {
    "CODE": "policy-coding"
  }
}
```

The system automatically discovers extension files matching `{stem}-*.md`:

```markdown
# policy-coding.md (general standards)
## {§CODE.1}
### General Principles
...

# policy-coding-python.md (Python-specific, discovered automatically)
## {§CODE-PY.1}
### Python Type Hints

All functions require type hints:
- Parameters annotated with types
- Return types explicitly declared
- Use typing module for generics

Follow §CODE.1 for general principles.

# policy-coding-javascript.md (also discovered automatically)
## {§CODE-JS.1}
### JavaScript Module Patterns
...
```

When you reference §CODE-PY.1, the system:
1. Extracts base prefix: CODE-PY → CODE
2. Looks up stem: CODE → "policy-coding"
3. Discovers all matching files: policy-coding.md, policy-coding-python.md, policy-coding-javascript.md
4. Searches all files for §CODE-PY.1

**Agent selection:**
```markdown
# JavaScript agent
Fetch §CODE.1-3 and §CODE-JS.1-2

# Python agent
Fetch §CODE.1-3 and §CODE-PY.1-3

# Go agent
Fetch §CODE.1-3 and §CODE-GO.1-2
```

## Debugging and Troubleshooting

### Discovery Tools

**List available sections:**
```
Use list_sources to show all available policy files and their prefixes
```

**Understand agent dependencies:**
```
Use extract_references on @.claude/agents/api-designer.md to see
what policies it references
```

**Validate reference chains:**
```
Use resolve_references for §API.1 to see what other sections
it transitively includes
```

### Response Chunking

**When fetching large policy sets:**

Server chunks responses at 10000 tokens, splitting at section boundaries.

**First response includes:**
```json
{
  "sections": [...],
  "continuation": "chunk:1",
  "hasMore": true
}
```

**Fetch remaining chunks:**
```
fetch_policies(["§CODE.1-20"], continuation="chunk:1")
```

**Agent handling:**
```markdown
When fetching large policy ranges:
1. Make initial fetch_policies call
2. Check for continuation token in response
3. If present, make additional calls with token
4. Aggregate all sections before proceeding
```

### Common Issues

**Problem: Agent ignoring policies**

Solution - Make instructions explicit:
```markdown
# Weak
Review code according to our standards.

# Strong
Before reviewing:
1. Use fetch_policies tool to retrieve §CODE.1-5
2. Read the fetched policy content
3. Apply each policy section to the code review
4. Cite specific section numbers in feedback
```

**Problem: Stale policy content**

Solution - Policies read from disk on each fetch. No caching. Simply save file changes.

**Problem: Duplicate section IDs**

Solution - Server logs warnings at startup. Use validator:
```
Use validate_references to check for duplicate sections in our policies
```

**Problem: Circular references**

Server handles circular references automatically. `§A.1 → §A.2 → §A.1` resolves without infinite loops.

## Production Deployment

### Environment Configuration

**Use absolute paths:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "node",
      "args": ["/opt/mcp-policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "/opt/company-policies/policies.json"
      }
    }
  }
}
```

**Windows paths in JSON:**
```json
{
  "env": {
    "MCP_POLICY_CONFIG": "C:/company/policies/policies.json"
  }
}
```

Use forward slashes, not backslashes.

### Policy Repository Structure

**Centralized policy repo:**
```
company-policies/
  policies.json
  policies/
    policy-coding.md
    policy-api.md
    policy-security.md
  agents/
    code-reviewer.md
    api-designer.md
  README.md
```

**Team workflow:**
1. Developers propose policy changes via PR
2. Team reviews policy updates
3. Merge updates policy files
4. Agents automatically use updated content
5. No server restart needed

### Multi-Team Scenarios

**Shared policies with team extensions:**

```
# Team A configuration
{
  "env": {
    "MCP_POLICY_CONFIG": "/shared/policies/policies.json"
  }
}

# policies.json
{
  "prefixes": {
    "CODE": "policy-coding",
    "TEAM-A": "team-a-standards"
  }
}
```

**Team-specific agents:**
```markdown
Team A agents fetch:
- §CODE.1-5 (company-wide standards)
- §TEAM-A.1-3 (team-specific patterns)
```

### Monitoring and Observability

**Log policy fetches:**

Server logs all fetch_policies calls. Monitor for:
- Frequently fetched sections (candidates for bundling)
- Failed section lookups (broken references)
- Large continuation chains (performance issue)

**Track policy usage:**
```bash
# Extract policy references from agent logs
grep "fetch_policies" agent.log | \
  jq '.sections[]' | \
  sort | uniq -c | sort -rn
```

**Identify unused policies:**
```
@agent-policy-maintainer scan all agents and report any policy
sections that are defined but never referenced
```

## Advanced Patterns

### Policy as Contract

**Use policies as interface definitions:**

```markdown
## {§API.5}
### Payment Webhook Contract

Payment provider sends webhook to /webhooks/payment:

**Request:**
- POST /webhooks/payment
- Content-Type: application/json
- X-Signature: HMAC-SHA256 of body

**Payload:**
{
  "event": "payment.completed" | "payment.failed",
  "payment_id": "string (UUID)",
  "amount": "number (cents)",
  "timestamp": "string (ISO 8601)"
}

**Response:**
- 200 OK: Webhook processed
- 401 Unauthorized: Invalid signature
- 500 Error: Processing failed (provider will retry)
```

**Agent implementation:**
```markdown
Implement payment webhook handler according to §API.5 contract.
Validate all fields, verify signature, return proper status codes.
```

### Policy-Driven Testing

**Define test requirements:**

```markdown
## {§TEST.1}
### Unit Test Requirements

Every feature requires:
- Happy path test
- Error condition tests
- Boundary value tests
- Mock external dependencies

Minimum 80% code coverage.
```

**Test generation agent:**
```markdown
Generate unit tests for @src/payment/processor.ts following §TEST.1.
Include all required test categories.
```

### Documentation Generation

**Generate docs from policies:**

```markdown
Create API documentation by fetching §API.1-5 and formatting
as OpenAPI specification.
```

**Policy-based README:**
```markdown
Update README.md development section with coding standards
from §CODE.1-3. Format as markdown checklist.
```

## Reference

- [Getting Started](GETTING_STARTED.md) - Initial setup and basic usage
- [Configuration Reference](CONFIGURATION_REFERENCE.md) - Configuration options
- [Policy Reference](POLICY_REFERENCE.md) - § notation syntax
