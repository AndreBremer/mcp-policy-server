# Installation Guide

This guide covers installing the Policy Documentation Server for use with MCP-compatible AI clients.

**Best suited for AI tools utilizing subagents or prompt libraries (commands).** This server is designed to work with AI clients that support agent-based workflows. Tested with Claude Code (agents and slash commands).

See [Policy Reference](POLICY_REFERENCE.md) for § notation syntax.

## Prerequisites

- Node.js 18 or later
- Claude Code (tested) or other MCP-compatible AI client with agent support

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
  --env MCP_POLICY_CONFIG=~/my-project/policies/policies.json \
  --scope local
```

**Windows:**
```powershell
claude mcp add --transport stdio policy-server `
  cmd /c npx -y @andrebremer/mcp-policy-server `
  --env MCP_POLICY_CONFIG=C:/my-project/policies/policies.json `
  --scope local
```

**Note:** Windows paths use forward slashes in configuration files.

#### Step 3: Verify Installation

```bash
claude mcp list    # Should show policy-server
/mcp               # Check status within Claude Code
```

### Option 2: Manual Configuration

For MCP clients that don't support CLI installation (or if you prefer editing config files directly).

#### Edit .mcp.json in Your Project Root

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "/home/username/my-project/policies/policies.json"
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
      "command": "npx",
      "args": ["-y", "@andrebremer/mcp-policy-server"],
      "env": {
        "MCP_POLICY_CONFIG": "C:/my-project/policies/policies.json"
      }
    }
  }
}
```

#### For Other MCP Clients

Consult your client's documentation for MCP server configuration. Use the same configuration format as shown above (adapt paths for your OS).

### Option 3: Development Installation

For development or local testing:

```bash
git clone https://github.com/AndreBremer/mcp-policy-server.git
cd mcp-policy-server
npm install
npm run build
```

#### Add to MCP Configuration

**Linux/macOS:**
```json
{
  "mcpServers": {
    "policy-server": {
      "command": "node",
      "args": ["/home/username/mcp-policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "/home/username/my-project/policies/policies.json"
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
      "args": ["C:/projects/mcp-policy-server/dist/index.js"],
      "env": {
        "MCP_POLICY_CONFIG": "C:/my-project/policies/policies.json"
      }
    }
  }
}
```

**Important:**
- Use absolute paths
- Point to `dist/index.js` (compiled), not `src/index.ts`

## Next Steps

After installation:

1. **Create policy files** - See [Getting Started Guide](GETTING_STARTED.md) for step-by-step setup
2. **Configure policies.json** - Map prefixes to policy files
3. **Restart your AI client** - Load the new MCP server
4. **Test the server** - Use `list_sources` tool to verify

For troubleshooting, see [Getting Started Guide](GETTING_STARTED.md#troubleshooting).

## Configuration Reference

See [Configuration Reference](CONFIGURATION_REFERENCE.md) for detailed configuration options and advanced setup.
