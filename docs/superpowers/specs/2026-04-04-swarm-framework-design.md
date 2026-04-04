# Swarm Framework — Design Specification

> A Claude Code orchestration framework built on a hive-mind metaphor. Adaptive, visual, extensible.
> Name TBD — "swarm" used as working title throughout.

## 1. Vision & Positioning

### Problem
Existing Claude Code frameworks fall into two camps: **methodological** (GSD, Superpowers) that enforce rigid discipline regardless of context, and **orchestration** (Claude Flow, Ruflo) that coordinate agents but lack intelligence. None offer real-time visibility into what's happening, and none have a composable ecosystem.

### Solution
A hybrid CLI + plugin framework where a swarm of specialized drones self-organize around a goal. The framework adapts its behavior based on context — zero ceremony for quick fixes, full planning for large features. A live browser dashboard shows the swarm working in real-time. A marketplace lets anyone publish and install custom drones.

### Headline
**"See your swarm work. Extend it with anything."**

### Target Users (progressive complexity)
1. **Solo developers** — install and go, zero config, immediate value
2. **Teams** — shared drone configs, project-level memory, consistent workflows
3. **Ecosystem developers** — publish drones, build integrations, extend the platform

### Distribution
- **CLI engine** (`@swarm/cli`) — the brain, installed globally via npm
- **Claude Code plugin** (`@swarm/claude-code-plugin`) — thin bridge, installed via Claude Code marketplace
- Future bridges for Cursor, Windsurf, etc.

---

## 2. Core Metaphor: Hive Mind

The framework operates as a self-organizing swarm:

- **Drones** — specialized agents, each with its own personality and opinions
- **Signal bus** — typed events for real-time drone-to-drone communication
- **Layered memory** — short-term (mission), working (project), long-term (global)
- **Missions** — complete units of work from request to completion
- **Context Analyzer** — the adaptive brain that reads the room and activates the right drones

The user is the queen bee — the swarm proposes, the user decides.

---

## 3. High-Level Architecture

Two packages, one system:

```
┌──────────────────────────────────────────────────────┐
│                    CLI Engine                          │
│  (Node.js standalone — the brain)                     │
│                                                       │
│  Mission Runner | Signal Bus | Layered Memory         │
│  Drone Registry | Context Analyzer | Checkpoint Mgr   │
│  Dashboard Server (HTTP + WebSocket)                  │
└─────────────────────┬────────────────────────────────┘
                      │ IPC: Unix socket (or named pipe on Windows)
                      │ Protocol: JSON-RPC over the socket
┌─────────────────────▼────────────────────────────────┐
│               Claude Code Plugin                      │
│  (thin bridge — hooks + skills + context relay)       │
└──────────────────────────────────────────────────────┘
```

**Key principle:** The CLI engine does all thinking. The plugin is the nervous system connecting Claude Code to the engine. This means:
- The engine is testable independently
- Future IDE integrations only need a new thin bridge
- The dashboard works regardless of which IDE/tool is connected

### Tech Stack
- **Language:** TypeScript throughout (strict mode)
- **Monorepo:** pnpm workspaces + Turborepo
- **CLI:** Node.js, Commander.js
- **Signal bus:** EventEmitter in-process, SQLite for persistence
- **Dashboard:** Local HTTP server + WebSocket, React + Vite frontend
- **Plugin:** Claude Code hooks API + markdown skill files
- **Storage:** SQLite for memory layers and signal history, JSON for config/checkpoints
- **Testing:** Vitest
- **Code quality:** ESLint + Prettier

---

## 4. Drone System

### 4.1 Drone Anatomy

Each drone has a manifest (`drone.yaml` or `drone.ts`):

```yaml
name: architect
description: Designs system architecture before implementation

triggers:
  taskSize: large
  keywords: [build, create, design, "new feature"]
  fileCount: ">5"

opinions:
  requires: ["spec before code"]
  suggests: ["consider edge cases"]
  blocks: ["implementation without design approval"]

signals:
  emits: [design.proposed, design.approved]
  listens: [mission.started, user.override]

priority: 10
escalation: user
```

**Triggers** define when the Context Analyzer should activate this drone. **Opinions** define what the drone insists on, suggests, or blocks. **Signals** declare the communication contract.

### 4.2 Built-in Drones (v1)

| Drone | Role | Activates when |
|-------|------|---------------|
| **scout** | Explores codebase, maps context, reports to other drones | Always runs first |
| **architect** | Demands design before code on large features | Large features, new systems |
| **coder** | Implements code following patterns from scout's report | Implementation tasks |
| **tester** | Insists on test coverage for new/changed code | Code changes detected |
| **debugger** | Systematic root-cause analysis before fixes | Bug reports, errors |
| **security** | Flags vulnerabilities, blocks insecure patterns | Auth, payments, user data |
| **reviewer** | Final quality check before mission completion | Before mission ends |
| **docs** | Suggests documentation for public APIs, complex logic | Public APIs, complex logic |

### 4.3 Drone Lifecycle

```
IDLE → ACTIVATED (by Context Analyzer)
     → RUNNING (executing work)
     → WAITING (blocked on signal or user input)
     → DONE (emits completion signal)
     → FAILED → escalation chain
```

### 4.4 Custom Drones

Anyone can publish a drone as an npm package:

```
@swarm/drone-rails/
├── drone.yaml          # manifest
├── skills/             # markdown skill files injected into Claude
├── hooks/              # Claude Code hooks
├── templates/          # scaffolding templates
├── tests/              # drone test suite
└── README.md
```

Install: `swarm drone add @community/django-drone`

---

## 5. Signal Bus

### 5.1 Signal Structure

```typescript
interface Signal {
  type: "finding" | "decision" | "question" | "warning" | "progress";
  source: string;          // which drone emitted
  topic: string;           // namespaced event (e.g., "vuln.found")
  severity: "info" | "warning" | "critical";
  payload: Record<string, unknown>;
  timestamp: number;
  missionId: string;
}
```

### 5.2 Rules
- Drones declare emitted and listened signals in their manifest
- Bus is in-process (EventEmitter) during a mission, persisted to SQLite after
- Dashboard subscribes to all signals via WebSocket for the live view
- Signals form the audit trail — full replay of any past mission

---

## 6. Layered Memory

### 6.1 Three Tiers

| Layer | Scope | Lifetime | Storage |
|-------|-------|----------|---------|
| **Short-term** | Current mission | Dies when mission ends | In-memory |
| **Working** | Per project | Persists across missions | `.swarm/memory.db` (SQLite) |
| **Long-term** | Global | Persists forever | `~/.swarm/memory.db` (SQLite) |

### 6.2 Examples
- **Short-term:** "User wants React, not Vue for this task"
- **Working:** "This project uses Prisma ORM, Jest for tests, pnpm"
- **Long-term:** "User prefers minimal comments, hates verbose logs, always wants tests"

### 6.3 Memory Flow

**Mission start:**
1. Long-term loaded (user prefs, global patterns)
2. Working memory loaded (project-specific knowledge)
3. Short-term created fresh

**During mission:**
- Drones read all three layers
- Drones write to short-term freely
- Promotion to higher layers happens automatically or manually

**Mission end:**
- Short-term scanned for promotable knowledge
- Repeated project patterns auto-promote to working memory
- User corrections/preferences auto-promote to long-term
- Short-term discarded

### 6.4 Memory + Context Analyzer Integration
- Working memory says "Django project" → activate python drone, skip react drone
- Long-term says "user always wants tests" → lower tester drone activation threshold
- Past overrides tracked: "user always skips docs drone" → don't activate docs drone

---

## 7. Mission Lifecycle

### 7.1 Phases

```
USER REQUEST
     ↓
  ANALYZE — Context Analyzer builds situation profile
     ↓
  PLAN — Activated drones negotiate mission plan, ordering, parallelism
     ↓
  CHECKPOINT — Snapshot plan + context + memory state
     ↓
  EXECUTE — Drones run in dependency order (parallel when independent)
     ↓
  CHECKPOINT — Snapshot results + signals + memory changes
     ↓
  REPORT — Summary to user, memory promotions, dashboard update
```

### 7.2 Checkpoints

Automatic checkpoints at:
- After planning (before code is touched)
- After each drone completes
- Before destructive operations (file deletes, git operations)
- On user request: `swarm checkpoint`

Checkpoints capture: mission state, signal history, memory snapshots, file state references.

### 7.3 Failure Recovery — Three Tiers

**Tier 1: Checkpoint & Resume (automatic)**
- Drone hits context limit or transient error
- Roll back to last checkpoint, retry with fresh context
- Max 2 retries before escalating to Tier 2

**Tier 2: Escalation Chain (automatic)**
- Supervisor logic decomposes the task into smaller pieces
- Can reassign to different drone, inject more context, or skip and continue
- If still stuck, escalates to Tier 3

**Tier 3: Consensus Protocol (involves user)**
- When drones disagree or system is genuinely stuck
- Dashboard presents conflict with each drone's argument and a recommendation
- User makes the call
- Decision stored in long-term memory for future reference

---

## 8. Context Analyzer

### 8.1 Situation Profile

```typescript
interface SituationProfile {
  intent: "fix" | "build" | "refactor" | "explore" | "debug" | "deploy";
  scope: "trivial" | "small" | "medium" | "large" | "epic";
  
  project: {
    languages: string[];
    frameworks: string[];
    hasTests: boolean;
    testRunner: string | null;
    hasCI: boolean;
    packageManager: string;
    repoSize: "small" | "medium" | "large";
  };
  
  userPrefs: {
    wantsTDD: boolean;
    verbosity: "minimal" | "normal" | "detailed";
    riskTolerance: "cautious" | "balanced" | "yolo";
    pastOverrides: Override[];
  };
  
  recommendedDrones: DroneActivation[];
  estimatedTokens: number;
  estimatedCost: number;
}
```

### 8.2 Adaptive Drone Activation

| Scope | Ceremony level | Drones activated |
|-------|---------------|-----------------|
| **trivial** | Near-zero | coder only |
| **small** | Light touch | scout → coder → tester (if tests exist) |
| **medium** | Standard flow | scout → architect → coder → tester → reviewer |
| **large** | Full ceremony | scout → architect → security → coder → tester → docs → reviewer |
| **epic** | Auto-decompose | Splits into sub-missions, each with own drone set |

### 8.3 Cross-referencing
The analyzer doesn't just parse the request. It cross-references:
- Working memory: "last time user said 'small fix' it turned into a 3-day refactor"
- Long-term memory: "user always wants tests, even for 'quick fixes'"
- Project state: "this file has no tests but project has 90% coverage — tester should activate"

### 8.4 User Overrides

```bash
swarm run "fix login" --drones=coder,tester    # force specific drones
swarm run "fix login" --no-analyze              # skip analyzer entirely
swarm run "fix login" --scope=trivial           # override scope detection
```

---

## 9. Dashboard

### 9.1 Architecture
- Local HTTP server started by CLI during missions (default: `localhost:3000`)
- React + Vite frontend, WebSocket connection to CLI engine
- Auto-opens browser on mission start (configurable)

### 9.2 Features

**Real-time mission view:**
- Drone status panel (idle/running/waiting/done/failed for each)
- Live signal feed (filterable, searchable)
- Progress bar with phase, ETA, token count, cost estimate

**Interactive controls:**
- Pause/resume missions
- Restore any checkpoint
- Resolve drone conflicts (accept recommendation, override, custom decision)
- Message individual drones or the entire swarm

**Memory inspector:**
- Browse all three memory layers
- Manually promote/demote entries
- Search memory

**Mission history:**
- Past missions with outcomes
- Full signal replay for any mission
- Cost/token analytics over time

---

## 10. CLI Interface

```bash
# Missions
swarm run "<task description>"        # start a mission (opens dashboard)
swarm run "<task>" --no-dashboard     # start without dashboard
swarm status                          # current mission state
swarm pause / swarm resume
swarm checkpoint                      # force a snapshot
swarm history                         # past missions
swarm replay <mission-id>             # replay signal history

# Drones
swarm drone list                      # show installed drones
swarm drone add <package>             # install from npm
swarm drone remove <name>
swarm drone create <name>             # scaffold a custom drone
swarm drone enable/disable <name>
swarm drone publish                   # validate + publish to npm

# Memory
swarm memory show                     # browse all layers
swarm memory show --layer=working     # filter by layer
swarm memory promote <id>             # short-term → working
swarm memory forget <id>
swarm memory export / import          # backup/sharing

# Marketplace
swarm marketplace search "<query>"
swarm marketplace trending
swarm marketplace list --category=<cat>

# Configuration
swarm init                            # initialize swarm in a project
swarm config show                     # show current config
swarm config share                    # export project config for team
```

### `swarm init` creates:
```
.swarm/
├── config.yaml          # project-level settings (enabled drones, overrides)
├── memory.db            # working memory (SQLite, gitignored)
└── checkpoints/         # mission snapshots (gitignored)
```
And adds `.swarm/memory.db` and `.swarm/checkpoints/` to `.gitignore`. The `config.yaml` is meant to be committed — it's the team-shareable project config.

---

## 11. Marketplace & Drone SDK

### 11.1 Marketplace Strategy
- **npm-based** — drones are npm packages with `swarm-drone` keyword, no custom registry
- **Discovery** — `swarm marketplace` commands are a thin layer over npm search with filtering
- **Quality signals** — install count (npm), compatibility badge, community ratings via a lightweight GitHub-hosted JSON index

### 11.2 Drone SDK

Scaffold: `swarm drone create my-drone`

```
my-drone/
├── drone.yaml          # pre-filled manifest template
├── skills/
│   └── main.md         # starter skill file
├── tests/
│   └── drone.test.ts   # test harness with mock signal bus
├── package.json        # pre-configured with swarm-drone keyword
└── README.md
```

### 11.3 Testing Framework

```typescript
import { DroneTestHarness } from '@swarm/sdk';

const harness = new DroneTestHarness('my-drone');

test('activates on large Python projects', async () => {
  harness.setContext({ language: 'python', fileCount: 50, taskSize: 'large' });
  expect(harness.shouldActivate()).toBe(true);
});

test('emits design.proposed signal', async () => {
  const signals = await harness.run('design a REST API');
  expect(signals).toContainSignal('design.proposed');
});

test('respects user override', async () => {
  harness.emitSignal({ type: 'user.override', topic: 'skip-design' });
  const result = await harness.run('just code it');
  expect(result.skipped).toBe(true);
});
```

SDK provides: mock signal bus, mock memory layers, simulated context analyzer — everything needed to test drones without real Claude sessions.

---

## 12. Monorepo Structure

```
<project-root>/
├── packages/
│   ├── core/              # @swarm/core — engine, shared by CLI and plugin
│   │   └── src/
│   │       ├── mission/   # Mission runner, lifecycle, checkpoints
│   │       ├── drones/    # Drone loader, registry, lifecycle
│   │       ├── signals/   # Signal bus (EventEmitter + persistence)
│   │       ├── memory/    # Three-layer memory manager
│   │       ├── analyzer/  # Context Analyzer
│   │       └── recovery/  # Checkpoint, escalation, consensus
│   │
│   ├── cli/               # @swarm/cli — the `swarm` binary
│   │   └── src/
│   │       ├── commands/  # All CLI commands
│   │       └── dashboard/ # Local HTTP + WebSocket server
│   │
│   ├── dashboard/         # @swarm/dashboard — React + Vite browser UI
│   │   └── src/
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── plugin/            # @swarm/claude-code-plugin — thin bridge
│   │   └── src/
│   │       ├── hooks/
│   │       ├── skills/
│   │       └── bridge.ts
│   │
│   ├── sdk/               # @swarm/sdk — drone development SDK
│   │   └── src/
│   │       ├── harness.ts
│   │       ├── mocks.ts
│   │       └── scaffold.ts
│   │
│   └── drones/            # Built-in drones
│       ├── scout/
│       ├── architect/
│       ├── coder/
│       ├── tester/
│       ├── debugger/
│       ├── security/
│       ├── reviewer/
│       └── docs/
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── turbo.json
```

### Dependency Flow (no circular dependencies)

```
sdk ──► core ◄── cli
               ◄── plugin
               ◄── drones
dashboard (standalone — connects via WebSocket only)
```

Core depends on nothing. Everything depends on core. Dashboard is fully decoupled.

---

## 13. Future Considerations (Post-v1)

These are explicitly **out of scope for v1** but the architecture supports them:

- **Cloud sync** — team-shared memory, drone configs, mission history
- **Hosted marketplace** — web UI with reviews, ratings, search
- **Multi-IDE bridges** — Cursor, Windsurf, VS Code extension
- **Remote dashboard** — accessible from any device, not just localhost
- **Drone chaining** — declarative pipelines where one drone's output feeds another
- **Cost budgets** — set token/cost limits per mission, drone, or time period
