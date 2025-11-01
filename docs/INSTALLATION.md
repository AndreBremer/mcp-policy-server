# Installation Guide

This guide covers installing the Policy Documentation Server for use with MCP-compatible AI clients.

**Designed for Claude Code subagents and commands (slash commands).** May work with other MCP-compatible clients that support agent-based workflows.

See [Policy Reference](POLICY_REFERENCE.md) for § notation syntax.

## Prerequisites

- Node.js 18 or later
- Claude Code (tested) or other MCP-compatible AI client with subagent support

## Installation Methods

### Option 1: Install from npm (Recommended)

The `npx -y` command automatically downloads and runs the package - no separate install needed.

#### Step 1: Create Your Policies Directory

**Linux/macOS:**
```bash
mkdir -p ~/my-project/policies
```

**Windows:**
```powershell
mkdir C:\my-project\policies
```

See [Getting Started Guide](GETTING_STARTED.md) to create policies.json and policy files.

#### Step 2: Add to Claude Code

**Linux/macOS:**
```bash
claude mcp add --transport stdio policy-server \
  npx -y @andrebremer/mcp-policy-server \
  --env MCP_POLICY_CONFIG="[relative/path/to/policies]" \
  --scope project
```


**Windows:**
```powershell
claude mcp add-json policy-server ('{' `
  '"type": "stdio", "command": "cmd",' + `
  '"args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"], ' + `
  '"env": {"MCP_POLICY_CONFIG": "[relative/path/to/policies]"}}') `
  --scope project
```

### Option 2: Manual Configuration

#### Create .mcp.json in Your Project Root

Create a `.mcp.json` file at the root of your project (the directory containing your policies folder):

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "[relative/path/to/policies]"
      }
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "[relative/path/to/policies]"
      }
    }
  }
}
```

**Configuration Notes:**
- `MCP_POLICY_CONFIG`: Glob pattern or path relative to the `.mcp.json` file location
- Glob patterns recommended for simplicity (e.g., `./policies/*.md`)
- Windows: Use forward slashes in paths (JSON compatible)
- The `npx -y` command auto-installs the package on first use
- Restart Claude Code after creating/modifying `.mcp.json`

#### For Other MCP Clients

Consult your client's documentation for MCP server configuration. Use the same configuration format as shown above (adapt paths for your OS).

### Verify Installation

After installing with Option 1 (CLI) or Option 2 (Manual):

1. Restart Claude Code
2. Run `/mcp` to check server status
3. Look for "policy-server" with "connected" status

**Troubleshooting:**
- "failed" status: Check that `MCP_POLICY_CONFIG` path is correct
- Server not listed: Verify `.mcp.json` syntax (use a JSON validator)
- Connection errors: Check Node.js is installed (`node --version`)

### Option 3: Development Installation (Local Project Files)

For development, local testing, or when you want to modify the server code:

#### Step 1: Clone and Build

```bash
git clone https://github.com/AndreBremer/mcp-policy-server.git
cd mcp-policy-server
npm install
npm run build
```

#### Step 2: Create .mcp.json in Your Project Root

Create `.mcp.json` at the root of your project (where your policies directory is located):

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/*.md"
      }
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "./policies/*.md"
      }
    }
  }
}
```

**Important:**
- `args`: Use absolute path to the server's `dist/index.js` file
- `MCP_POLICY_CONFIG`: Can be relative to your project root
- Windows: Use forward slashes or escaped backslashes in JSON
- Point to `dist/index.js` (compiled), not `src/index.ts`
- Run `npm run build` after making changes to the server code

## Next Steps

After installation:

1. **Create policy files** - See [Getting Started Guide](GETTING_STARTED.md) for step-by-step setup
2. **Configure policies.json** - Map prefixes to policy files
3. **Restart your AI client** - Load the new MCP server
4. **Test the server** - Use `mcp__policy-server__list_sources` tool to verify

For troubleshooting, see [Getting Started Guide](GETTING_STARTED.md#troubleshooting).

## Configuration Reference

See [Configuration Reference](CONFIGURATION_REFERENCE.md) for detailed configuration options and advanced setup.
