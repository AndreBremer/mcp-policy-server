---
type: policy
description: Policy file with code block examples and TOC
category: reference
maintained-by: test-team
---

# Policy With Examples

## {§EX.DESC} Description

This policy demonstrates handling of section markers in code blocks and TOC.

## {§EX.TOC} Table of Contents

- [[#{§EX.1} Section One]]
- [[#{§EX.2} Section Two]]
- [[#{§EX.3} Section Three]]

## {§EX.1} Section One

This section shows correct usage.

### Purpose

Real content here.

## {§EX.2} Section Two

This section contains examples in code blocks.

### Code Examples

Here are some example section headers:

```markdown
## {§EXAMPLE.1} Example Section
This is an example that should NOT be detected as a real section.

## {§EXAMPLE.2} Another Example
More example content.
```

You can also show inline examples like `{§INLINE.1}` which should be ignored.

### More Examples

```yaml
sections:
  - {§YAML.1}
  - {§YAML.2}
```

## {§EX.3} Section Three

Final section with actual content.

{§END}
