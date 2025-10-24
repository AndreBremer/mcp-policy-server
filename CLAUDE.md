## Quickstart

MCP server that exposes policy documentation via § notation with automatic reference resolution, range expansion, and section validation.

**Build and run:**
```bash
npm install
npm run build
npm start
```

**Run tests:**
```bash
npm test
```

**Documentation:**
- See README.md for overview and installation
- See docs/GETTING_STARTED.md for step-by-step setup
- See docs/CONFIGURATION_REFERENCE.md for configuration details
- See docs/POLICY_REFERENCE.md for § notation syntax

## Development Commands

**Build and run:**
- `npm run build` - Compile TypeScript to dist/
- `npm run watch` - Recompile on file changes
- `npm run clean` - Remove dist/, coverage/, build artifacts
- `npm start` - Start server (requires built files)

**Testing:**
- `npm test` - Run Jest test suites
- `npm run test:coverage` - Generate coverage report

**Code quality:**
- `npm run typecheck` - Type check without compilation
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format with Prettier
- `npm run format:check` - Verify formatting
- `npm run pre-commit` - Run format check, lint, typecheck
- `npm run pre-commit:fix` - Run format, lint fix, typecheck

**Testing with MCP Inspector:**
- `npx @modelcontextprotocol/inspector node dist/index.js` - Interactive testing

## Architecture

```
src/
  index.ts          - MCP server, tools, response chunking, startup validation
  config.ts         - Load policies.json, resolve policy directory
  handlers.ts       - MCP tool business logic, coordinates components
  parser.ts         - Parse § notation, expand ranges, extract sections, find references
  resolver.ts       - Recursive resolution, file discovery, deduplication
  validator.ts      - Duplicate section detection
  types.ts          - TypeScript type definitions

tests/              - Jest test suites with fixture-based configuration
  parser.test.ts
  resolver.test.ts
  validator.test.ts
  server.test.ts

dist/               - Compiled JavaScript output
```

## Implementation Details

**Section extraction logic:**
- Whole sections (§DOC.4) stop at next whole section, {§END}, or EOF
- Subsections (§DOC.4.1) stop at any next § marker
- Regex-based section header matching

**Key behaviors:**
- Startup validation scans for duplicate section IDs (logs warnings, doesn't block)
- Response chunking splits at section boundaries (10000 token limit)
- Recursive resolution follows embedded § references until exhausted
- Parent-child deduplication (§DOC.4 supersedes §DOC.4.1)
