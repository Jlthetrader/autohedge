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

---

## 8. Addendum: answers received (2026-11-12)

| Question | Answer | Effect on the plan |
|---|---|---|
| Where is Command HQ? | A folder on Justin's laptop (not on GitHub) | **The audit of the real code is blocked until it's reachable.** See "How to give Jarvis access" below |
| Reference screenshot | Received: `reference/factory-style-reference.png` | Style reference only: a pixel-art station seen from above at a 3/4 angle, cool steel floors, cyan/green accent lighting, a red central core, small walking characters. The image is a third-party game screenshot, so **all of our art will be original**. We'll match the mood, not copy assets or layout |
| Trading | **No trading code** | Command HQ gets no trading tools. Shuri's current "chart check" (MNQ candles via `HQCandleExport`) gets **retired**, not migrated. AutoHedge code isn't imported anywhere |
| AI budget | **$100 / month** | Hard caps: ~$3.25/day, $1.00/task by default, warning at 80%, automatic pause at 100%. Metered per provider from real usage numbers |
| Hosting | **On his phone as an app, eventually** | See "Phone app plan" below |

### What the screenshots show about the existing system

* **The Discord bot "JarvisHQ" already exists** (app created Nov 1, 2026) and runs **on the laptop**.
* It uses **text commands** (`help`), not slash commands yet.
* It posted "Command HQ is online on your laptop" **6 times on Nov 11** (10:56, 11:17, 11:28,
  13:54, 14:22, 15:00). That means the process restarts often (crashes, sleep/wake, or manual
  restarts) and announces every boot. To fix: find the cause, and announce only when it's
  been offline for more than N minutes.
* **Shuri already exists as a scheduled job** ("chart check 10:30 CT") that reads a
  `MNQ_1d.csv` export and expects 4H/1H screenshots. This is the trading duty the directive
  says to remove.
* So the laptop code has at least: a Discord bot, a scheduler, a Shuri persona, and file-based
  data input. Exactly how these work will be confirmed once the folder is readable.

### Phone app plan

An iPhone can't keep a server running in the background, so "on my phone" means **the app
runs on the phone and the brain runs somewhere always-on**:

1. **Now (free):** The backend runs on the laptop. The factory is a **Progressive Web App**:
   open the URL in Safari, choose "Add to Home Screen", and it opens full screen like an app.
   The phone reaches the laptop through a free private tunnel (Tailscale, or a Cloudflare
   Tunnel). Only Justin's devices can connect.
2. **Later (needs approval, ~$5–7/mo):** Move the backend to a small cloud host so it works
   when the laptop is off.
3. **Optional (needs approval, $99/yr Apple Developer):** Wrap the same web app with Capacitor
   for a real App Store/TestFlight app with push notifications.

The factory UI is therefore designed **mobile-first** (portrait layout, touch to inspect agents,
pinch/drag the map).

### How to give Jarvis access to the laptop folder

Pick one:

* **A. Push it to GitHub (simplest).** Put the folder in a private repo (the empty
  `HandsoffBundle` repo works, or a new `command-hq` repo). **Before pushing, make sure `.env`
  and any token or key files are in `.gitignore`.** The Discord bot token must never be committed.
* **B. Run Claude Code on the laptop.** Open the folder in the Claude desktop app, or run
  `claude remote-control` in that folder, and continue the work from there.

---

## 9. Audit of the real Command HQ (laptop folder, partial)

**Files reviewed:** `app.py`, `README.md`, `.env.example`, `discord_bot.py`, `start.bat`.
**Not yet seen:** `agents/`, `services/`, `ui/` (including `hq_component/`), `launcher/`, `tests/`,
`requirements.txt`. Statements about those come from the README and are marked *(per README)*.

### 9.1 What Command HQ is today

| Layer | Implementation |
|---|---|
| Platform | Windows laptop; `start.bat` creates a venv and runs `launcher/hq_launcher.py`, which starts **Streamlit** (`app.py`, :8501) **and** `discord_bot.py` |
| Language | Python 3.10+ |
| Storage | JSON files in `data/` (`tasks.json`, `runs.json`, approvals, settings, KBs) through `services.storage.Store` with file locking *(per README)* |
| AI | **Anthropic only** (`ANTHROPIC_API_KEY`, `claude-sonnet-5-5`, 1,500 max tokens). No OpenAI integration |
| Orchestration | `agents/commander.py`: JARVIS plans, then runs specialists **sequentially in-process**, then combines. Background "missions" are recorded in `runs.json`; interrupted runs are marked failed on the next start |
| Agents (current) | **5**: JARVIS, IRON MAN, SHURI (trading), MILES MORALES, ULTRON (ChatLLM dispatch via a Google Drive "HQ Bridge"). The README still says "exactly four" in the header |
| Memory | Obsidian vault (`Command HQ/` folder, `Shared Memory.md`, per-agent notes) plus keyword search *(per README)* |
| Visual HQ | `ui/hq_component/`: canvas pixel-art HQ, original sprites (4 directions, idle/walk/work), **A\* pathfinding**, movement driven by real tasks, clickable agents, pan/zoom, reduced-motion support *(per README)* |
| Discord | `discord_bot.py`: **text** commands, allowlisted user IDs, 8 cmd/min rate limit, command log, PID single-instance lock, heartbeat file, approvals via `approve <id>`/`deny <id>`, 6 AM briefing, result watcher |
| Muse link | `services/muse_link.py`: **Shuri-on-Muse runs as her own Discord bot.** HQ accepts read-only commands and notes from IDs in `DISCORD_PEER_BOT_IDS`; never approvals or trades |
| Approvals | `services/approvals.py`: risk tiers; publishing/deploy/external/purchase/delete/security wait for the owner; approval is bound to exact task text; trades refused outright |
| Notifications | ntfy / Telegram / Pushover |
| Tests | `tests/test_v3.py` (logic, approvals, Discord, end-to-end with fake AI), `tests/ui_smoke.py`, `tests/test_crt_watch.py` |
| Business modules | Cleaning Co (website lead import → jobs, Gmail drafts), Revenue & P&L, Projects & Tasks, Alert History |

**Overall:** this is a far more mature base than the directive assumed. Many of its "build"
items already exist in some form: honest event-driven movement, approvals, an owner-only
Discord bot, background missions, a fake-AI test harness, and a memory store.

### 9.2 Answers this resolves

* **"Muse" is not an API.** Shuri lives on Muse and talks to Command HQ through **Muse's own
  Discord bot**. Her provider adapter is therefore a **Discord peer channel**, not an HTTP SDK:
  JARVIS posts a structured assignment, Muse-Shuri replies, and the HQ parses the reply by task ID.
  Because her replies are asynchronous, her tasks get a longer timeout and a "waiting on Muse" status.
* **Why "online" was posted 6 times:** in `discord_bot.py` `on_ready()` (line 211) sends the
  "🟢 online" DM **before** the `loops_started` guard. Discord fires `on_ready` again after every
  gateway reconnect (Wi-Fi blip, laptop sleep/wake), so each reconnect re-announces. The loops are
  guarded but the DM is not. **Fix:** send the DM only on the first `on_ready` of a process, or
  only if the last heartbeat is older than ~10 minutes. This is a one-line, low-risk change.

### 9.3 Mapping to the directive

| Directive item | Existing asset | Action |
|---|---|---|
| Exactly 3 agents | 5 agents in `agents/registry.py` | **Reduce to 3.** Retire IRON MAN, MILES MORALES, ULTRON (data kept and archived, not deleted). Add **BLACKWIDOWIMAGES** (OpenAI). Re-role SHURI to personal assistant on Muse |
| Jarvis = Claude, leads, builds | `commander.py` (Claude) | **Keep and extend**: Jarvis takes over Iron Man's build/automation duties |
| BlackWidowImages = ChatGPT, strategy + creative + reviews | Nothing (Ultron's creative dispatch is closest) | **New** OpenAI Responses API adapter; Ultron's build-brief/outbox flow is folded into her creative studio |
| Shuri = Muse, personal ops, no trading | Shuri = trading analyst | **Re-role** to schedule/reminders/briefings/follow-ups. Move the 6 AM briefing to her. Extend `muse_link` from read-only to "receive assignment → return result" (still no approvals) |
| No trading | Trading Desk, ICC, chart_watch, **crt_watch (polls every 5 s)**, SMT, market data, news monitor, `hawkeye/thor/captain/hulk`, trading P&L | **Remove from the running system**: unregister the pages, bot loops and commands. Code moves to `archive/trading/` on a branch so nothing is lost; data stays in `data/` |
| Factory world + conveyors | `hq_component` canvas, A\*, honest movement, rooms | **Reuse the engine; redesign the map** into the 9 factory zones. Add conveyor belts bound to task-status changes. Replace Iron Man/Miles sprites with BlackWidowImages; redesign Jarvis as a walking synthetic body (today he's a hologram) and Shuri per the directive |
| Task lifecycle | Received → Reviewing → Awaiting approval → Running → Completed/Failed/Cancelled | **Extend**: add Routing, In review, Revision states, and record every transition as an event (needed for belts + replay) |
| Two-way OpenAI ↔ Claude | None | **New**: orchestrator round-trips with hop/revision/time/budget guards (§3.6) |
| Shared memory | Obsidian vault | **Keep Obsidian as the human-editable store**; add an index with categories, provenance, status (proposed/approved), and per-agent visibility on top |
| Discord commands | Text commands, allowlist, approvals | **Keep text commands; add slash commands** `/ask-jarvis /ask-blackwidow /ask-shuri /collaborate /assign /status /memory /review /approve` that call the same `services.remote` handlers |
| Dashboard/status | Sidebar team status, Task History, alerts | **Reuse**, then move into the factory HUD |
| Approvals/security/audit | `approvals.py`, command log, allowlist, keys in `.env` | **Keep as is**; add per-agent tool permissions and a $100/month spend meter |
| Phone app | Streamlit on localhost:8501 | See 9.4 |

### 9.4 Architecture decision: Streamlit stays, a real-time API is added beside it

Streamlit re-runs the whole script on each interaction and has no server-push channel, so on its
own it can't drive conveyor belts from live events or work well as an installable phone app.
The plan, which adds pieces and removes nothing:

1. Keep `agents/` + `services/` as the **single backend core**; the Streamlit pages keep working.
2. Add a small **FastAPI service** (`api/`) in the same folder, using the same `Store`,
   `approvals`, `missions`, and `remote` modules. It exposes REST + **`/ws/events`** (an event
   log appended on every task, agent, and approval change, so the phone can resume after a disconnect).
3. Lift `ui/hq_component/` (already plain HTML/JS, no build step) into a standalone **PWA**
   served by FastAPI. Streamlit keeps embedding it, and the phone opens the same page full screen.
4. Phone access: free private tunnel (Tailscale) to the laptop; cloud hosting later only with approval.
5. Storage: JSON stays for now. Moving to SQLite happens only if the event volume needs it,
   as a separate approved step with a migration and a backup.

### 9.5 Other findings

* `.env.example` is missing `DISCORD_BOT_TOKEN`, `DISCORD_ALLOWED_USER_IDS`, `DISCORD_CHANNEL_ID`,
  `OBSIDIAN_VAULT_PATH`, and (new) `OPENAI_API_KEY`, `OPENAI_MODEL`.
* The bot's `background()` loop calls `build_context()` every 30 s for cleaning leads. That's fine
  functionally, but it reloads everything each time; this will be cached when the trading loops are removed.
* `watch()` polls for results for up to 20 min per task; the event log will replace this polling.
* Character names: Iron Man, Miles Morales, and Ultron are well-known third-party characters; they
  go away with the reduction to 3. Jarvis, Shuri, and BlackWidowImages keep their names at Justin's
  direction, with **fully original visual designs** (no film or comic likenesses).

### 9.6 Revised roadmap

| Step | Work | Touches paid APIs? |
|---|---|---|
| 0 | Get the full folder into a private GitHub repo (with `.env` and `data/` git-ignored) so the rest can be audited and changes are versioned with rollback | No |
| 1 | Fix the duplicate "online" DM; complete `.env.example` | No |
| 2 | Retire trading: unregister pages/loops/commands, archive the code, keep the data | No |
| 3 | Agent registry → exactly 3; archive Iron Man/Miles/Ultron; migrate their open tasks to Jarvis; tests updated | No |
| 4 | Event log + task states + FastAPI `/ws/events` (fake AI in tests) | No |
| 5 | Factory map redesign + conveyor belts + new sprites, driven only by events; PWA shell | No |
| 6 | OpenAI adapter for BlackWidowImages; spend meter with the $100/month cap | **Yes** (needs `OPENAI_API_KEY` in `.env`) |
| 7 | Jarvis ↔ BlackWidowImages collaboration/review loop with guards | Yes |
| 8 | Shuri re-role + Muse link upgraded to two-way assignments | Muse side only |
| 9 | Discord slash commands | No |
| 10 | Phone: Tailscale + "Add to Home Screen"; deployment/rollback runbook | No (cloud host later needs approval) |
