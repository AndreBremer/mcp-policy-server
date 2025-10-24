# Policy Reference

Complete reference for § notation syntax and policy file structure.

**Note:** Throughout this reference, examples use prefixes like DOC, API, CODE, and GUIDE. These are user-defined prefixes you configure in policies.json. You can choose any prefix naming scheme that fits your team's organizational structure.

## Overview

The § (section sign) notation provides a compact, unambiguous way to reference specific sections of policy documentation. The system supports single sections, subsections, ranges, and hyphenated prefix extensions.

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

1. **§ symbol required** - All references must start with §
2. **PREFIX uppercase** - Must match configuration (DOC not doc)
3. **Section numbers numeric** - No letters or special characters
4. **Dot separators** - Subsections separated by dots
5. **Hyphen for ranges** - Single hyphen between start and end

## Single Sections

### Top-Level Sections

**Format:** `§PREFIX.N`

**Examples:**
- `§DOC.1` - Section 1 of documentation policy
- `§API.5` - Section 5 of API policy
- `§GUIDE.12` - Section 12 of guide policy

**Markdown format:**
```markdown
## {§DOC.1}
Section content here...
```

### Subsections

**Format:** `§PREFIX.N.N`

**Examples:**
- `§DOC.4.1` - Subsection 1 of section 4
- `§API.2.3` - Subsection 3 of section 2
- `§GUIDE.1.5` - Subsection 5 of section 1

**Markdown format:**
```markdown
### {§DOC.4.1}
Subsection content here...
```

### Deep Subsections

**Format:** `§PREFIX.N.N.N`

**Examples:**
- `§DOC.4.1.2` - Sub-subsection 2 of subsection 1 of section 4
- `§API.1.2.3` - Three levels deep
- `§GUIDE.5.1.1` - Three levels deep

**Markdown format:**
```markdown
#### {§DOC.4.1.2}
Deep subsection content here...
```

## Range Notation

### Subsection Ranges

**Format:** `§PREFIX.N.N-N`

Expands to all subsections between start and end (inclusive).

**Examples:**

`§DOC.4.1-3` expands to:
- §DOC.4.1
- §DOC.4.2
- §DOC.4.3

`§API.2.5-8` expands to:
- §API.2.5
- §API.2.6
- §API.2.7
- §API.2.8

**Use cases:**
- Fetching related subsections
- Referencing policy sequences
- Compact notation for multiple sections

### Section Ranges

**Format:** `§PREFIX.N-N`

Expands to all top-level sections between start and end (inclusive).

**Examples:**

`§DOC.2-4` expands to:
- §DOC.2
- §DOC.3
- §DOC.4

`§GUIDE.1-5` expands to:
- §GUIDE.1
- §GUIDE.2
- §GUIDE.3
- §GUIDE.4
- §GUIDE.5

**Use cases:**
- Fetching entire policy chapters
- Reviewing related sections
- Batch validation

### Range Rules

1. **Start < End** - Range start must be less than range end
2. **Same level** - Start and end must be at same depth (both sections or both subsections)
3. **Same parent** - Subsection ranges must share same parent section
4. **Inclusive** - Both start and end are included in expansion

### Invalid Ranges

- `§DOC.1-3.2` - Wrong depth (mixing section and subsection)
- `§DOC.4.1-5` - Wrong depth (end is section, start is subsection)
- `§DOC.4.1-5.3` - Different parents
- `§DOC.5-2` - Backwards (start > end)

Valid: `§DOC.1-3` (section range), `§DOC.4.1-3` (subsection range with same parent)

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

### Base Prefix Extraction

The server automatically extracts the base prefix:

1. Split on first hyphen
2. Extract base prefix (before hyphen)
3. Look up base prefix in configuration
4. Resolve to corresponding file

**Examples:**

`§DOC-GUIDE.1` → Base prefix `DOC` → `policy-documentation.md`
`§API-REST.2` → Base prefix `API` → `policy-api.md`
`§GUIDE-QUICK.3` → Base prefix `GUIDE` → `policy-guide.md`

### Extension Examples

**Documentation variants:**
- `§DOC.1` - Main documentation section
- `§DOC-GUIDE.1` - Guide subsection
- `§DOC-API.1` - API reference
- `§DOC-REF.1` - Reference material

**API variants:**
- `§API.1` - General API section
- `§API-REST.1` - REST API specifics
- `§API-GRAPHQL.1` - GraphQL API specifics
- `§API-AUTH.1` - Authentication details

**System variants:**
- `§SYS.1` - Core system section
- `§SYS-CORE.1` - Core functionality
- `§SYS-UTIL.1` - Utility functions
- `§SYS-TEST.1` - Testing guidelines

### Use Cases

**Organizing large policy files:**
```markdown
## {§DOC.1} Overview
Main documentation overview...

## {§DOC-GUIDE.1} Quick Start
Quick start guide...

## {§DOC-API.1} API Reference
API reference documentation...
```

**Separating concerns:**
```markdown
## {§API.1} General
General API guidelines...

## {§API-REST.1} REST APIs
REST-specific guidelines...

## {§API-GRAPHQL.1} GraphQL APIs
GraphQL-specific guidelines...
```

**Configuration-free extensions:**
No need to add DOC-GUIDE, DOC-API, API-REST to `policies.json`. They resolve automatically via base prefix.

## Embedded References

### Automatic Resolution

The server automatically resolves § references embedded in section content:

**Example policy file:**
```markdown
## {§DOC.1} Overview

This section covers basic concepts. For details see §DOC.4.1 and §API.2.

...content...
```

**Fetch process:**
1. User requests §DOC.1
2. Server extracts §DOC.1 content
3. Server finds embedded §DOC.4.1 and §API.2
4. Server fetches those sections
5. Server returns all three sections combined

### Recursive Resolution

Resolution continues recursively:

**Example chain:**
```markdown
## {§DOC.1}
See §DOC.2 for details...

## {§DOC.2}
Refer to §DOC.3 for examples...

## {§DOC.3}
Check §API.1 for implementation...

## {§API.1}
Final section with no references...
```

**Fetch §DOC.1:**
1. Extracts §DOC.1 → finds §DOC.2
2. Extracts §DOC.2 → finds §DOC.3
3. Extracts §DOC.3 → finds §API.1
4. Extracts §API.1 → no more references
5. Returns all four sections

### Deduplication

The server removes duplicate sections:

**Parent-child deduplication:**
- Requesting §DOC.4 automatically includes §DOC.4.1, §DOC.4.2, etc.
- If §DOC.4.1 is also referenced, it's not fetched twice

**Explicit deduplication:**
- If §DOC.1 is referenced multiple times, only fetched once

## Parent-Child Relationships

### Hierarchical Structure

Sections have implicit hierarchical relationships:

```
§DOC.4
  ├─ §DOC.4.1
  ├─ §DOC.4.2
  │   ├─ §DOC.4.2.1
  │   └─ §DOC.4.2.2
  └─ §DOC.4.3
```

### Parent Includes Children

Fetching a parent section returns all child content. For example, `§DOC.4` returns §DOC.4 plus all nested subsections (§DOC.4.1, §DOC.4.2, §DOC.4.2.1, etc.).

### Stopping Rules

**Whole sections (§PREFIX.N):**
- Stop at next whole section (§PREFIX.N+1)
- Stop at {§END} marker
- Stop at end of file

**Subsections (§PREFIX.N.N):**
- Stop at next § marker (any level)
- Stop at {§END} marker
- Stop at end of file

### End Markers

Use `{§END}` to explicitly terminate sections:

```markdown
## {§DOC.4} Section
Section content...

### {§DOC.4.1} Subsection
Subsection content...

{§END}

This content is not part of §DOC.4.1 or §DOC.4
```

## Section Sorting

### Sorting Order

Sections are sorted by:
1. Prefix alphabetically (API before DOC)
2. Section numbers numerically (§DOC.2 before §DOC.10)
3. Depth-first (§DOC.2 before §DOC.2.1)

**Example order:**
```
§API.1
§API.2
§API.2.1
§API.2.2
§API.10
§DOC.1
§DOC.2
§DOC.4
§DOC.4.1
§DOC.4.2
§GUIDE.1
```

### Response Ordering

Fetch responses return sections in sorted order:

**Request:** `["§DOC.4", "§API.1", "§DOC.2"]`

**Response order:**
```
§API.1
---
§DOC.2
---
§DOC.4
```

## Validation

### Reference Validation

The `validate_references` tool checks:

1. **Format validity** - Correct § notation
2. **Prefix existence** - Prefix defined in configuration
3. **Section existence** - Section exists in policy file
4. **Uniqueness** - Section ID not duplicated

**Example valid:**
```json
{
  "valid": true,
  "checked": 3
}
```

**Example invalid:**
```json
{
  "valid": false,
  "checked": 3,
  "invalid": ["§DOC.999"],
  "details": [
    "§DOC.999: Section not found in policy-documentation.md"
  ]
}
```

### Common Validation Errors

**Missing § symbol:**
```
DOC.1  ❌  Missing § symbol
§DOC.1 ✓  Correct format
```

**Lowercase prefix:**
```
§doc.1 ❌  Prefix must be uppercase
§DOC.1 ✓  Correct format
```

**Invalid characters:**
```
§DOC.1a   ❌  Letters not allowed in section numbers
§DOC.1.a  ❌  Letters not allowed in section numbers
§DOC.1    ✓  Correct format
```

**Missing prefix mapping:**
```
§UNKNOWN.1 ❌  Prefix not in policies.json
§DOC.1     ✓  Prefix configured
```

## Examples

### Basic Usage

**Single section:**
```
§DOC.7
```

**Multiple sections:**
```
§DOC.7, §API.5, §GUIDE.1
```

**Range:**
```
§DOC.4.1-3
```

### In Markdown

**Reference in text:**
```markdown
For API guidelines, see §API.1 and §API.2.
```

**Section header:**
```markdown
## {§DOC.4} Configuration

This section covers configuration...
```

**List of references:**
```markdown
Related sections:
- §DOC.1 - Overview
- §DOC.2 - Installation
- §DOC.3 - Configuration
```

### In JSON

**Fetch request:**
```json
{
  "sections": ["§DOC.7", "§API.5"]
}
```

**Range request:**
```json
{
  "sections": ["§DOC.4.1-3"]
}
```

**Validation request:**
```json
{
  "references": ["§DOC.1", "§API.2", "§GUIDE.5"]
}
```

## Best Practices

### Naming Sections

**Use descriptive headers:**
```markdown
## {§DOC.1} Overview
## {§DOC.2} Installation
## {§DOC.3} Configuration
```

**Avoid generic headers:**
```markdown
## {§DOC.1} Section 1  ❌
## {§DOC.1} Overview   ✓
```

### Organizing Content

**Logical hierarchy:**
```markdown
## {§DOC.4} Configuration

### {§DOC.4.1} File Configuration
### {§DOC.4.2} Environment Variables
### {§DOC.4.3} Command Line Options
```

**Group related content:**
```markdown
## {§API.1} REST APIs
## {§API.2} Authentication
## {§API.3} Rate Limiting
```

### Reference Style

**Inline references:**
```markdown
For details on authentication (§API.2), see the security guide (§SEC.1).
```

**Explicit lists:**
```markdown
Prerequisites:
- §DOC.1 - Overview
- §DOC.2 - Installation
```

**Range notation:**
```markdown
See §DOC.4.1-3 for configuration options.
```

### Avoiding Duplication

**Use ranges:**
```
§DOC.2-5           ✓  Compact
§DOC.2, §DOC.3, §DOC.4, §DOC.5  ❌  Verbose
```

**Use parent sections:**
```
§DOC.4             ✓  Includes all subsections
§DOC.4.1, §DOC.4.2, §DOC.4.3  ❌  Redundant
```

### Section Numbering

**Sequential numbering:**
```
§DOC.1
§DOC.2
§DOC.3
```

**Avoid gaps:**
```
§DOC.1
§DOC.5   ❌  Gap in numbering
§DOC.10  ❌  Another gap
```

**Consistent subsection numbering:**
```
§DOC.4.1
§DOC.4.2
§DOC.4.3
```
