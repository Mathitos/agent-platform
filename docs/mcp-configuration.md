# MCP Server Configuration

Loom M3 introduces support for the Model Context Protocol (MCP), enabling agents to connect to and invoke tools from external MCP servers.

## Overview

MCP (Model Context Protocol) allows Loom agents to:
- Connect to external MCP servers via stdio or HTTP transports
- List available tools from MCP servers
- Invoke MCP tools with structured arguments
- Integrate MCP tools alongside built-in file, shell, git, and PR tools

## Configuration

MCP servers are configured in the user-namespaced config directory under `~/.loom/users/{userId}/mcp-servers.json`.

### Configuration File Location

```
~/.loom/
  └── users/
      └── default/           # or your custom userId
          ├── config.json    # User configuration
          └── mcp-servers.json  # MCP server configuration
```

### Configuration Format

The `mcp-servers.json` file contains an array of MCP server configurations:

```json
{
  "servers": [
    {
      "name": "my-server",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"],
      "env": {
        "NODE_ENV": "production"
      }
    },
    {
      "name": "http-server",
      "transport": "http",
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  ]
}
```

## Server Configuration Options

### Common Options

- **`name`** (required): Unique identifier for the MCP server
- **`transport`** (required): Transport type - either `"stdio"` or `"http"`

### Stdio Transport

For servers that communicate via standard input/output:

```json
{
  "name": "filesystem-server",
  "transport": "stdio",
  "command": "node",
  "args": ["path/to/server.js"],
  "env": {
    "KEY": "value"
  }
}
```

- **`command`** (required): Command to execute the server
- **`args`** (optional): Array of command-line arguments
- **`env`** (optional): Environment variables to pass to the server process

### HTTP Transport

For servers that expose an HTTP endpoint:

```json
{
  "name": "web-server",
  "transport": "http",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer token",
    "X-Custom-Header": "value"
  }
}
```

- **`url`** (required): HTTP endpoint URL
- **`headers`** (optional): HTTP headers to include in requests

## Using MCP Servers in Code

### Agent Configuration

Enable MCP servers when creating an AgentExecutor:

```typescript
import { AgentExecutor } from '@loom/agent';
import { OpenAIProvider } from '@loom/providers';

const provider = new OpenAIProvider({
  type: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
});

const agent = new AgentExecutor(provider, {
  workspaceRoot: process.cwd(),
  mcpServers: [
    {
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
  ],
});
```

### Available MCP Tools

When MCP servers are configured, two new tools become available:

#### `mcp_list_tools`

List available tools from a connected MCP server:

```json
{
  "server": "filesystem"
}
```

Returns:
```json
[
  {
    "name": "read_file",
    "description": "Read a file from the filesystem",
    "inputSchema": {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      }
    }
  }
]
```

#### `mcp_call_tool`

Invoke a tool on an MCP server:

```json
{
  "server": "filesystem",
  "tool": "read_file",
  "arguments": {
    "path": "/path/to/file.txt"
  }
}
```

Returns the tool execution result as text.

## Example: Using Official MCP Servers

### Filesystem Server

```json
{
  "name": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/allowed/path1",
    "/allowed/path2"
  ]
}
```

### Git Server

```json
{
  "name": "git",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-git"]
}
```

### GitHub Server

```json
{
  "name": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "your_github_token"
  }
}
```

### Brave Search Server

```json
{
  "name": "brave-search",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "your_brave_api_key"
  }
}
```

## Security Considerations

1. **Trusted Servers Only**: Only configure MCP servers from trusted sources
2. **Environment Variables**: Store sensitive credentials in environment variables, not in config files
3. **Filesystem Access**: Filesystem servers should be configured with explicit allowed paths
4. **Network Access**: HTTP servers should use HTTPS and proper authentication
5. **User Namespacing**: Each user's MCP servers are isolated in their own config directory

## Troubleshooting

### Server Not Starting

If an MCP server fails to start:

1. Verify the `command` is in your PATH
2. Check that `args` are correct
3. Ensure any required environment variables are set
4. Check server logs for startup errors

### Connection Errors

For stdio transport:
- Ensure the server process is spawning correctly
- Check that stdin/stdout are not being used for other purposes

For HTTP transport:
- Verify the URL is correct and accessible
- Check that headers (including auth) are properly configured
- Ensure the server is running and accepting connections

### Tool Invocation Failures

If tool calls fail:
1. Use `mcp_list_tools` to verify the tool exists
2. Check the tool's `inputSchema` for required parameters
3. Verify argument types match the schema
4. Check MCP server logs for errors

## Next Steps

- Explore [official MCP servers](https://github.com/modelcontextprotocol)
- Build your own MCP server using the [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Integrate MCP tools into your Loom workflows

## Related Documentation

- [Agent Tools Overview](./architecture.md#tools)
- [User Configuration](../README.md#configuration)
- [Model Context Protocol Specification](https://github.com/modelcontextprotocol/specification)
