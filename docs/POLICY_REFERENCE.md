# Policy Reference

Reference for § notation syntax and policy file structure.

**Note:** Examples use PREFIX and EXAMPLE as generic placeholders. Actual prefix names are user-defined and configured via your policy files. Choose any naming scheme that fits your organizational structure.

## Overview

The § (section sign) notation references specific policy documentation sections. Supports single sections, subsections, ranges, and hyphenated prefix extensions.

## Format

### Basic Format

```
§PREFIX.N[.N...][−N]
```

**Components:**
- `§` - Required section symbol (U+00A7)
- `PREFIX` - Uppercase prefix identifier (user-defined)
- `.N` - Dot-separated section numbers (numeric only)
- `−N` - Optional range end (hyphen followed by number)

### Format Rules

1. **§ symbol required** - All references start with §
2. **PREFIX uppercase** - Must match configuration (PREFIX not prefix)
3. **Section numbers numeric** - No letters or special characters
4. **Dot separators** - Separate subsections with dots
5. **Hyphen for ranges** - Single hyphen between start and end

## Single Sections

### Section Levels

**Top-level (§PREFIX.N):**
```markdown
## {§PREFIX.1}
Section content...
```

**Subsections (§PREFIX.N.N):**
```markdown
### {§PREFIX.1.1}
Subsection content...
```

**Deep subsections (§PREFIX.N.N.N):**
```markdown
#### {§PREFIX.1.1.1}
Deep subsection content...
```

**Examples:**
- `§PREFIX.1` - Top-level section
- `§PREFIX.1.1` - Subsection
- `§PREFIX.1.1.1` - Deep subsection

## Range Notation

Ranges expand to all sections between start and end (inclusive).

**Subsection ranges (§PREFIX.N.N-N):**
```
§PREFIX.1.1-3 expands to §PREFIX.1.1, §PREFIX.1.2, §PREFIX.1.3
§PREFIX.2.5-8 expands to §PREFIX.2.5, §PREFIX.2.6, §PREFIX.2.7, §PREFIX.2.8
```

**Section ranges (§PREFIX.N-N):**
```
§PREFIX.2-4 expands to §PREFIX.2, §PREFIX.3, §PREFIX.4
§PREFIX.1-5 expands to §PREFIX.1, §PREFIX.2, §PREFIX.3, §PREFIX.4, §PREFIX.5
```

### Range Rules

1. **Start < End** - Range start must be less than range end
2. **Same level** - Start and end at same depth
3. **Same parent** - Subsection ranges share same parent
4. **Inclusive** - Both start and end included

**Valid ranges:**
- `§PREFIX.1-3` - Section range
- `§PREFIX.1.1-3` - Subsection range with same parent

**Invalid ranges:**
- `§PREFIX.1-3.2` - Mixed depth
- `§PREFIX.1.1-5` - Different depth levels
- `§PREFIX.1.1-5.3` - Different parents
- `§PREFIX.5-2` - Backwards (start > end)

## Hyphenated Prefixes

Use hyphens to organize related sections:

```markdown
## {§PREFIX.1} General Guidelines
## {§PREFIX-EXT.1} Extended Category
## {§PREFIX-EXT.2} Another Extended Category
```

Server searches all configured files for the section ID. No special configuration needed.

## Embedded References

### Automatic Resolution

The server resolves § references embedded in section content.

**Example:**
```markdown
## {§PREFIX.1} Overview
This section covers basic concepts. For details see §PREFIX.2.1 and §OTHER.1.
```

Fetching §PREFIX.1 returns all three sections (§PREFIX.1, §PREFIX.2.1, §OTHER.1).

### Recursive Resolution

Resolution continues until no references remain.

**Example chain:**
```markdown
## {§PREFIX.1} See §PREFIX.2 for details...
## {§PREFIX.2} Refer to §PREFIX.3 for examples...
## {§PREFIX.3} Check §OTHER.1 for implementation...
## {§OTHER.1} Final section with no references...
```

Fetching §PREFIX.1 returns all four sections.

### Deduplication

The server removes duplicates:

- Parent sections include children (§PREFIX.1 includes §PREFIX.1.1, §PREFIX.1.2)
- Multiple references to same section fetched once

## Parent-Child Relationships

### Hierarchical Structure

Sections form implicit hierarchies:

```
§PREFIX.1
  ├─ §PREFIX.1.1
  ├─ §PREFIX.1.2
  │   ├─ §PREFIX.1.2.1
  │   └─ §PREFIX.1.2.2
  └─ §PREFIX.1.3
```

Fetching §PREFIX.1 returns all child content (§PREFIX.1.1, §PREFIX.1.2, §PREFIX.1.2.1, etc.).

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
## {§PREFIX.1} Section
Section content...

### {§PREFIX.1.1} Subsection
Subsection content...

{§END}

This content is not part of §PREFIX.1.1 or §PREFIX.1
```

## Section Sorting

Sections sort by:
1. Prefix alphabetically
2. Section numbers numerically (§PREFIX.2 before §PREFIX.10)
3. Subsections follow parent (§PREFIX.2 before §PREFIX.2.1 before §PREFIX.3)

**Example order:**
```
§ABC.1, §ABC.2, §ABC.2.1, §ABC.2.2, §ABC.10
§PREFIX.1, §PREFIX.1.1, §PREFIX.1.2, §PREFIX.2
§PREFIX-EXT.1
§XYZ.1
```

**Fetch responses return sorted sections:**
```
Request: ["§PREFIX.2", "§ABC.1", "§PREFIX.1"]
Response: §ABC.1, §PREFIX.1, §PREFIX.2

Request: ["§XYZ.1", "§ABC.1", "§PREFIX.1"]
Response: §ABC.1, §PREFIX.1, §XYZ.1
```

## Validation

The `mcp__policy-server__validate_references` tool checks format, prefix existence, section existence, and uniqueness.

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
  "invalid": ["§PREFIX.999"],
  "details": ["§PREFIX.999: Section not found in policy-file.md"]
}
```

### Common Errors

| Error | Example | Correct |
|-------|---------|---------|
| Missing § symbol | `PREFIX.1` | `§PREFIX.1` |
| Lowercase prefix | `§prefix.1` | `§PREFIX.1` |
| Invalid characters | `§PREFIX.1a` | `§PREFIX.1` |
| Unknown prefix | `§UNKNOWN.1` | `§PREFIX.1` |

## Examples

### In Markdown

```markdown
For guidelines, see §PREFIX.1 and §PREFIX.2.

## {§PREFIX.1} Overview
This section covers the basics...

Related sections:
- §PREFIX.2 - Details
- §PREFIX.3 - Examples

See §PREFIX.1.1-3 for more options.
```

### In JSON

```json
{"sections": ["§PREFIX.1", "§PREFIX.2"]}
{"sections": ["§PREFIX.1.1-3"]}
{"references": ["§PREFIX.1", "§PREFIX.2", "§OTHER.1"]}
```

## Best Practices

### Descriptive Headers

Use clear, specific section names:
```markdown
## {§PREFIX.1} Overview        ✓
## {§PREFIX.1} Section 1       ❌
```

### Logical Hierarchy

Group related content under parent sections:
```markdown
## {§PREFIX.1} Main Topic
### {§PREFIX.1.1} Subtopic One
### {§PREFIX.1.2} Subtopic Two
### {§PREFIX.1.3} Subtopic Three
```

### Compact References

Use ranges and parents to avoid duplication:
```
§PREFIX.2-5    ✓ Compact
§PREFIX.2, §PREFIX.3, §PREFIX.4, §PREFIX.5    ❌ Verbose

§PREFIX.1    ✓ Includes all subsections
§PREFIX.1.1, §PREFIX.1.2, §PREFIX.1.3    ❌ Redundant
```

### Sequential Numbering

Number sections sequentially without gaps:
```
§PREFIX.1, §PREFIX.2, §PREFIX.3    ✓
§PREFIX.1, §PREFIX.5, §PREFIX.10    ❌ Gaps in numbering
```

## Code Blocks and Examples

Section markers in code blocks are ignored during validation but preserved in extracted content. This allows you to include examples without triggering duplicate warnings.
