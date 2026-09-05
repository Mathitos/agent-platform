# Loom — Product Requirements Document (v1 FROZEN)

**Status:** PRD v1 FROZEN — 2026-09-04 (America/Sao_Paulo).
Further changes = v1.1+; do not silently rewrite v1 scope without an explicit reopen.

| Field | Value |
| --- | --- |
| Product | **Loom** — weave many agents/providers into one workflow |
| CLI | `loom` |
| License | MIT |
| Repo | https://github.com/Mathitos/agent-platform |
| Notion source | https://app.notion.com/p/3d1422966e8e81efaea6ed20f9395344 |

## Problem

Matheus currently splits work across multiple agent CLIs/UIs, each locked to one provider stack:

- Local models via Bionic
- Anthropic via Claude Code
- Grok via Grok Bot
- OpenAI via a Hermes bot

He needs **one CLI harness** that can switch providers for the moment, including using **subscription tokens** (OpenAI, Cursor) and **local inference** (Bionic), without leaking harness/memory data into third-party training pipelines — critical for corporate/NDA work.

## Goals

1. Ship a **CLI-first** agent platform (Claude Code–class capabilities).
2. Support **multiple model backends** with login/routing for:
   - OpenAI subscription
   - Cursor subscription (use plan tokens instead of separate API spend)
   - Local AI via Bionic
3. Keep **harness state, memory, and local artifacts on-device**; never send them to third parties **for training**.
4. Solo-user MVP first; design for later **open-source contributors** on GitHub (`Mathitos/agent-platform`).

## Non-goals (MVP)

- Desktop/GUI or web app (CLI first).
- Multi-tenant team admin / org SSO as day-one product.
- Replacing Cursor IDE itself (CLI harness that can *consume* Cursor plan tokens if feasible).
- Guaranteeing unsupported unofficial access to Cursor models if Cursor provides no sanctioned API.

## Users

- **Primary (MVP):** Matheus, solo, terminal-first, corporate + personal projects.
- **Later:** open-source contributors after MVP is usable.

## User stories

1. As a solo user, I can run one CLI and pick OpenAI subscription, Cursor plan, or Bionic local for a session/task.
2. As a corp user, my memory/harness files stay local and are never uploaded for provider training.
3. As a Claude Code user, I keep file edit, shell, memory, MCP/tools, and git/PR workflows in the new CLI.
4. As a future contributor, I can clone a public repo and understand architecture from docs/PRD.

## MVP 1.0 scope (locked)

Must ship **all** of the following — without them Matheus cannot replace what he already does in Claude Code / multi-tool workflow:

1. Single-agent CLI chat + tools (files/shell)
2. Multi-provider switch (OpenAI subscription / Cursor subscription / Bionic local)
3. Multi-agent workflow runner (build / review / supervise; parallel specialists)
4. Observability CLI (`status` / `logs` / `report`) + budgets/timeouts/retries/human pause
5. MCP connectors
6. Supervisor auto-merge when checks pass

Deep harness/memory architecture polish remains post-1.0, but **capability parity is not optional** for 1.0.

## Flagship use case — multi-agent PR workflow

Example desired flow:

1. **Builder agent** (e.g. OpenAI model) implements a change and opens/updates a PR.
2. **Reviewer agent** (**Qwen**, Alibaba, via **local Bionic**) reviews the PR (diff, tests, findings).
3. **Supervisor agent** (separate model) orchestrates the workflow, decides next steps, and gates merge readiness. **Supervisor may merge when checks pass.**

Operator must be able to **inspect**:

- Workflow graph / step status (who ran, what is waiting, what is blocked)
- Token consumption (per agent, per step, totals)
- Time to completion (per step + end-to-end)
- Model/provider used per role
- Artifacts produced (PR URL, review notes, logs)

This implies first-class **multi-agent orchestration** + **observability/telemetry** in the CLI (not just single-agent chat).

Observability MVP surface: CLI `status` / `logs` / `report`. Architecture must be **easily portable to a web dashboard** after first delivery (shared event/telemetry store, not CLI-only coupling).

## Functional requirements

### F1 — Provider router

- Pluggable provider interface (chat/completions + tool-calling where supported).
- Configured backends:
  - OpenAI (subscription-auth path — TBD exact mechanism: ChatGPT login vs API key from subscription).
  - Cursor (subscription token path — **feasibility risk**; see Risks).
  - Bionic local (OpenAI-compatible or native local endpoint).
- Per-session or per-message provider switch.

### F2 — Harness (Claude Code parity bar)

- Read/write local files
- Run shell commands (with clear permission model)
- Persistent memory across sessions (local store)
- Tools / MCP connectors
- Git / PR helpers

### F3 — Privacy / NDA mode

- Local storage for harness, memory, transcripts metadata as designed
- Explicit policy: **no sending local harness/memory corpora to third parties for training**
- Prefer provider modes with no-training / zero-retention when calling remote models for inference
- Document what *does* leave the machine (prompts/tool results sent for inference to the selected provider)

### F4 — CLI UX

- Installable CLI (`loom`)
- Auth commands for each provider
- Clear active-provider indicator
- Project-local + user-global config (user-namespaced)

### F5 — Role-based agents

- Assign different models/providers to builder / reviewer / supervisor roles in one workflow.
- Reviewer path for MVP: **Qwen via local Bionic**.

### F6 — Workflow runner

- Define/run a multi-step agentic pipeline (at least: build PR → review → supervise).
- Supervisor may run **parallel specialist agents**.
- Workflow definition: repo **YAML/JSON file is source of truth**; CLI scaffolds it.
- Support **pause/resume across sessions** with persisted run state.

### F7 — Observability

- Live + historical view of steps, tokens, latency, costs (where priced), and outcomes.
- Exportable logs kept local by default.
- CLI commands: `status` / `logs` / `report`.

## Guardrails (MVP)

- Hard **max tokens / cost budget** per workflow
- Hard **max wall-clock time** per workflow
- **Auto-retry** failed steps N times (N configurable)
- **Pause for human** on failure after retries exhausted (or on configured failure classes)
- Workflow definition: repo YAML/JSON file is source of truth; CLI scaffolds it

## Tool permission model

- Default: **YOLO / full auto inside trusted folders** (user marks/trusts project paths).
- Outside trusted folders: safer path (ask or deny) — confirm in follow-up if not specified.

## Memory & harness depth

- Intent: **layered memory** — global user preferences, project-scoped workflows/memory, per-run memory, and separate corp vs personal stores where needed.
- **Defer deep harness design to post–MVP 1.0.** MVP 1.0 should not block on a full Grok-Bot-class harness architecture; ship the minimum that unlocks the multi-agent PR workflow + provider routing + observability CLI.

## Notifications (MVP)

- **OS notification** when a workflow finishes or fails (plus terminal output).
- Chat apps / webhooks: post-MVP unless trivial.

## Localization

- **Bilingual UI from day one** (English + Brazilian Portuguese).
- User-selectable locale; strings externalized (no hardcoded monolingual CLI).

## Platforms (MVP 1.0)

- First-class: **macOS** and **Linux**
- **Windows via WSL** (native Windows not required for 1.0)

## Distribution (MVP 1.0)

- Install as global package for the `loom` CLI via npm or pnpm.
- Strongly implies **TypeScript/Node** for 1.0 unless a native binary is wrapped later.

## License

- **MIT** — permissive OSS; commercial use/profit OK; company distribution OK.
- Note: MIT does **not** force forks to stay open (tradeoff vs earlier copyleft preference).

## Users & config

- MVR: **single active user**.
- Still ship **user-scoped configs** (profiles, provider auth, prefs, memory roots) so later versions can **switch / add users** without a rewrite.
- Do not hardcode a global singleton config path that cannot be namespaced by user id later.
- Exact on-disk paths **decided in a tech spike**; hard requirement: **user namespacing** from day one.

## Secrets (MVP)

- **Environment variables only** for provider credentials in MVP.
- Design user-namespaced config so a later keychain/encrypted-file backend can plug in without rewriting call sites.
## Success / golden path (MVP 1.0)

- Primary demo: **Loom replaces Claude Code for a week** of real daily work (not a toy script).
- Multi-agent PR workflow (OpenAI build / Qwen review / supervisor merge) remains a flagship scenario, but week-long daily replacement is the acceptance bar.

### Checklist (MVP)

- [ ] CLI installs and runs a multi-step coding task with tools (files + shell) on at least **one** remote provider and **Bionic local**.
- [ ] User can authenticate OpenAI subscription path and complete a tool-using turn.
- [ ] Cursor subscription path: either works via sanctioned mechanism **or** is documented as blocked with a fallback (API key / other) — no silent ToS violation.
- [ ] Memory persists across CLI restarts and is not uploaded for training.
- [ ] README + architecture doc good enough for an external contributor to run locally.
- [ ] Multi-agent build/review/supervise workflow with observability and supervisor auto-merge when checks pass.

## Token budget / burn-and-resume strategy

**Build Loom using Cursor subscription tokens only** (unless explicitly told otherwise). Goal: keep building until subscription tokens are exhausted, then continue exactly where we left off when the plan refreshes.

### Process

1. **One board row / one PR stream** at a time.
2. Every pause leaves a clear **Next step**, blockers, and last green commit on the Notion row + PR body.
3. Prefer **Bionic/local** (and cheaper paths) for exploration; spend plan tokens on high-leverage implementation.
4. Stop only at a **green commit or draft PR** — no silent half-broken WIP.
5. On refresh: resume the **same** boarded task and cloud agent (reply), do not relaunch from zero.
6. Stage **Holding** when waiting on quota refresh (distinct from Blocked-by-bug).

### Product implication for Loom

- Workflow budgets already required; also support **pause/resume across sessions** with persisted run state so a human can stop when tokens are empty and continue later.

## Non-functional requirements

- TypeScript/Node is the tentative stack lean (strengthened by package-manager distribution choice).
- Public GitHub repo: https://github.com/Mathitos/agent-platform
- MIT license.
- Security: secrets via env in MVP; never commit tokens.

## Risks & open questions

1. **Cursor plan tokens from a third-party CLI** — may lack a public API; ToS may forbid scraping IDE sessions. Needs spike before committing MVP scope.
2. **OpenAI subscription vs API** — ChatGPT Plus/Pro vs API billing are different; confirm exact auth UX.
3. **Bionic** — confirm endpoint shape (OpenAI-compat URL, auth, model IDs).
4. **Outside trusted folders** — safer permission path (ask/deny) still to confirm.
5. Cursor path: ship via sanctioned mechanism or defer with documented fallback — no silent ToS violation.

## Milestones

1. **M0 — Spike:** Cursor subscription feasibility; OpenAI subscription auth; Bionic smoke test.
2. **M1 — Skeleton CLI:** provider interface + local config + one OpenAI-compat backend + Bionic.
3. **M2 — Harness core:** files, shell, memory, basic tool loop.
4. **M3 — MCP + git/PR helpers.**
5. **M4 — Docs + OSS polish;** Cursor path resolved (ship or defer). Multi-agent workflow runner + observability + supervisor auto-merge land as part of reaching MVP 1.0 across these milestones (capability parity required before calling 1.0 done).

## Decisions log

| Decision | Choice |
| --- | --- |
| Form factor | CLI first |
| Product / CLI name | Loom / `loom` |
| Providers (intent) | OpenAI subscription, Cursor subscription, Bionic local |
| Harness bar | Claude Code parity (files, shell, memory, MCP, git/PR) |
| Privacy | Local harness/memory; no third-party training use |
| Audience | Solo MVP → OSS contributors later |
| Repo | Mathitos/agent-platform (public) |
| License | MIT |
| Flagship workflow | Builder (OpenAI) → Reviewer (Qwen via Bionic) → Supervisor; supervisor may merge when checks pass |
| Agent concurrency | Supervisor may run parallel specialist agents |
| Observability MVP | CLI `status` / `logs` / `report`; telemetry store designed for later web dashboard |
| Qwen path | Local Bionic |
| Workflow definition | Repo YAML/JSON source of truth; CLI scaffolds |
| Guardrails | Token/cost budget, wall-clock cap, auto-retry, human pause |
| Tool policy | YOLO / full auto in trusted folders |
| Memory depth | Layered intent; deep harness post-1.0 |
| Notifications | OS notification on finish/fail |
| Localization | Bilingual EN + PT-BR from day one |
| Platforms | macOS + Linux; Windows via WSL |
| Install | npm/pnpm global (`loom`) |
| Users / config | Single user MVP; user-namespaced configs from day one |
| Secrets | Env vars only for MVP |
| Success bar | Replace Claude Code for a full week of real work |
| Build process | Cursor-only tokens for building Loom; burn-and-resume checkpoints; Holding when waiting on quota |
