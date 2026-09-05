# ADR-001 — Provider Adapter Architecture

| Field | Value |
| --- | --- |
| Status | **Proposed** — M0 spike complete |
| Date | 2026-09-05 |
| Notion source | https://app.notion.com/p/3d2422966e8e81c3a8f2c2e2af3a25a8 |
| Related | [Technical Design v0](../architecture.md), [PRD](../PRD.md), [M0 Spike](../spikes/M0-providers.md) |
| Deciders | Matheus Anzzulin (technical lead) |

## Context

Loom is a CLI agent harness that must support multiple model providers with heterogeneous authentication and API schemas (PRD v1 § F1). The flagship multi-agent workflow requires switching providers per role:

- **Builder agent:** OpenAI models (subscription or API)
- **Reviewer agent:** Qwen models via Bionic local inference
- **Supervisor agent:** Any provider (user-configurable)

Each provider has different:

- **Authentication:** OAuth 2.0 (OpenAI subscription), API keys (OpenAI API), none (Bionic local)
- **Endpoints:** `chatgpt.com/backend-api/codex` (Responses API), `api.openai.com/v1` (Chat Completions), `localhost:1234/v1` (LM Studio)
- **Request/response schemas:** OpenAI Chat Completions vs Codex Responses API
- **Tool calling formats:** Varies by model/provider

The M0 spike concluded:

- ✅ **OpenAI subscription** (OAuth via Codex CLI) — FEASIBLE
- ✅ **OpenAI API** (API key) — FEASIBLE
- 🚫 **Cursor subscription** — BLOCKED (no raw model API; ToS prohibits reverse engineering)
- ✅ **Bionic local** (OpenAI-compatible) — FEASIBLE

## Decision

Adopt a **provider adapter pattern** with a common interface for all model backends.

### 1. Core Abstraction

All providers implement a `Provider` interface:

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface Response {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

abstract class Provider {
  abstract chat(messages: Message[]): Promise<Response>;
  abstract authenticate(): Promise<void>;
  abstract listModels?(): Promise<string[]>;
}
```

### 2. Concrete Implementations (M1)

#### OpenAISubscriptionProvider

- **Auth:** Delegates to `codex login` (stores OAuth credentials in `~/.codex/auth.json`)
- **Endpoint:** `https://chatgpt.com/backend-api/codex/responses`
- **Schema adapter:** Converts OpenAI Chat Completions format to/from Responses API
- **Config:** `OPENAI_CODEX_AUTH_PATH`, `CHATGPT_OAUTH_TOKEN` (override)

#### OpenAIAPIProvider

- **Auth:** Reads `OPENAI_API_KEY` from environment
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Schema:** Native OpenAI Chat Completions (no adapter needed)
- **Config:** `OPENAI_API_KEY`, `OPENAI_MODEL` (default: `gpt-4o`)

#### BionicLocalProvider

- **Auth:** Optional API token (`BIONIC_API_KEY`); none by default
- **Endpoint:** `BIONIC_BASE_URL/chat/completions` (default: `http://localhost:1234/v1`)
- **Schema:** OpenAI-compatible (LM Studio implements standard `/v1/chat/completions`)
- **Config:** `BIONIC_BASE_URL`, `BIONIC_MODEL_ID`, `BIONIC_API_KEY`

### 3. Provider Selection

**Environment variable (MVP):**

```bash
export LOOM_PROVIDER="openai-subscription"  # or "openai-api", "bionic"
loom run "Build feature X"
```

**CLI flag (M2):**

```bash
loom run --provider bionic "Review PR #42"
```

**Per-agent role configuration (M3):**

```yaml
# .loom/workflow.yaml
agents:
  builder:
    provider: openai-subscription
    model: gpt-4o
  reviewer:
    provider: bionic
    model: qwen-2.5-coder-32b-instruct
  supervisor:
    provider: openai-api
    model: gpt-4o
```

### 4. Static Factory Pattern

Use a factory with static methods to avoid globals:

```typescript
class ProviderFactory {
  static create(type: string): Provider {
    switch (type) {
      case 'openai-subscription':
        return new OpenAISubscriptionProvider();
      case 'openai-api':
        return new OpenAIAPIProvider();
      case 'bionic':
        return new BionicLocalProvider();
      default:
        throw new Error(`Unknown provider: ${type}`);
    }
  }

  static listAvailable(): string[] {
    return ['openai-subscription', 'openai-api', 'bionic'];
  }
}
```

### 5. Adapter Layer for Schema Differences

The Responses API (Codex endpoint) differs from Chat Completions API:

- **Responses API:** `POST /responses` with `{ messages, ... }` → streams `{ response: { text, tool_calls } }`
- **Chat Completions API:** `POST /chat/completions` with `{ model, messages }` → `{ choices: [{ message }] }`

The `OpenAISubscriptionProvider` implements an adapter:

```typescript
class OpenAISubscriptionProvider extends Provider {
  async chat(messages: Message[]): Promise<Response> {
    const rawResponse = await this.callResponsesAPI(messages);
    return this.adaptResponsesAPIToCommonFormat(rawResponse);
  }

  private adaptResponsesAPIToCommonFormat(raw: any): Response {
    return {
      content: raw.response.text,
      toolCalls: raw.response.tool_calls?.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      })),
      finishReason: raw.response.finish_reason,
      usage: {
        inputTokens: raw.usage?.input_tokens || 0,
        outputTokens: raw.usage?.output_tokens || 0,
      },
    };
  }
}
```

## Consequences

### Positive

- **Uniform interface:** Agent harness logic (tool loop, memory, file operations) is provider-agnostic
- **Easy to add providers:** New backends only need to implement `Provider` interface
- **Per-role provider switching:** Flagship workflow (OpenAI build → Qwen review) is architecturally clean
- **Testability:** Mock providers for unit tests; swap real providers in integration tests
- **No vendor lock-in:** Loom harness logic is decoupled from any single model provider

### Negative

- **Schema adapter complexity:** Responses API vs Chat Completions normalization adds code
- **Token refresh logic:** OAuth providers (OpenAI subscription) need periodic token refresh; must shell out to `codex login --refresh` or implement OAuth flow
- **Bionic dependency:** User must manually start LM Studio server (Loom does not manage it)
- **Tool calling format variance:** Different providers have slightly different tool schemas; adapter must normalize

### Neutral

- **Environment variables for MVP:** Simplifies M1 but less discoverable than CLI flags or config files (addressed in M2)
- **No Cursor support:** Deferred until Cursor ships official raw model API (revisit post-MVP)

## Alternatives Considered

### Alternative 1: Direct OpenAI SDK Usage

Use `openai` npm package for all providers.

**Rejected because:**

- Cursor provider does not have OpenAI SDK support (would need custom fetch anyway)
- Bionic requires custom `base_url` (OpenAI SDK supports this, but adds dependency weight)
- Adapter pattern gives more control over request/response normalization

### Alternative 2: Plugin System (Dynamic Loading)

Load providers as npm packages: `loom-provider-openai`, `loom-provider-bionic`.

**Rejected for MVP because:**

- Over-engineered for three providers
- Complicates distribution (multiple packages)
- Prefer monorepo with compile-time provider registry for M1

**Reconsider post-MVP** when third-party contributors add providers (e.g., Anthropic direct, Google Gemini, Ollama).

### Alternative 3: Unified Endpoint Proxy

Run a local proxy server that exposes all providers as OpenAI-compatible endpoints.

**Rejected because:**

- Adds deployment complexity (separate proxy process)
- Authentication still varies (proxy would need to handle OAuth flows)
- Loom is a CLI, not a long-running service; static provider classes are simpler

## Open Questions

1. **Token refresh for OpenAI subscription:** Should Loom implement OAuth refresh flow or always shell out to `codex login --refresh`?
   - **Proposed:** Shell out for MVP (simpler); implement native refresh in M2 if latency becomes an issue.

2. **Model selection per message:** Should provider support per-message model switching (e.g., use `gpt-4o` for complex tasks, `gpt-4o-mini` for simple tool calls)?
   - **Proposed:** Defer to M3; MVP uses one model per session.

3. **Streaming responses:** Should `Provider.chat()` return a stream instead of awaiting full response?
   - **Proposed:** M1 implements blocking `Promise<Response>`; M2 adds `Provider.chatStream()` for live CLI output.

4. **Rate limiting / retries:** Should provider interface handle retries and backoff?
   - **Proposed:** Yes; add `maxRetries` option to `Provider` base class in M2 (not MVP).

## References

- [PRD v1 § F1 (Provider router)](../PRD.md#f1--provider-router)
- [M0 feasibility spike](../spikes/M0-providers.md) — OpenAI OAuth, Cursor ToS analysis, Bionic setup
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [LM Studio OpenAI Compatibility](https://lmstudio.ai/docs/developer/openai-compat)

## Change Log

- **2026-09-05:** Initial draft based on M0 spike findings
