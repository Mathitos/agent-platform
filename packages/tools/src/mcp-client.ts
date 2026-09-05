import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

export interface MCPServer {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolListResponse {
  tools: MCPTool[];
}

export interface MCPToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP Client implementation supporting stdio and HTTP transports
 */
export class MCPClient {
  private server: MCPServer;
  private process?: ChildProcess;
  private messageId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private initialized = false;

  constructor(server: MCPServer) {
    this.server = server;
  }

  /**
   * Initialize the MCP server connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.server.transport === 'stdio') {
      await this.initializeStdio();
    } else if (this.server.transport === 'http') {
      await this.initializeHttp();
    } else {
      throw new Error(`Unsupported transport: ${this.server.transport}`);
    }

    this.initialized = true;
  }

  private async initializeStdio(): Promise<void> {
    if (!this.server.command) {
      throw new Error('stdio transport requires command');
    }

    this.process = spawn(this.server.command, this.server.args || [], {
      env: { ...process.env, ...this.server.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error('Failed to create stdio pipes');
    }

    // Setup line reader for stdout
    const rl = readline.createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line) as MCPMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse MCP message:', error);
      }
    });

    this.process.on('error', (error) => {
      this.handleError(error);
    });

    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.handleError(new Error(`MCP server exited with code ${code}`));
      }
    });

    // Send initialize request
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'loom',
        version: '0.1.0',
      },
    });

    // Send initialized notification
    await this.sendNotification('notifications/initialized');
  }

  private async initializeHttp(): Promise<void> {
    if (!this.server.url) {
      throw new Error('http transport requires url');
    }

    // For HTTP, we just verify the server is reachable
    try {
      await this.sendHttpRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'loom',
          version: '0.1.0',
        },
      });
    } catch (error) {
      throw new Error(`Failed to initialize HTTP MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  private handleError(error: Error): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    const id = ++this.messageId;

    if (this.server.transport === 'stdio') {
      return this.sendStdioRequest(id, method, params);
    } else {
      return this.sendHttpRequest(method, params);
    }
  }

  private sendStdioRequest(id: number, method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('MCP process not initialized'));
        return;
      }

      this.pendingRequests.set(id, { resolve, reject });

      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.process.stdin.write(JSON.stringify(message) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private async sendHttpRequest(method: string, params?: any): Promise<any> {
    if (!this.server.url) {
      throw new Error('HTTP URL not configured');
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method,
      params,
    };

    const response = await fetch(this.server.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.server.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as MCPMessage;

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  }

  private async sendNotification(method: string, params?: any): Promise<void> {
    if (this.server.transport === 'stdio') {
      if (!this.process || !this.process.stdin) {
        throw new Error('MCP process not initialized');
      }

      const message: MCPMessage = {
        jsonrpc: '2.0',
        method,
        params,
      };

      this.process.stdin.write(JSON.stringify(message) + '\n');
    }
    // HTTP doesn't use notifications in the same way
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<MCPToolListResponse> {
    await this.initialize();
    const result = await this.sendRequest('tools/list');
    return result as MCPToolListResponse;
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args?: Record<string, any>): Promise<MCPToolCallResult> {
    await this.initialize();
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args || {},
    });
    return result as MCPToolCallResult;
  }

  /**
   * Shutdown the MCP client and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.server.transport === 'stdio' && this.process) {
      this.process.kill();
      this.process = undefined;
    }
    this.initialized = false;
    this.pendingRequests.clear();
  }
}

/**
 * MCP Client Manager for managing multiple MCP server connections
 */
export class MCPClientManager {
  private clients = new Map<string, MCPClient>();

  /**
   * Create a static helper for testing
   */
  static createClient(server: MCPServer): MCPClient {
    return new MCPClient(server);
  }

  /**
   * Register an MCP server
   */
  registerServer(server: MCPServer): void {
    const client = new MCPClient(server);
    this.clients.set(server.name, client);
  }

  /**
   * Get a client by server name
   */
  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  /**
   * List all registered servers
   */
  listServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Shutdown all clients
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.clients.values()).map(client => 
      client.shutdown().catch(err => console.error('Error shutting down MCP client:', err))
    );
    await Promise.all(shutdownPromises);
    this.clients.clear();
  }
}
