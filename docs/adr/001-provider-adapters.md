# ADR-001 — Provider adapters

| Field | Value |
| --- | --- |
| Status | **Proposed** — needs M0 spike results |
| Date | 2026-09-05 |
| Notion source | https://app.notion.com/p/3d2422966e8e81c3a8f2c2e2af3a25a8 |
| Related | [Technical Design v0](../architecture.md), [PRD](../PRD.md) |

## Context

Loom must route to **OpenAI subscription**, **Cursor subscription**, and **Bionic local** with a pluggable interface (chat/completions + tool-calling where supported). Per-session or per-message provider switch is required for MVP.

## Decision (proposed)

```typescript
interface ProviderAdapter {
  readonly id: string;
  complete(req: ChatRequest): Promise<ChatResponse>;
  // optional streaming later
}
```

- Secrets from **environment variables only** in MVP (design call sites so a later keychain/encrypted-file backend can plug in without rewriting adapters).
- **Bionic**: OpenAI-compatible base URL assumed until spike proves otherwise.
- **Cursor** path: spike first; may ship as "unsupported" with a documented fallback — no silent ToS violation.
- **OpenAI**: subscription-auth path TBD (ChatGPT login vs API key from subscription); confirm in M0.

Adapters live under `packages/providers`. The core agent loop depends only on `ProviderAdapter`, not on vendor SDKs directly.

## Consequences

- M0 must validate Bionic OpenAI-compat, OpenAI subscription auth UX, and Cursor feasibility before locking MVP provider scope.
- Streaming, embeddings, and provider-specific tool schemas are deferred until at least one adapter is green.

## Status

Proposed — needs M0 spike results.
