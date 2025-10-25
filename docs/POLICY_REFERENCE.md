# Policy Reference

Reference for § notation syntax and policy file structure.

**Note:** Examples use DOC, API, CODE, and GUIDE prefixes. These are user-defined prefixes configured in policies.json. Choose any naming scheme that fits your organizational structure.

## Overview

The § (section sign) notation references specific policy documentation sections. Supports single sections, subsections, ranges, and hyphenated prefix extensions.

## Format

### Basic Format

```
§PREFIX.N[.N...][−N]
```

**Components:**
- `§` - Required section symbol (U+00A7)
- `PREFIX` - Uppercase prefix identifier (DOC, API, GUIDE, etc.)
- `.N` - Dot-separated section numbers (numeric only)
- `−N` - Optional range end (hyphen followed by number)

### Format Rules

1. **§ symbol required** - All references start with §
2. **PREFIX uppercase** - Must match configuration (DOC not doc)
3. **Section numbers numeric** - No letters or special characters
4. **Dot separators** - Separate subsections with dots
5. **Hyphen for ranges** - Single hyphen between start and end

## Single Sections

### Section Levels

**Top-level (§PREFIX.N):**
```markdown
## {§DOC.1}
Section content...
```

**Subsections (§PREFIX.N.N):**
```markdown
### {§DOC.4.1}
Subsection content...
```

**Deep subsections (§PREFIX.N.N.N):**
```markdown
#### {§DOC.4.1.2}
Deep subsection content...
```

**Examples:**
- `§DOC.1` - Top-level section
- `§DOC.4.1` - Subsection
- `§DOC.4.1.2` - Deep subsection

## Range Notation

Ranges expand to all sections between start and end (inclusive).

**Subsection ranges (§PREFIX.N.N-N):**
```
§DOC.4.1-3 expands to §DOC.4.1, §DOC.4.2, §DOC.4.3
§API.2.5-8 expands to §API.2.5, §API.2.6, §API.2.7, §API.2.8
```

**Section ranges (§PREFIX.N-N):**
```
§DOC.2-4 expands to §DOC.2, §DOC.3, §DOC.4
§GUIDE.1-5 expands to §GUIDE.1, §GUIDE.2, §GUIDE.3, §GUIDE.4, §GUIDE.5
```

### Range Rules

1. **Start < End** - Range start must be less than range end
2. **Same level** - Start and end at same depth
3. **Same parent** - Subsection ranges share same parent
4. **Inclusive** - Both start and end included

**Valid ranges:**
- `§DOC.1-3` - Section range
- `§DOC.4.1-3` - Subsection range with same parent

**Invalid ranges:**
- `§DOC.1-3.2` - Mixed depth
- `§DOC.4.1-5` - Different depth levels
- `§DOC.4.1-5.3` - Different parents
- `§DOC.5-2` - Backwards (start > end)

## Hyphenated Prefixes

### Format

```
§BASE-EXTENSION.N
```

**Components:**
- `BASE` - Primary prefix (DOC, API, GUIDE)
- `-` - Single hyphen separator
- `EXTENSION` - Extension identifier (GUIDE, REST, CORE)
- `.N` - Section numbers

### Resolution Process

The server extracts the base prefix and searches all matching files:

1. Split on first hyphen (`APP-HOOK` → `APP`)
2. Find stem in configuration (`APP` → `policy-application`)
3. Search all files matching `{stem}.md` and `{stem}-*.md`
4. All files merge into single namespace for that prefix

**Important:** File names organize content for humans. Extensions are section identifiers, not file selectors. `§APP-HOOK.1` searches all `policy-application*.md` files.

**Examples:**
```
§DOC-GUIDE.1 → Searches policy-documentation.md, policy-documentation-*.md
§API-REST.2 → Searches policy-api.md, policy-api-*.md
§GUIDE-QUICK.3 → Searches policy-guide.md, policy-guide-*.md
```

### Extension Examples

**Organizing by concern:**
```markdown
## {§DOC.1} Overview
## {§DOC-GUIDE.1} Quick Start
## {§DOC-API.1} API Reference

## {§API.1} General Guidelines
## {§API-REST.1} REST APIs
## {§API-GRAPHQL.1} GraphQL APIs

## {§SYS.1} Core System
## {§SYS-UTIL.1} Utilities
## {§SYS-TEST.1} Testing
```

**Note:** No need to add extensions to `policies.json`. They resolve automatically via base prefix extraction.

## Embedded References

### Automatic Resolution

The server resolves § references embedded in section content.

**Example:**
```markdown
## {§DOC.1} Overview
This section covers basic concepts. For details see §DOC.4.1 and §API.2.
```

Fetching §DOC.1 returns all three sections (§DOC.1, §DOC.4.1, §API.2).

### Recursive Resolution

Resolution continues until no references remain.

**Example chain:**
```markdown
## {§DOC.1} See §DOC.2 for details...
## {§DOC.2} Refer to §DOC.3 for examples...
## {§DOC.3} Check §API.1 for implementation...
## {§API.1} Final section with no references...
```

Fetching §DOC.1 returns all four sections.

### Deduplication

The server removes duplicates:

- Parent sections include children (§DOC.4 includes §DOC.4.1, §DOC.4.2)
- Multiple references to same section fetched once

## Parent-Child Relationships

### Hierarchical Structure

Sections form implicit hierarchies:

```
§DOC.4
  ├─ §DOC.4.1
  ├─ §DOC.4.2
  │   ├─ §DOC.4.2.1
  │   └─ §DOC.4.2.2
  └─ §DOC.4.3
```

Fetching §DOC.4 returns all child content (§DOC.4.1, §DOC.4.2, §DOC.4.2.1, etc.).

### Stopping Rules

**Whole sections (§PREFIX.N):**
- Stop at next whole section
- Stop at {§END} marker
- Stop at end of file

**Subsections (§PREFIX.N.N):**
- Stop at next § marker (any level)
- Stop at {§END} marker
- Stop at end of file

**End marker example:**
```markdown
## {§DOC.4} Section
Section content...

### {§DOC.4.1} Subsection
Subsection content...

{§END}

This content is not part of §DOC.4.1 or §DOC.4
```

## Section Sorting

Sections sort by:
1. Prefix alphabetically (APP before META before SYS)
2. Section numbers numerically (§DOC.2 before §DOC.10)
3. Subsections follow parent (§DOC.2 before §DOC.2.1 before §DOC.3)

**Example order:**
```
§API.1, §API.2, §API.2.1, §API.2.2, §API.10
§APP.1, §APP.4, §APP.4.1, §APP.4.2, §APP-HOOK.1
§DOC.1, §DOC.2
§META.1
§SYS.1
```

**Fetch responses return sorted sections:**
```
Request: ["§DOC.4", "§API.1", "§DOC.2"]
Response: §API.1, §DOC.2, §DOC.4

Request: ["§SYS.5", "§APP.7", "§META.1"]
Response: §APP.7, §META.1, §SYS.5
```

## Validation

The `validate_references` tool checks format, prefix existence, section existence, and uniqueness.

**Valid response:**
```json
{
  "valid": true,
  "checked": 3
}
```

**Invalid response:**
```json
{
  "valid": false,
  "checked": 3,
  "invalid": ["§DOC.999"],
  "details": ["§DOC.999: Section not found in policy-documentation.md"]
}
```

### Common Errors

| Error | Example | Correct |
|-------|---------|---------|
| Missing § symbol | `DOC.1` | `§DOC.1` |
| Lowercase prefix | `§doc.1` | `§DOC.1` |
| Invalid characters | `§DOC.1a` | `§DOC.1` |
| Missing prefix | `§UNKNOWN.1` | `§DOC.1` |

## Examples

### In Markdown

```markdown
For API guidelines, see §API.1 and §API.2.

## {§DOC.4} Configuration
This section covers configuration...

Related sections:
- §DOC.1 - Overview
- §DOC.2 - Installation
- §DOC.3 - Configuration

See §DOC.4.1-3 for configuration options.
```

### In JSON

```json
{"sections": ["§DOC.7", "§API.5"]}
{"sections": ["§DOC.4.1-3"]}
{"references": ["§DOC.1", "§API.2", "§GUIDE.5"]}
```

## Best Practices

### Descriptive Headers

Use clear, specific section names:
```markdown
## {§DOC.1} Overview        ✓
## {§DOC.1} Section 1       ❌
```

### Logical Hierarchy

Group related content under parent sections:
```markdown
## {§DOC.4} Configuration
### {§DOC.4.1} File Configuration
### {§DOC.4.2} Environment Variables
### {§DOC.4.3} Command Line Options
```

### Compact References

Use ranges and parents to avoid duplication:
```
§DOC.2-5    ✓ Compact
§DOC.2, §DOC.3, §DOC.4, §DOC.5    ❌ Verbose

§DOC.4    ✓ Includes all subsections
§DOC.4.1, §DOC.4.2, §DOC.4.3    ❌ Redundant
```

### Sequential Numbering

Number sections sequentially without gaps:
```
§DOC.1, §DOC.2, §DOC.3    ✓
§DOC.1, §DOC.5, §DOC.10    ❌ Gaps in numbering
```

## Documentation with Examples

### Code Blocks

Section markers in code blocks are preserved in extracted content but ignored during validation:

```markdown
## {§DOC.5} API Examples

Here's an example section header format:

\```markdown
## {§EXAMPLE.1} Example Section
Content goes here...
\```

Use inline code for references: `{§INLINE.1}`
```

**Validation behavior:**
- Only `§DOC.5` is detected as a real section
- `§EXAMPLE.1` and `§INLINE.1` are ignored (they're in code blocks)

**Extraction behavior:**
- All content is preserved including code blocks
- Example markers remain in the extracted section
- Agents see the full documentation with examples

### Table of Contents

TOC links are ignored during validation:

```markdown
## {§DOC.TOC} Table of Contents

- [[#{§DOC.1} Overview]]
- [[#{§DOC.2} Installation]]
- [[#{§DOC.3} Configuration]]

## {§DOC.1} Overview
Actual section content...
```

**Validation behavior:**
- Only actual section headers (`## {§DOC.1}`) are validated
- TOC references (`[[#{§DOC.1} ...]]`) are ignored

This allows policy files to include:
- Example section formats in code blocks
- References in inline code for demonstration
- Table of contents with section links
- YAML/JSON examples containing section markers

All examples are preserved in extracted content but don't trigger duplicate section warnings.
