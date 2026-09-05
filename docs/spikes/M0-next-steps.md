# M0 → M1 Next Steps

**Context:** M0 feasibility spike complete. OpenAI subscription + Bionic local are green-lit. Cursor deferred (no raw model API).

**Goal:** M1 skeleton CLI with provider interface + config + one working backend.

---

## Ordered Work for M1

### 1. Scaffold CLI Project

**Deliverable:** `loom` CLI package with TypeScript, tsconfig, package.json.

**Tasks:**

- Initialize npm package: `npm init -y`
- Install deps: `typescript`, `@types/node`, `tsx` (dev), `commander` (CLI framework)
- Add scripts:
  ```json
  {
    "bin": { "loom": "./dist/cli.js" },
    "scripts": {
      "build": "tsc",
      "dev": "tsx watch src/cli.ts",
      "lint": "eslint src/",
      "test": "vitest"
    }
  }
  ```
- Create `src/cli.ts` entry point with `#!/usr/bin/env node` shebang
- Add `tsconfig.json` (target: ES2022, module: NodeNext)
- Add `.gitignore` (node_modules, dist/, .env)
- Add `README.md` installation/usage instructions

**Exit criteria:** `npm install -g .` installs `loom` command; `loom --version` prints version.

---

### 2. Define Provider Interface

**Deliverable:** `src/providers/Provider.ts` abstract class + types.

**Tasks:**

- Create `src/types/Message.ts`:
  ```typescript
  export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
  }
  
  export interface ToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }
  ```

- Create `src/types/Response.ts`:
  ```typescript
  export interface Response {
    content: string;
    toolCalls?: ToolCall[];
    finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
    usage?: { inputTokens: number; outputTokens: number };
  }
  ```

- Create `src/providers/Provider.ts`:
  ```typescript
  export abstract class Provider {
    abstract chat(messages: Message[]): Promise<Response>;
    abstract authenticate(): Promise<void>;
    abstract getName(): string;
  }
  ```

- Create `src/providers/ProviderFactory.ts`:
  ```typescript
  export class ProviderFactory {
    static create(type: string): Provider {
      switch (type) {
        case 'openai-api':
          return new OpenAIAPIProvider();
        case 'bionic':
          return new BionicLocalProvider();
        default:
          throw new Error(`Unknown provider: ${type}`);
      }
    }
  
    static listAvailable(): string[] {
      return ['openai-api', 'bionic'];
    }
  }
  ```

**Exit criteria:** TypeScript compiles; `ProviderFactory.listAvailable()` returns `['openai-api', 'bionic']`.

---

### 3. Implement OpenAI API Provider (MVP Path)

**Deliverable:** `src/providers/OpenAIAPIProvider.ts` (simpler than subscription OAuth for first iteration).

**Tasks:**

- Install `node-fetch` (or use native `fetch` in Node 18+)
- Implement `OpenAIAPIProvider`:
  ```typescript
  export class OpenAIAPIProvider extends Provider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;
  
    constructor() {
      super();
      this.apiKey = process.env.OPENAI_API_KEY || '';
      this.model = process.env.OPENAI_MODEL || 'gpt-4o';
      this.baseUrl = 'https://api.openai.com/v1';
    }
  
    async authenticate(): Promise<void> {
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY not set');
      }
      // Test API key with /models endpoint
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) throw new Error('Invalid OpenAI API key');
    }
  
    async chat(messages: Message[]): Promise<Response> {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            tool_calls: m.toolCalls,
            tool_call_id: m.toolCallId,
          })),
        }),
      });
  
      const data = await response.json();
      const choice = data.choices[0];
  
      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls,
        finishReason: choice.finish_reason,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    }
  
    getName(): string {
      return 'openai-api';
    }
  }
  ```

**Exit criteria:** `OPENAI_API_KEY=sk-... loom run "Hello"` calls OpenAI API and prints response.

---

### 4. Implement Bionic Local Provider

**Deliverable:** `src/providers/BionicLocalProvider.ts`.

**Tasks:**

- Implement `BionicLocalProvider` (very similar to OpenAI API, just different base URL):
  ```typescript
  export class BionicLocalProvider extends Provider {
    private baseUrl: string;
    private modelId: string;
    private apiKey?: string;
  
    constructor() {
      super();
      this.baseUrl = process.env.BIONIC_BASE_URL || 'http://localhost:1234/v1';
      this.modelId = process.env.BIONIC_MODEL_ID || '';
      this.apiKey = process.env.BIONIC_API_KEY;
    }
  
    async authenticate(): Promise<void> {
      // Check if server is reachable
      try {
        const response = await fetch(`${this.baseUrl}/models`);
        if (!response.ok) throw new Error('LM Studio server unreachable');
        const data = await response.json();
        const models = data.data.map((m: any) => m.id);
        if (!models.includes(this.modelId)) {
          throw new Error(
            `Model "${this.modelId}" not loaded. Available: ${models.join(', ')}`
          );
        }
      } catch (err) {
        throw new Error(
          'LM Studio server not running. Start it in LM Studio → Developer tab.'
        );
      }
    }
  
    async chat(messages: Message[]): Promise<Response> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
  
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: this.modelId, messages }),
      });
  
      const data = await response.json();
      const choice = data.choices[0];
  
      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls,
        finishReason: choice.finish_reason,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    }
  
    getName(): string {
      return 'bionic';
    }
  }
  ```

**Exit criteria:** With LM Studio server running, `BIONIC_MODEL_ID=qwen-2.5-coder loom run "Hello"` calls local model.

---

### 5. Basic CLI Commands

**Deliverable:** `loom run`, `loom providers`, `loom auth` commands.

**Tasks:**

- Install `commander` for CLI framework
- Add `src/cli.ts`:
  ```typescript
  import { Command } from 'commander';
  import { ProviderFactory } from './providers/ProviderFactory';
  
  const program = new Command();
  
  program
    .name('loom')
    .version('0.1.0')
    .description('Weave many agents into one workflow');
  
  program
    .command('run')
    .argument('<prompt>', 'Task description')
    .option('-p, --provider <type>', 'Provider type', process.env.LOOM_PROVIDER || 'openai-api')
    .action(async (prompt, options) => {
      const provider = ProviderFactory.create(options.provider);
      await provider.authenticate();
      const response = await provider.chat([
        { role: 'user', content: prompt },
      ]);
      console.log(response.content);
    });
  
  program
    .command('providers')
    .description('List available providers')
    .action(() => {
      const providers = ProviderFactory.listAvailable();
      console.log('Available providers:');
      providers.forEach(p => console.log(`  - ${p}`));
    });
  
  program
    .command('auth')
    .argument('<provider>', 'Provider name')
    .description('Authenticate with a provider')
    .action(async (providerName) => {
      const provider = ProviderFactory.create(providerName);
      await provider.authenticate();
      console.log(`✓ Authenticated with ${providerName}`);
    });
  
  program.parse();
  ```

**Exit criteria:** All three commands work:

```bash
loom providers
# Output: Available providers: openai-api, bionic

loom auth openai-api
# Output: ✓ Authenticated with openai-api

loom run "Say hello"
# Output: Hello! How can I help you today?
```

---

### 6. Configuration File Support

**Deliverable:** User-global config at `~/.loom/config.json`; project-local at `.loom/config.json`.

**Tasks:**

- Create `src/config/ConfigManager.ts`:
  ```typescript
  import fs from 'fs';
  import path from 'path';
  import os from 'os';
  
  export interface Config {
    defaultProvider?: string;
    providers?: {
      [key: string]: {
        apiKey?: string;
        model?: string;
        baseUrl?: string;
      };
    };
  }
  
  export class ConfigManager {
    private static GLOBAL_PATH = path.join(os.homedir(), '.loom', 'config.json');
    private static LOCAL_PATH = path.join(process.cwd(), '.loom', 'config.json');
  
    static load(): Config {
      const globalConfig = this.loadFile(this.GLOBAL_PATH);
      const localConfig = this.loadFile(this.LOCAL_PATH);
      return { ...globalConfig, ...localConfig }; // Local overrides global
    }
  
    private static loadFile(filepath: string): Config {
      if (!fs.existsSync(filepath)) return {};
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  
    static save(config: Config, global = false): void {
      const filepath = global ? this.GLOBAL_PATH : this.LOCAL_PATH;
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    }
  }
  ```

- Update `ProviderFactory.create()` to read from config if env vars not set
- Update `loom auth` to save API keys to config

**Exit criteria:** `loom auth openai-api` prompts for API key and saves to `~/.loom/config.json`.

---

### 7. Tests (Smoke Tests Only for M1)

**Deliverable:** Basic unit tests for provider interface.

**Tasks:**

- Install `vitest`
- Create `src/providers/__tests__/ProviderFactory.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { ProviderFactory } from '../ProviderFactory';
  
  describe('ProviderFactory', () => {
    it('lists available providers', () => {
      const providers = ProviderFactory.listAvailable();
      expect(providers).toContain('openai-api');
      expect(providers).toContain('bionic');
    });
  
    it('creates OpenAI API provider', () => {
      const provider = ProviderFactory.create('openai-api');
      expect(provider.getName()).toBe('openai-api');
    });
  
    it('throws on unknown provider', () => {
      expect(() => ProviderFactory.create('invalid')).toThrow('Unknown provider');
    });
  });
  ```

- Add `npm test` script

**Exit criteria:** `npm test` passes.

---

### 8. Documentation

**Deliverable:** Updated `README.md` with install + usage + provider setup.

**Tasks:**

- Add sections:
  - Installation (`npm install -g loom`)
  - Quick start (`loom run "Hello"`)
  - Provider setup (OpenAI API, Bionic local)
  - Configuration (`~/.loom/config.json` schema)
  - Environment variables reference
  - Known limitations (no Cursor support yet)

**Exit criteria:** An external user can clone, install, and run `loom run` by following README alone.

---

### 9. OpenAI Subscription Provider (OAuth)

**Deliverable:** `src/providers/OpenAISubscriptionProvider.ts`.

**Tasks:**

- Shell out to `codex login` for auth:
  ```typescript
  async authenticate(): Promise<void> {
    execSync('codex login --status', { stdio: 'inherit' });
    // If not logged in, run: execSync('codex login', { stdio: 'inherit' });
  }
  ```

- Read `~/.codex/auth.json` for access token
- Call `https://chatgpt.com/backend-api/codex/responses`
- Implement Responses API → Chat Completions adapter (see ADR 001)

**Exit criteria:** `loom run --provider openai-subscription "Hello"` uses ChatGPT subscription.

---

### 10. Commit + Push + Open PR

**Deliverable:** Green CI (if any linting/tests set up); PR open on GitHub.

**Tasks:**

- `git add .`
- `git commit -m "M1: Provider interface + OpenAI API + Bionic local"`
- `git push -u origin cursor/m0-provider-feasibility-spike-99b6`
- Open PR with body:
  ```markdown
  ## M0 Feasibility Spike
  
  Documented provider feasibility for OpenAI subscription, Cursor subscription, and Bionic local.
  
  **Findings:**
  - ✅ OpenAI subscription (OAuth via Codex CLI) — FEASIBLE
  - 🚫 Cursor subscription — BLOCKED (no raw model API; ToS violation)
  - ✅ Bionic local (OpenAI-compatible) — FEASIBLE
  
  **Deliverables:**
  - `docs/spikes/M0-providers.md` — Full analysis with citations
  - `docs/adr/001-provider-adapters.md` — Provider interface architecture
  - `docs/spikes/M0-next-steps.md` — Ordered work for M1 skeleton
  
  **Risk Tier:** LOW  
  **Next Step:** M1 skeleton (CLI scaffold + provider interface + OpenAI API + Bionic local working)
  
  See spike docs for details.
  ```

---

## M1 Success Criteria

- [ ] `npm install -g .` installs `loom` CLI
- [ ] `loom providers` lists `openai-api`, `bionic`
- [ ] `loom run "Hello"` works with OpenAI API key
- [ ] `loom run --provider bionic "Hello"` works with LM Studio server running
- [ ] `~/.loom/config.json` stores API keys after `loom auth`
- [ ] README documents installation + provider setup
- [ ] Tests pass (`npm test`)

---

## Post-M1 (M2 Priorities)

1. **Harness core:** File read/write tools, shell execution, basic tool loop
2. **OpenAI subscription provider:** OAuth flow (Codex CLI delegation)
3. **Streaming responses:** Live CLI output instead of blocking on full response
4. **Error handling:** Retry logic, rate limit backoff
5. **Observability:** `loom status`, `loom logs` commands (basic session history)

See PRD v1 milestones for full M2-M4 scope.
