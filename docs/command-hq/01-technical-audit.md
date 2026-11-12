# Command HQ: Phase 1 Technical Audit and Implementation Roadmap

**Prepared by:** Jarvis (Claude), Project Lead
**For:** Justin (Owner)
**Status:** Phase 1 complete. Nothing has been rebuilt, deleted, or deployed.
**Branch:** `claude/command-hq-factory-system-jknsmj`

---

## 0. Headline finding

**I found no Command HQ code in any repository this session can reach.** None of the
pieces the directive describes as existing are there:

| Directive assumes | What actually exists |
|---|---|
| An existing Command HQ | No. `Jlthetrader/autohedge` is a fork of *AutoHedge*, an open-source autonomous **trading** bot by The Swarm Corporation |
| An existing frontend / visual HQ | None: no HTML, JS, TS, or game engine anywhere |
| An existing Discord bot | None: "Discord" appears only as a badge link in the README |
| An existing database | None: no ORM, schema, migrations, SQLite, Postgres, or Supabase |
| Anthropic / Claude integration | None: `ANTHROPIC_API_KEY` is in `.env.example`, but no code reads it |
| Agents Jarvis / Shuri / BlackWidowImages | None: the five agents are trading roles (Director, Quant, Risk, Execution, Sentiment), all on OpenAI |
| Uploaded reference screenshot | Not attached to the directive message |

The other repo on your account, `HandsoffBundle/HandsoffBundle`, is **empty** (no
branches or commits).

**Implication:** Command HQ either lives somewhere I can't see (your own machine, a
Replit/Vercel/Glitch project, another GitHub account, or a no-code tool) or it hasn't been
built as code yet. Your answer changes the plan, so it's the first open question in §6.
Everything below assumes Command HQ is a **new build that sits next to** the AutoHedge
code and doesn't replace it.

---

## 1. Inventory of the existing repository

`Jlthetrader/autohedge`: 51 files, about 2,360 lines of Python.

```
autohedge/
  __init__.py        loads .env, exports AutoHedge
  __main__.py        python -m autohedge -> CLI
  cli.py             Rich-based interactive REPL (230 lines)
  main.py            AutoHedge class: wraps director_agent.run()
  workers.py         5 swarms.Agent instances (OpenAI gpt-4.1 / gpt-4o-mini)
  prompts.py         Trading system prompts
  env_loader.py      Walks up dirs to find .env (good, reusable)
  tools/
    exa_search_tool.py   Web search via Exa API (EXA_API_KEY)
    yahoo_api.py         yfinance quotes/financials
    polygon_api.py       Polygon market data
    jupiter_price.py     Solana token prices
    jupiter_search.py    Solana token search
    ultra_tools.py       *** Signs and submits real Solana swaps with SOLANA_PRIVATE_KEY ***
    tools_registry.py    Bundles trade-execution tools (currently not wired to any agent)
experimental/          BTC monitor, market maker sim (git-ignored dir, but files are committed)
logs/                  Two simulated trade CSVs from March 2025
example.py
.github/workflows/     18 workflows inherited from a template
```

### Technology in place

| Area | Current state | Reusable? |
|---|---|---|
| Language | Python ≥3.10 (container has 3.13; Node 22 also available) | **Yes**, backend stays Python |
| Agent framework | `swarms` (wraps LiteLLM; hides the raw provider calls) | **No** for Command HQ (see §3.3) |
| Web server | `fastapi` and `uvicorn` in `requirements.txt` but **unused** | **Yes**, already chosen |
| Validation | `pydantic` | **Yes** |
| Logging | `loguru` | **Yes** |
| HTTP | `httpx` | **Yes** |
| Env loading | `env_loader.py` (walk-up `.env` discovery, no override) | **Yes** |
| CLI | `rich` REPL | **Yes**, as a pattern for a `commandhq` admin CLI |
| Web search tool | `exa_search` | **Yes**, as a research tool for Shuri / BlackWidowImages |
| Trading tools | Jupiter/Solana/Polygon/Yahoo | **Keep, but quarantine**: no Command HQ agent gets trading tools |

### Code-health findings

1. **Live-funds risk.** `tools/ultra_tools.py::execute_trade` signs and submits real
   Solana transactions from `SOLANA_PRIVATE_KEY`. It isn't attached to any agent today,
   but `tools_registry.get_tools()` returns it next to harmless read tools, so one line
   could hand an LLM a live wallet. Command HQ will never import `autohedge.tools`.
2. **Env var drift.** `.env.example` and the README document `WALLET_PRIVATE_KEY`; the
   code reads `SOLANA_PRIVATE_KEY`. `EXA_API_KEY`, `POLYGON_API_KEY` and others aren't
   documented at all.
3. **Dependency drift.** `pyproject.toml` (Poetry) and `requirements.txt` disagree
   (`fastapi`/`uvicorn`/`requests` are only in the latter; `rich`/`yfinance`/`python-dotenv`
   are only in the former).
4. **No tests.** There's no `tests/` directory and no `Makefile`, and the composite action
   `.github/actions/poetry_setup` is missing. Most of the 18 CI workflows target `master`,
   call `make test`, or use the missing action, so they fail or never run. Several
   (`python-publish.yml`, `docs.yml`, `cos_integration.yml`) publish to the upstream
   project's PyPI and docs.
5. **Import-time side effects.** `workers.py` builds every agent at import time, and the
   CLI warns about a missing `OPENAI_API_KEY` on import.
6. **Upstream branding.** The package metadata, README, and links still point to The Swarm
   Corporation and Kye Gomez.

None of these block Command HQ. Items 1–4 will be fixed or isolated during Phase 4 and
Phase 9 without changing how AutoHedge behaves.

---

## 2. Gap analysis against the directive

| Directive section | Exists? | Work required |
|---|---|---|
| §1 Three agents | ❌ | New agent registry: exactly 3 identities, roles, permissions, provider bindings |
| §2–4 Character designs | ❌ | Original pixel-art sprites: Jarvis (black/gunmetal synthetic, blue chest core), Shuri (Black woman, purple/blue/silver, holographic), BlackWidowImages (black/deep red, spider emblem) |
| §5–6 Factory world | ❌ | Top-down tile map with 9 zones |
| §7 Conveyor system | ❌ | Event-driven belt routing bound to task state transitions |
| §8 Animation/interaction | ❌ | Sprite state machine (idle/walk/work/talk) + click inspector panel |
| §9 OpenAI + Anthropic | ⚠️ OpenAI via swarms only | Direct provider adapters: OpenAI Responses API, Anthropic Messages API with tool use |
| §10 Shared memory | ❌ | Memory store: categories, search, provenance, versions, ACL, review queue |
| §11 Discord | ❌ | New bot with slash commands + owner-only permission guard |
| §12 Business OS | ❌ | Projects/tasks data model; templates for product, marketing, and outreach work |
| §13 Dashboard | ❌ | HUD overlay fed by the same event stream |
| §14 Architecture | ⚠️ FastAPI chosen, unused | Backend service, DB, event bus, WebSocket |
| §15 Security/approvals | ❌ | Approval gates, audit log, secrets hygiene |
| §16 Perf/UX | ❌ | Responsive canvas, reconnect/replay, reduced-motion mode |

---

## 3. Recommended architecture

### 3.1 Shape

```
                ┌──────────────── Discord (slash commands) ───────────────┐
                │                                                          │
 Browser ──WS──►│  commandhq API (FastAPI)                                 │
 (factory UI)   │   ├─ REST: tasks, agents, memory, approvals, audit       │
                │   ├─ WebSocket: /ws/events  (ordered, replayable)        │
                │   ├─ Orchestrator (task state machine + loop guards)     │
                │   ├─ Agent runtime ─► ProviderAdapter                    │
                │   │      Jarvis  ─► AnthropicAdapter (Messages + tools)  │
                │   │      BWI     ─► OpenAIAdapter   (Responses API)      │
                │   │      Shuri   ─► MuseAdapter     (TBD, see §6)        │
                │   ├─ Memory service (approved facts, docs, history)      │
                │   └─ Policy/Approval gate + Audit log                    │
                └──────────────┬───────────────────────────────────────────┘
                               │
                         SQLite (dev) / Postgres (prod) via SQLAlchemy
```

### 3.2 Technology choices (reuse first, add only what's needed)

| Concern | Choice | Why |
|---|---|---|
| Backend | **Python + FastAPI** (already in requirements) | Reuses the existing stack; native WebSockets; async |
| DB | **SQLite for local dev, Postgres for deploy** behind SQLAlchemy 2 + Alembic | Costs nothing until you approve hosting; one switch to Postgres or Supabase later |
| Search in memory | SQLite FTS5 / Postgres full-text first; embeddings optional later | No paid vector DB needed for v1 |
| Event bus | In-process async pub/sub; every event is **persisted** to an `events` table before broadcast | Clients replay from `last_event_id` after a reconnect; no Redis needed for one server |
| Real-time | WebSocket with heartbeat + resume-from-cursor | Meets §16 recovery requirement |
| OpenAI | Official `openai` SDK, **Responses API** | Required by directive |
| Anthropic | Official `anthropic` SDK, **Messages API + tool use** | Required by directive |
| Discord | `discord.py` 2.x app commands, runs as a separate process calling the REST API | Bot crashes can't take down the core; bot holds no AI keys |
| Frontend | **Vite + TypeScript + Phaser 3** in `web/` | A mature 2D engine with tilemaps, sprite animation, pathfinding plugins, mobile scaling, and pixel-art rendering |
| Art | Original sprites authored in-repo (Aseprite-style PNG sheets, 16×16 tiles / 32×32 characters) | Original work; no copied assets |
| Tests | `pytest` + `pytest-asyncio` for backend; Playwright smoke test for the factory | Chromium is pre-installed here |

### 3.3 Why not build Command HQ on `swarms`

`swarms` routes everything through its own `Agent` loop. The directive needs things that
loop doesn't give cleanly: explicit per-call timeouts, hop counters, idempotency keys,
tool-call interception for approval gates, and provider-native APIs (Responses API, Claude
tool use). A thin adapter layer that we own is less code and easier to audit. AutoHedge
keeps using `swarms`, untouched.

### 3.4 Provider adapter contract

```python
class ProviderAdapter(Protocol):
    name: str                                  # "anthropic" | "openai" | "muse"
    async def generate(self, req: AgentRequest) -> AgentResult: ...
# AgentRequest: system, messages, tools, memory_context, timeout_s, max_output_tokens, idempotency_key
# AgentResult:  text, tool_calls, usage, provider_ids, finish_reason, error
```

Each agent is bound to an adapter by config, so swapping providers is a config change (§14).
Neither provider sees the other's conversation history; they share only **explicit
messages and approved memory** passed through the orchestrator (§9).

### 3.5 Task lifecycle (drives the conveyor belts)

```
INTAKE ─► ROUTING ─► ASSIGNED ─► IN_PROGRESS ─► IN_REVIEW ─┬─► AWAITING_APPROVAL ─► COMPLETED
                                     ▲                     │
                                     └──── REVISION ◄──────┘        (any) ─► FAILED / CANCELLED
```

* Every transition writes a row to `task_events` and emits a `task.moved` event with
  `{task_id, from_zone, to_zone, agent_id, event_id}`.
* The frontend has **no timer-driven belt traffic**. A crate appears on a belt only when
  a `task.moved` event arrives and is removed only on the next one (§7: "no fake activity").
  Belts idle visibly when nothing is moving.
* Agent sprite state is derived **only** from `agent.status` events:
  `IDLE · WORKING · THINKING · COMMUNICATING · WAITING_FOR_APPROVAL · COMPLETED · ERROR` (§13).

### 3.6 Loop prevention and reliability (§9)

| Guard | Default |
|---|---|
| IDs | ULIDs for `task_id`, `message_id`, `event_id`; every message carries `parent_message_id` |
| Max agent-to-agent hops per task | 8 |
| Max review/revision rounds | 2 (then escalate to Justin) |
| Per-call timeout | 90 s (configurable per agent) |
| Retries | 2, exponential backoff, only on transient errors, with the same idempotency key |
| Per-task token budget | Configurable; when exceeded the task moves to `AWAITING_APPROVAL` with a "budget" reason |
| Duplicate suppression | Hash of (sender, recipient, content, task) rejected inside a 5-minute window |
| Kill switch | `POST /admin/pause` and Discord `/status pause` freeze all agent calls |

### 3.7 Shared memory model (§10)

Table `memory_items`: `id, category, title, body, source_agent, source_ref (task/message),
status (proposed|approved|archived), visibility (all|jarvis|bwi|shuri|owner), created_at,
updated_at, version`, plus `memory_versions` for full history.

* Agents can only **propose** memory. Approved entries become the source of truth when
  Justin approves them (or when a category you designate allows auto-approval).
* Raw conversations aren't saved as memory; they live in `messages` with a retention window.
* Categories: `preferences, business, projects, agents, decisions, deliverables, documents, instructions`.

### 3.8 Approvals and security (§15)

* Tools are tagged `safe` or `requires_approval`. Spending, publishing, external sends,
  deletions, permission changes, financial commitments, and deploys are all `requires_approval`.
  A gated call creates an `approvals` row and parks the task at the Approval Center.
  Nothing executes until `/approve` (Discord) or the UI button is pressed **by the owner ID**.
* Secrets stay only in environment variables / a secrets manager. Outputs are scrubbed for
  key patterns before they're stored, sent to Discord, or rendered.
* Discord commands are accepted only from Justin's Discord user ID in a configured guild.
  The bot holds a scoped API token, not provider keys.
* Append-only `audit_log` for every command, approval, tool call, and memory change.
* **No Command HQ agent has trading tools.** AutoHedge stays a separate, opt-in program.

---

## 4. Proposed repository layout (additive only)

```
autohedge/                 # unchanged
commandhq/
  api/                     # FastAPI routers: tasks, agents, memory, approvals, ws
  core/                    # orchestrator, state machine, guards, events
  agents/                  # registry + personas: jarvis.py, blackwidow.py, shuri.py
  providers/               # anthropic_adapter.py, openai_adapter.py, muse_adapter.py, fake_adapter.py
  memory/                  # store, search, review
  security/                # approvals, policy, audit, redaction
  db/                      # models, migrations
  discord_bot/             # slash commands
web/                       # Vite + Phaser factory client
  src/scenes/ src/sprites/ src/net/ src/ui/
  public/assets/           # original sprite sheets + tilemap
tests/
docs/command-hq/
```

A `FakeAdapter` returns deterministic scripted replies, so the whole factory (belts,
movement, approvals, Discord flows) can run and be tested **without spending API credits**.

---

## 5. Implementation roadmap

Each phase ends with a progress report that separates **working and tested** from **stubbed / proposed**.

| Phase | Deliverable | Demonstrable outcome | Needs paid services? |
|---|---|---|---|
| **1. Audit** | This document | ✅ Done | No |
| **4. Shared infrastructure** *(pulled forward)* | `commandhq` package: DB models, task state machine, event log, WebSocket, memory service, approvals, audit log, FakeAdapter, pytest suite | Create a task via REST, watch it go through every state over WS with the fake agents | No |
| **2. Agent identity & art** | Agent registry (exactly 3), personas/system prompts, original sprite sheets (idle/walk/work/talk × 4 directions) | Character sheet page; registry rejects a 4th agent | No |
| **3. Factory environment** | Phaser tilemap with 9 zones, workstations, belt network, HUD shell, click inspector | Factory renders on desktop and phone, driven by live backend data | No |
| **8. Real-time animation** | Belts and sprites bound to `task.moved` / `agent.status`; pathfinding; reconnect/replay | Creating a task in the API makes a crate travel and an agent walk to its station | No |
| **5. AI integrations** | Anthropic + OpenAI adapters (+ Muse once specified), cost/token metering | Single-agent tasks answered by the real models | **Yes, API usage. Needs your OK + keys** |
| **6. Collaboration** | Delegate → strategy → execute → review → revise → approve workflow with guards | The §9 example runs end to end, with loop-guard tests | API usage |
| **7. Discord** | Bot with `/ask-jarvis /ask-blackwidow /ask-shuri /collaborate /assign /status /memory /review /approve` + notifications | Commands work in your server; non-owner is rejected | Free (bot token) |
| **9. Testing** | Unit, integration, permission, Playwright visual smoke tests; fix CI workflows | Green CI on this branch | No |
| **10. Deployment** | Dockerfile, env template, deploy + rollback runbook, DB backup/restore | Deploy plan for your approval; nothing goes live without it | **Hosting cost needs approval** |

I'm building the infrastructure (Phase 4) before the art and world (2–3) so that the world
has real events to show from its first day and no placeholder animation needs replacing
later. Phases 2–3 can run in parallel once the event contract is fixed.

---

## 6. Decisions needed from Justin

1. **Where is the existing Command HQ?** If it's in another repo, on your computer, or in a
   hosted builder, point me to it and I'll audit it before writing new code. If it was never
   code, confirm that Command HQ is a new build inside this repo.
2. **Reference screenshot.** It wasn't attached. Please re-upload it (or commit it to
   `docs/command-hq/reference/`) so the art direction matches.
3. **Which "Muse" powers Shuri?** I don't know of a single general-purpose "Muse"
   assistant API, so I need the product name, API docs, or the endpoint you use. Until
   then Shuri runs on the FakeAdapter in development. Tell me if you'd prefer her
   temporarily backed by Claude or OpenAI instead.
4. **Discord.** Is there an existing bot application and server? Send the server (guild)
   ID and your Discord user ID. Don't paste tokens into chat; they go into environment
   secrets.
5. **Hosting target** for later (Railway, Render, Fly.io, a VPS, your own PC). This doesn't
   block Phases 4/2/3/8.
6. **AutoHedge's future.** Should the trading code stay in this repo as a separate tool
   (recommended), or move out to its own repo? Command HQ won't use it either way.
7. **Monthly AI budget cap** for Phase 5+, so I can set per-task and daily token limits.

---

## 7. What has been done vs. proposed

| Item | Status |
|---|---|
| Full inspection of `Jlthetrader/autohedge` | ✅ Done |
| Check of other accessible repos (`HandsoffBundle`: empty) | ✅ Done |
| This audit + roadmap | ✅ Done |
| Any code changes, deletions, deploys, or paid-service activation | ❌ None made |
| Everything in §3–§5 | 📝 Proposed, awaiting your go-ahead and the answers in §6 |
