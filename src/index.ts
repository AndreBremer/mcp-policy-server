#!/usr/bin/env node

/**
 * Policy Documentation MCP Server
 * Exposes policy documentation via MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  handleFetch,
  handleResolveReferences,
  handleExtractReferences,
  handleValidateReferences,
  handleListSources,
  handleInspectContext,
} from './handlers.js';
import { loadConfig, validateConfiguration, ServerConfig } from './config.js';
import { validateSectionUniqueness, formatDuplicateErrors } from './validator.js';

// Global configuration
let CONFIG: ServerConfig | null = null;

// Create server instance
const server = new Server(
  {
    name: 'policy-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'fetch_policies',
        description:
          'Fetch one or more policy sections with automatic recursive § reference resolution. Supports range notation (§APP.4.1-3) and multiple mixed sections (§APP.7,§SYS.5,§META.1). Automatically chunks large responses to stay within token limits.',
        inputSchema: {
          type: 'object',
          properties: {
            sections: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Section notations with § prefix (e.g., ["§APP.7", "§SYS.5", "§APP.4.1-3"]). Can mix any types: META (meta), SYS (system), APP (application), USER (user), plus extended types (APP-HOOK, APP-PLG, APP-TPL, SYS-TPL)',
            },
            continuation: {
              type: 'string',
              description:
                'Continuation token from previous chunked response (e.g., "chunk:1"). Omit for first request.',
              default: null,
            },
          },
          required: ['sections'],
        },
      },
      {
        name: 'resolve_references',
        description:
          'Resolve section locations with automatic recursive § reference resolution. Returns a map of policy file to sorted array of reference IDs (e.g., {"policy-application.md": ["§APP.7", "§APP.8"], "policy-system.md": ["§SYS.1", "§SYS.5"]}). Similar to fetch but returns grouped locations instead of content.',
        inputSchema: {
          type: 'object',
          properties: {
            sections: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Section notations with § prefix (e.g., ["§APP.7", "§SYS.5", "§APP.4.1-3"]). Can mix any types: META (meta), SYS (system), APP (application), USER (user), plus extended types (APP-HOOK, APP-PLG, APP-TPL, SYS-TPL)',
            },
          },
          required: ['sections'],
        },
      },
      {
        name: 'extract_references',
        description:
          'Extract all § references from a file. Returns an array of section notations found in the document (e.g., ["§APP.7", "§SYS.5", "§META.1"]). Useful for discovering what policy sections are referenced in agents, commands, or other system files.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the file to scan for § references',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'validate_references',
        description:
          'Validate that policy section references exist and are unique. Checks each reference against policy files and reports invalid or duplicate sections.',
        inputSchema: {
          type: 'object',
          properties: {
            references: {
              type: 'array',
              items: { type: 'string' },
              description: 'Section notations to validate (e.g., ["§APP.7", "§SYS.5"])',
            },
          },
          required: ['references'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all available policy documentation files and their section prefixes',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'inspect_context',
        description:
          'Test tool to inspect MCP request context (client_id, request_id, session info)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  if (!CONFIG) {
    throw new Error('Server configuration not loaded');
  }

  try {
    switch (name) {
      case 'fetch_policies':
        return handleFetch(args, CONFIG);

      case 'resolve_references':
        return handleResolveReferences(args, CONFIG);

      case 'extract_references':
        return handleExtractReferences(args, CONFIG);

      case 'validate_references':
        return handleValidateReferences(args, CONFIG);

      case 'list_sources':
        return handleListSources(args, CONFIG);

      case 'inspect_context':
        return handleInspectContext(args, request);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Tool execution failed: ${String(error)}`);
  }
});

/**
 * List available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'auto-fetch',
        description:
          'Automatically fetch policy documentation sections when § references are encountered',
        arguments: [],
      },
    ],
  };
});

/**
 * Get prompt content
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (!CONFIG) {
    throw new Error('Server configuration not loaded');
  }

  if (name === 'auto-fetch') {
    const prefixDocs = Object.entries(CONFIG.stems)
      .map(([prefix, stem]) => `- **§${prefix}.N** - ${stem}.md Section N`)
      .join('\n');

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `# Policy Documentation Auto-Fetch

When you encounter § references in agent instructions or system files, automatically fetch the referenced sections using the fetch_policies tool.

## Section Notation

${prefixDocs}

## Auto-Fetch Behavior

**When you see § references:**
1. Extract all unique section notations (e.g., §APP.7, §SYS.5, §META.1)
2. Call fetch tool with the extracted sections (include § prefix)
3. Use the fetched content to inform your task

**Examples:**
- Agent mentions "Follow §APP.7 standards" → Fetch ["§APP.7"]
- Instructions reference "§APP.4.1 and §APP.4.2" → Fetch ["§APP.4.1", "§APP.4.2"]
- Multiple refs "See §APP.7, §SYS.5, §META.1" → Fetch ["§APP.7", "§SYS.5", "§META.1"] in one call

**Do NOT fetch if:**
- Section already provided in context
- Reference is purely informational (e.g., "documented in §APP.7" without needing details)

This eliminates the need for explicit bash prefetch commands in agent files.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

/**
 * Start the server
 */
async function main(): Promise<void> {
  try {
    // Load and validate configuration
    CONFIG = loadConfig();
    validateConfiguration(CONFIG);

    console.error('Policy server configuration loaded:');
    console.error(`  Base directory: ${CONFIG.baseDir}`);
    console.error(`  Prefixes: ${Object.keys(CONFIG.stems).join(', ')}`);

    // Validate section uniqueness at startup
    const validationResult = validateSectionUniqueness(CONFIG, CONFIG.baseDir);

    if (!validationResult.valid) {
      console.error('[WARN] Policy section validation failed:');
      console.error(formatDuplicateErrors(validationResult.errors ?? []));
    } else {
      console.error('Policy section validation: PASSED');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Policy Documentation MCP Server running on stdio');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Fatal error during startup:', error.message);
    } else {
      console.error('Fatal error during startup:', String(error));
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('Fatal error:', error.message);
  } else {
    console.error('Fatal error:', String(error));
  }
  process.exit(1);
});
