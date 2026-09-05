# M0 Provider Feasibility Spike

**Status:** Complete — 2026-09-05  
**Scope:** Document feasibility of three provider paths for Loom MVP (PRD v1 § F1, F2, M0).

## Executive Summary

| Provider Path | Feasibility | Risk Level | MVP Recommendation |
|---------------|-------------|------------|-------------------|
| OpenAI Subscription | ✅ FEASIBLE | LOW | Ship with OAuth flow |
| Cursor Subscription | 🚫 **BLOCKED** | HIGH | Defer; use SDK as fallback |
| Bionic Local | ✅ FEASIBLE | LOW | Ship with base URL config |

**Key Finding:** Cursor does not expose a raw model API for external CLIs. Using subscription tokens from a third-party harness violates ToS. The official Cursor SDK runs the full Cursor agent harness (not raw model access) and is unsuitable for Loom's multi-provider architecture.

**M1 Decision:** Ship OpenAI subscription + Bionic local paths only. Document Cursor SDK as a post-MVP exploration if Cursor ships an official OpenAI-compatible endpoint.

---

## 1. OpenAI: Subscription vs API

### Requirements Context (PRD)

- **F1 — Provider router:** "OpenAI (subscription-auth path — TBD exact mechanism: ChatGPT login vs API key from subscription)"
- **F3 — Privacy / NDA mode:** "Prefer provider modes with no-training / zero-retention when calling remote models"
- **Checklist:** "User can authenticate OpenAI subscription path and complete a tool-using turn"

### What Actually Exists (2026)

OpenAI provides **two distinct authentication paths** for external CLIs:

#### 1.1 Subscription Path (ChatGPT Plus/Pro)

**Mechanism:** OAuth 2.0 + PKCE flow via official Codex CLI.

- **Package:** `@openai/codex` (npm install -g)
- **Auth command:** `codex login`
  - Opens browser to `auth.openai.com`
  - Headless alternative: `codex login --device-auth` (device code flow)
  - Stores credentials in `~/.codex/auth.json` (owner-only permissions)
- **Endpoint:** `https://chatgpt.com/backend-api/codex` (Responses API, not Chat Completions)
- **Billing:** Included in ChatGPT Plus ($20/mo) or Pro ($200/mo) subscription; no per-token charges
- **Rate limits:** Subscription tier-based (lower than API for casual users, sufficient for daily work)
- **Training policy:** ChatGPT Enterprise/Team have zero-retention options; Plus/Pro default to 30-day retention unless opted out in account settings

**Implementation for Loom:**

```typescript
// Pseudocode — env-var approach for MVP
class OpenAISubscriptionProvider {
  static async authenticate(): Promise<void> {
    // Delegate to official Codex CLI for browser OAuth
    execSync('codex login', { stdio: 'inherit' });
    // Credentials now in ~/.codex/auth.json
  }

  static async chat(messages: Message[]): Promise<Response> {
    const authToken = this.readCodexAuth(); // Read ~/.codex/auth.json
    return fetch('https://chatgpt.com/backend-api/codex/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
  }
}
```

**Environment Variables (MVP contract):**

- `OPENAI_CODEX_AUTH_PATH` — Path to auth JSON (default: `~/.codex/auth.json`)
- `CHATGPT_OAUTH_TOKEN` — Override for CI/non-interactive use (short-lived, not refreshed)

#### 1.2 API Path (Pay-per-token)

**Mechanism:** API key authentication.

- **Credential:** `OPENAI_API_KEY=sk-proj-...` (platform.openai.com/api-keys)
- **Endpoint:** `https://api.openai.com/v1/chat/completions` (standard OpenAI API)
- **Billing:** Usage-based ($5/M input + $15/M output for GPT-4o as of 2026)
- **Training policy:** API data is not used for training by default (OpenAI API Terms § 3.c)

**Implementation for Loom:**

```typescript
class OpenAIAPIProvider {
  static async chat(messages: Message[]): Promise<Response> {
    const apiKey = process.env.OPENAI_API_KEY;
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
      }),
    });
  }
}
```

**Environment Variables:**

- `OPENAI_API_KEY` — API key from platform.openai.com

### MVP Recommendation

**Ship both paths** with environment variable configuration:

1. **Subscription path (primary):** Use Codex OAuth for solo users who already pay for ChatGPT Plus/Pro. Delegate browser login to `codex login` command. Parse `~/.codex/auth.json` for access tokens. Handle token refresh (refresh_token in auth JSON; Codex CLI auto-refreshes, Loom can shell out to `codex login --refresh` or implement OAuth refresh flow).

2. **API path (fallback):** Support `OPENAI_API_KEY` for users who prefer pay-per-token or need higher rate limits. Simpler implementation; no OAuth complexity.

**Auth UX (MVP):**

```bash
# Subscription path
$ loom auth openai --subscription
# Shells out to: codex login
# Success: Credentials stored in ~/.codex/auth.json

# API path
$ loom auth openai --api-key
# Prompts: Enter your OpenAI API key: 
# Stores in: ~/.loom/config.json (user-namespaced)
# Or: export OPENAI_API_KEY=sk-proj-...
```

### Risks

| Risk | Mitigation | Severity |
|------|-----------|----------|
| Codex CLI dependency adds npm install step | Document in README; check for `codex` binary at runtime; prompt user to install | LOW |
| OAuth token expiry/refresh logic | Codex CLI handles refresh; Loom reads from `~/.codex/auth.json` after each `codex login --refresh` call | LOW |
| Training opt-out not enforced programmatically | Document manual account settings step; recommend Enterprise/Team for zero-retention guarantee | MEDIUM |
| Responses API differs from Chat Completions | Adapter layer in Loom provider interface to normalize request/response format | LOW |

### Citations

- [OpenAI Codex CLI documentation](https://cerevisor.com/docs/guides/providers/openai-codex-cli) — OAuth flow, subscription billing
- [Docker Agent ChatGPT provider docs](https://docs.docker.com/ai/docker-agent/providers/chatgpt/) — OAuth 2.0 + PKCE mechanics, token refresh
- [Codex CLI install tutorial](https://autokaam.com/tutorials/codex-cli-install-and-first-task/) — Auth flow, port 1455 callback, `~/.codex/auth.json` structure
- [OpenAI Platform API docs](https://platform.openai.com/docs) — API key auth, training policy

---

## 2. Cursor Subscription Tokens from External CLI

### Requirements Context (PRD)

- **F1 — Provider router:** "Cursor (subscription token path — **feasibility risk**; see Risks)"
- **Goals:** "Cursor subscription (use plan tokens instead of separate API spend)"
- **Non-goals:** "Guaranteeing unsupported unofficial access to Cursor models if Cursor provides no sanctioned API"
- **Risks:** "Cursor plan tokens from a third-party CLI — may lack a public API; ToS may forbid scraping IDE sessions"

### What Actually Exists (2026)

Cursor provides **three official programmatic access methods**, all of which run the **Cursor agent harness** (not raw model access):

#### 2.1 Cursor SDK (@cursor/sdk)

- **Package:** `@cursor/sdk` (TypeScript), `cursor-sdk` (Python)
- **Auth:** User API key (dashboard.cursor.com/api) or Service Account API key (Enterprise)
  - Interactive hosts: `Cursor.auth.login()` opens browser, mints API key, stores in `~/.cursor/sdk/auth.json`
- **Capabilities:** Launch agents locally or on Cursor cloud; full harness (codebase indexing, MCP, tools)
- **Pricing:** Same as IDE/Cloud Agents; bills to user plan or team
- **Key limitation:** **Always runs the Cursor agent harness.** You cannot call raw models (e.g., "give me Composer 2.5 completions in my own harness"). The SDK executes `Agent.create()` → streams agent turns → returns results.

**Example (from SDK docs):**

```typescript
import { Agent } from '@cursor/sdk';

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: { id: "composer-2.5" },
  local: { cwd: process.cwd() },
});

const stream = await agent.sendMessage("Refactor this file");
// Agent runs in Cursor harness, returns tool calls + diffs
```

**Why this doesn't fit Loom's architecture:**

- Loom is building **its own harness** (files, shell, memory, MCP, multi-agent orchestration). The PRD flagship workflow is "Builder (OpenAI) → Reviewer (Qwen via Bionic) → Supervisor" — each role uses a **different provider** but the **same Loom harness**.
- The Cursor SDK does not expose a "raw" Composer 2.5 or Claude endpoint. It runs the Cursor agent, which duplicates Loom's harness logic and prevents Loom from controlling file operations, tool execution, and memory.

#### 2.2 Cursor CLI (cursor-agent)

- **Command:** `cursor-agent -p "task description"`
- **Auth:** `CURSOR_API_KEY` or interactive login
- **Same limitation as SDK:** Runs the Cursor agent harness, not raw model access.

#### 2.3 Unofficial Proxies / Reverse Engineering

Multiple third-party tools (e.g., Oh My Pi's `cursor` provider, codex-openai-wrapper repos) reverse-engineer Cursor's private IDE endpoints to expose an OpenAI-compatible `/v1/chat/completions` API.

**Cursor's official position (forum posts by Cursor staff, 2026):**

> "Using subscription models like Composer 2.5 outside Cursor via your own proxy [...] goes against the Use Restrictions in the Terms of Service, especially reverse engineering and accessing internal service structure. Also, using a subscription outside official clients can trigger abuse enforcement and may get your account banned."  
> — [Cursor Forum: Using Frontier Models in External Harnesses](https://forum.cursor.com/t/using-cursor-frontier-models-like-composer-2-5-in-external-harnesses-e-g-codex/164676)

> "A 'personal, local-only' proxy doesn't change the analysis. The issue isn't who else uses the proxy. It's the fact of calling private endpoints outside official clients."  
> — [Cursor Forum: Oh My Pi Cursor Provider ToS Question](https://forum.cursor.com/t/does-using-oh-my-pi-s-cursor-provider-or-an-openai-compatible-proxy-to-the-same-endpoints-violate-cursor-s-tos/167778)

**ToS Reference:**

Cursor Terms of Service § 1.5 (Use Restrictions) prohibits:

- "Reverse engineer, decompile, or otherwise attempt to discover the source code or underlying components of the Service"
- "Access the internal structure of the Service"

### Feasibility Conclusion

**🚫 BLOCKED** for MVP.

- **No official raw model API:** Cursor does not provide an OpenAI-compatible `/v1/chat/completions` endpoint. All official methods (SDK, CLI, Cloud Agents API) run the Cursor agent harness.
- **ToS violation risk:** Reverse-engineering private endpoints (the only way to get raw model access) explicitly violates § 1.5 of Cursor ToS and may result in account suspension.
- **Open feature request:** Cursor staff acknowledge an open feature request for a raw `/v1/chat/completions` endpoint, but "no firm timeline" as of 2026-09-05.

### Fallback Options

#### Option A: Defer Cursor path entirely (recommended for MVP)

Ship Loom 1.0 with OpenAI subscription + Bionic local only. Add Cursor when/if they ship a sanctioned raw model API.

**Pros:**

- No ToS risk
- Matheus can still use Loom with OpenAI/Bionic for the flagship multi-agent workflow
- Clean provider architecture without Cursor SDK's harness conflict

**Cons:**

- Matheus cannot use his Cursor subscription tokens for Loom inference in MVP

#### Option B: Cursor SDK as a separate "meta-agent" mode (not MVP)

Run Cursor SDK agents as **external specialist agents** in Loom workflows, but treat them as black boxes (Loom delegates a task → Cursor agent runs in its harness → returns results). This is architecturally different from the PRD's provider-switch model (same harness, different models).

**Pros:**

- Uses sanctioned Cursor API
- Adds Cursor models to Loom workflows

**Cons:**

- Breaks PRD's provider abstraction (F1: "pluggable provider interface")
- Duplicates harness logic (files, shell, memory run twice: once in Loom, once in Cursor)
- Confusing UX: "build with OpenAI" vs "build with Cursor" would have different tool/file behaviors

#### Option C: Wait for official OpenAI-compatible endpoint

Monitor Cursor's roadmap for `/v1/chat/completions` API. Ship Loom MVP without Cursor; add in v1.1+ when available.

### MVP Recommendation

**Ship MVP without Cursor provider.** Document as a known limitation in README:

```markdown
## Supported Providers (MVP 1.0)

- ✅ OpenAI (subscription via Codex OAuth or API key)
- ✅ Bionic Local (OpenAI-compatible endpoint)
- ⏳ Cursor (pending official API; see [open feature request](https://forum.cursor.com/...))

Cursor's SDK and CLI run the Cursor agent harness, which conflicts with Loom's 
architecture. We will add Cursor when they ship a raw model API.
```

**Post-MVP:** Re-evaluate when Cursor ships OpenAI-compatible endpoint or provides official guidance for third-party harnesses.

### Citations

- [Cursor SDK TypeScript docs](https://cursor.com/docs/sdk/typescript) — API key auth, `Agent.create()` usage
- [Cursor Forum: External Harnesses ToS](https://forum.cursor.com/t/using-cursor-frontier-models-like-composer-2-5-in-external-harnesses-e-g-codex/164676) — Official response on reverse engineering
- [Cursor Forum: Proxy ToS Violation](https://forum.cursor.com/t/does-using-oh-my-pi-s-cursor-provider-or-an-openai-compatible-proxy-to-the-same-endpoints-violate-cursor-s-tos/167778) — Local proxy still violates § 1.5
- [Cursor Service Accounts docs](https://cursor.com/docs/account/enterprise/service-accounts) — Enterprise auth for SDK
- [Cursor ToS](https://cursor.com/terms) — § 1.5 Use Restrictions

---

## 3. Bionic Local

### Requirements Context (PRD)

- **F1 — Provider router:** "Bionic local (OpenAI-compatible or native local endpoint)"
- **F5 — Role-based agents:** "Reviewer path for MVP: **Qwen via local Bionic**"
- **Flagship workflow:** "Reviewer agent (**Qwen**, Alibaba, via **local Bionic**) reviews the PR"

### What Actually Exists (2026)

**LM Studio** (the parent project of Bionic) exposes an **OpenAI-compatible HTTP server** for local inference.

#### 3.1 LM Studio Server

- **Endpoint:** `http://localhost:1234/v1` (default; port configurable)
- **Supported routes:**
  - `GET /v1/models` — List loaded models
  - `POST /v1/chat/completions` — Chat (same schema as OpenAI)
  - `POST /v1/completions` — Text completions
  - `POST /v1/embeddings` — Embeddings
  - `POST /v1/responses` — Codex-compatible agentic endpoint
- **Authentication:** None by default; optional API token in server settings
- **Standard OpenAI clients work:** Just change `base_url` to `http://localhost:1234/v1`

**Example (curl):**

```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-2.5-coder-32b-instruct",
    "messages": [
      {"role": "user", "content": "Review this code diff for bugs"}
    ]
  }'
```

**Example (OpenAI Python client):**

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1")

response = client.chat.completions.create(
  model="qwen-2.5-coder-32b-instruct",
  messages=[{"role": "user", "content": "Review this code diff"}]
)
```

#### 3.2 Bionic (LM Studio's Agent App)

**Bionic** is a separate standalone agent application (like Loom, Claude Code, Codex). It is **not** a server/API. For Loom's purposes, **ignore Bionic the app** and use **LM Studio's server mode** instead.

- Bionic = agentic UI/harness (competes with Loom)
- LM Studio server = inference backend (Loom will call this)

### Implementation for Loom

```typescript
class BionicLocalProvider {
  private baseUrl: string;
  private modelId: string;

  constructor() {
    // Environment variable contract
    this.baseUrl = process.env.BIONIC_BASE_URL || 'http://localhost:1234/v1';
    this.modelId = process.env.BIONIC_MODEL_ID || 'qwen-2.5-coder-32b-instruct';
  }

  static async chat(messages: Message[]): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId,
        messages,
      }),
    });
    return response.json();
  }

  static async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`);
    const data = await response.json();
    return data.data.map((m: any) => m.id);
  }
}
```

### Environment Variables (MVP contract)

- `BIONIC_BASE_URL` — OpenAI-compatible API base URL (default: `http://localhost:1234/v1`)
- `BIONIC_MODEL_ID` — Model identifier as listed in LM Studio (e.g., `qwen-2.5-coder-32b-instruct`)
- `BIONIC_API_KEY` — Optional; set if user enables authentication in LM Studio server settings

### User Setup (Smoke Test Instructions)

**Prerequisites:**

1. Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Download a model (e.g., Qwen 2.5 Coder 32B Instruct quantized)
3. Load the model in LM Studio

**Start the server:**

1. Open LM Studio → Developer tab
2. Click "Start Server"
3. Verify endpoint: `http://localhost:1234/v1`
4. Test: `curl http://localhost:1234/v1/models`

**Configure Loom (MVP):**

```bash
export BIONIC_BASE_URL="http://localhost:1234/v1"
export BIONIC_MODEL_ID="qwen-2.5-coder-32b-instruct"

loom run --provider bionic "Review the changes in PR #42"
```

**Network access (optional):**

- For remote machines (e.g., dev server), configure LM Studio to bind to `0.0.0.0` instead of `localhost`
- Set `BIONIC_BASE_URL=http://<remote-ip>:1234/v1`
- **Security:** Enable API token authentication in LM Studio if exposing over network

### MVP Recommendation

**✅ Ship with environment variable configuration.**

- Simple implementation: standard OpenAI client library with custom `base_url`
- No authentication complexity for local use (optional API token support for advanced users)
- Model ID must match LM Studio's name (user looks this up via `GET /v1/models`)

**Documentation (README):**

```markdown
### Bionic Local Setup

Loom uses LM Studio's OpenAI-compatible server for local inference.

1. Install LM Studio: https://lmstudio.ai
2. Download and load a model (we recommend Qwen 2.5 Coder 32B Instruct)
3. Start the server (Developer tab → Start Server)
4. Configure Loom:

```bash
export BIONIC_BASE_URL="http://localhost:1234/v1"
export BIONIC_MODEL_ID="qwen-2.5-coder-32b-instruct"
loom run --provider bionic "Your task here"
```

Note: Loom does NOT start or manage LM Studio. You must run it separately.
```

### Risks

| Risk | Mitigation | Severity |
|------|-----------|----------|
| User forgets to start LM Studio server | Loom checks `/v1/models` on startup; friendly error if unreachable | LOW |
| Model ID mismatch | Loom lists available models via `GET /v1/models` in error message | LOW |
| LM Studio not installed | Document as prerequisite; out of scope for Loom installer | LOW |
| Performance/VRAM limits | User responsibility; document recommended specs in README | LOW |

### Citations

- [LM Studio OpenAI Compatibility docs](https://lmstudio.ai/docs/developer/openai-compat) — Endpoint spec, base URL configuration
- [LM Studio API Quickstart](https://lmstudio.ai/docs/developer/rest/quickstart) — Server setup, model listing
- [Bionic overview](https://lmstudio.ai/docs/bionic) — Clarifies Bionic is a separate agent app, not the server
- [LM Studio Bionic tutorial](https://aiindigo.com/tutorials/getting-started-with-lm-studio-bionic-high-speed-local-llm-inference) — Server start instructions, API examples

---

## Summary Table

| Provider | Auth Method | Endpoint | Environment Variables | Feasibility | MVP Status |
|----------|-------------|----------|----------------------|-------------|------------|
| **OpenAI Subscription** | OAuth 2.0 (Codex CLI) | `chatgpt.com/backend-api/codex` | `OPENAI_CODEX_AUTH_PATH`, `CHATGPT_OAUTH_TOKEN` | ✅ FEASIBLE | **SHIP** |
| **OpenAI API** | API Key | `api.openai.com/v1` | `OPENAI_API_KEY` | ✅ FEASIBLE | **SHIP** |
| **Cursor Subscription** | N/A (no raw API) | N/A | N/A | 🚫 BLOCKED | **DEFER** |
| **Bionic Local** | None (optional token) | `localhost:1234/v1` | `BIONIC_BASE_URL`, `BIONIC_MODEL_ID`, `BIONIC_API_KEY` | ✅ FEASIBLE | **SHIP** |

---

## M1 Handoff

**Green-lit for M1 skeleton:**

1. OpenAI subscription provider (OAuth via Codex CLI delegation)
2. OpenAI API provider (simple API key auth)
3. Bionic local provider (OpenAI-compatible base URL + model ID)

**Deferred to post-MVP:**

- Cursor provider (revisit when official OpenAI-compatible endpoint ships or Cursor provides guidance for third-party harnesses)

**Architecture decision:**

- All providers implement a common `ProviderInterface` with `chat(messages: Message[]): Promise<Response>` method
- Provider selection via environment variable or CLI flag (e.g., `loom --provider openai-subscription`)
- Adapter pattern for normalizing OpenAI Chat Completions vs Codex Responses API schemas

See `docs/spikes/M0-next-steps.md` for ordered M1 work.
