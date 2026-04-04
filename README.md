```
  ███╗   ███╗ ██╗ ███████╗ ███████╗ ██╗  ██████╗  ███╗   ██╗
  ████╗ ████║ ██║ ██╔════╝ ██╔════╝ ██║ ██╔═══██╗ ████╗  ██║
  ██╔████╔██║ ██║ ███████╗ ███████╗ ██║ ██║   ██║ ██╔██╗ ██║
  ██║╚██╔╝██║ ██║ ╚════██║ ╚════██║ ██║ ██║   ██║ ██║╚██╗██║
  ██║ ╚═╝ ██║ ██║ ███████║ ███████║ ██║ ╚██████╔╝ ██║ ╚████║
  ╚═╝     ╚═╝ ╚═╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═════╝  ╚═╝  ╚═══╝

   ██████╗  ██████╗  ███╗   ██╗ ████████╗ ██████╗   ██████╗  ██╗
  ██╔════╝ ██╔═══██╗ ████╗  ██║ ╚══██╔══╝ ██╔══██╗ ██╔═══██╗ ██║
  ██║      ██║   ██║ ██╔██╗ ██║    ██║    ██████╔╝ ██║   ██║ ██║
  ██║      ██║   ██║ ██║╚██╗██║    ██║    ██╔══██╗ ██║   ██║ ██║
  ╚██████╗ ╚██████╔╝ ██║ ╚████║    ██║    ██║  ██║ ╚██████╔╝ ███████╗
   ╚═════╝  ╚═════╝  ╚═╝  ╚═══╝   ╚═╝    ╚═╝  ╚═╝  ╚═════╝  ╚══════╝
```

**Adaptive AI orchestration for Claude Code.** Self-organizing drone swarms that scale from zero overhead on typos to full mission planning on epics.

---

## What is Mission Control?

Mission Control is a framework that turns Claude Code into a coordinated hive-mind. Instead of one agent doing everything, specialized **drones** handle different concerns — scouting your codebase, writing code, running tests, auditing security — communicating through a **signal bus** and learning across sessions with **layered memory**.

It adapts to the task. A typo fix runs solo with zero ceremony. A large feature spins up the full swarm with planning, checkpoints, and rollback.

### Key Features

| Feature | Description |
|---------|-------------|
| **Adaptive Ceremony** | Auto-detects scope (trivial → epic) and adjusts orchestration overhead |
| **Drone Swarm** | Specialized agents (scout, architect, coder, tester, security, reviewer, docs, debugger) |
| **Signal Bus** | Event-driven communication between drones with wildcard/prefix pattern matching |
| **Three-Layer Memory** | Short-term (mission), working (project), long-term (global) with auto-promotion |
| **Plan-Aware** | Adapts to your Claude plan (Pro/Max5x/Max20x/API) — model selection, token budgets, session splitting |
| **Execution Modes** | Autopilot, Copilot, Step-by-Step, Blitz, Solo |
| **Git Rollback** | Pre-mission snapshots with one-command undo |
| **Self-Healing** | Checkpoint & resume → escalation → consensus protocol |
| **Drone SDK** | Create, test, and share custom drones |
| **Terminal-Native** | Combat-themed tactical HUD — no browser required |

---

## Quick Start

### Install

```bash
npm install -g @mctl/cli
```

### Initialize a Project

```bash
cd your-project
mission init
```

This creates `.mctl/` with config, memory database, and checkpoint storage.

### Run a Mission

```bash
mission run "add user authentication with JWT"
```

Mission Control analyzes the task, selects drones, and executes with live terminal UI.

### As a Claude Code Plugin

Install the plugin to let Claude Code use Mission Control automatically:

```bash
# From the plugin directory
claude plugin install ./packages/plugin
```

Then just ask Claude to build something — the `mission-run` skill activates when it detects build/fix/refactor/deploy intent.

---

## CLI Commands

### Missions

```
mission init [dir]              Initialize Mission Control
mission run <description>       Start a new mission
  --no-ui                         Disable terminal HUD
  --drones <names>                Activate specific drones (comma-separated)
  --scope <scope>                 Override scope (trivial|small|medium|large|epic)
mission status                  Tactical overview
mission history [-n <count>]    Past mission log
mission replay <mission-id>     Signal feed replay
mission rollback <mission-id>   Roll back to pre-mission state
mission snapshots               List available rollback points
```

### Drones

```
mission drone list              Fleet roster
mission drone info <name>       Drone specs, triggers, and signals
mission drone create <name>     Scaffold a new custom drone
mission drone exec <name>       Run a tool drone (scout|tester|security)
mission drone add <path>        Install a community drone
mission drone remove <name>     Uninstall a drone
mission drone installed         List community drones
```

### Memory

```
mission memory show             Show all memory entries
  --layer <layer>                 Filter by layer (short|working|long)
mission memory promote <key> <from> <to>   Promote between layers
mission memory forget <key> <layer>        Delete an entry
```

### Configuration

```
mission config show             Show current config
mission config set-plan <plan>  Set Claude plan (pro|max5x|max20x|api)
mission analyze <description>   Analyze a task (JSON output)
  --mode <mode>                   Execution mode (autopilot|copilot|stepwise|blitz|solo)
mission budget                  Token usage summary
```

---

## Architecture

```
mission-control/
├── packages/
│   ├── core/       @mctl/core    Engine: signals, memory, drones, missions, recovery
│   ├── cli/        @mctl/cli     Terminal interface with tactical HUD
│   ├── sdk/        @mctl/sdk     Drone development kit
│   └── plugin/     Claude Code plugin with skills and hooks
├── turbo.json                    Turborepo build config
└── pnpm-workspace.yaml          Monorepo workspace
```

### Core Engine (`@mctl/core`)

- **SignalBus** — EventEmitter-based pub/sub with topic pattern matching (wildcard `*`, prefix `drone.*`)
- **MemoryManager** — Three-layer SQLite memory (short → working → long) with auto-promotion rules
- **DroneRegistry** — Register, enable/disable, priority-sort drones by manifest
- **DroneRunner** — Lifecycle management with state machine (idle → activated → running → done/failed)
- **ContextAnalyzer** — Intent classification + scope detection + drone selection
- **MissionPlanner** — Dependency-aware parallel grouping via topological sort
- **MissionRunner** — Full lifecycle: analyze → plan → checkpoint → execute → report
- **SessionAdvisor** — Plan-aware token budgets, model selection, session splitting
- **Recovery** — Checkpoint/resume, tiered escalation, consensus conflict resolution

### Built-in Drone Executors

| Drone | Type | What It Does |
|-------|------|-------------|
| **Scout** | Tool | Walks directory tree, detects languages, frameworks, test runners, CI |
| **Tester** | Tool | Detects package manager, runs test suite, reports pass/fail |
| **Security** | Tool | Runs dependency audit (pnpm/npm/yarn audit) |
| **Architect** | AI | Designs solution architecture |
| **Coder** | AI | Implements the plan |
| **Reviewer** | AI | Reviews code for issues |
| **Debugger** | AI | Diagnoses and fixes failures |
| **Docs** | AI | Writes documentation |

### Drone SDK (`@mctl/sdk`)

Build custom drones with YAML manifests:

```yaml
name: my-linter
description: Enforces project coding standards
version: 0.1.0
priority: 60

triggers:
  keywords: [lint, style, format, convention]
  scopes: [small, medium, large]

opinions:
  requires: [scout]
  blocks: []

signals:
  emits: [lint.complete, lint.violations]
  listens: [scout.complete]
```

```bash
# Scaffold
mission drone create my-linter

# Test with the SDK harness
import { DroneTestHarness } from '@mctl/sdk';
const harness = DroneTestHarness.fromDirectory('./my-linter');
const errors = harness.validate();
const shouldFire = harness.shouldActivate(['lint', 'fix'], 'medium');

# Install
mission drone add ./my-linter
```

---

## Execution Modes

| Mode | Behavior | Best For |
|------|----------|----------|
| **Solo** | No subagents, inline execution | Trivial/small tasks |
| **Copilot** | Pauses after design + after coding for approval | Default — balanced control |
| **Autopilot** | Runs all drones, no stops | Trusted routine tasks |
| **Step-by-Step** | Pauses after every drone | Learning / auditing |
| **Blitz** | Parallel independent drones | Speed on large tasks |

The analyzer auto-selects based on scope. Override with `--mode`:

```bash
mission analyze "refactor auth module" --mode blitz
```

---

## Plan Awareness

Mission Control adapts to your Claude subscription:

```bash
mission config set-plan max5x
```

| Plan | Context | Token Budget | Models |
|------|---------|-------------|--------|
| **Pro** | 200K | Conservative | Haiku for small tasks |
| **Max 5x** | 1M | Moderate | Sonnet default, Opus for design |
| **Max 20x** | 1M | Generous | Opus for everything |
| **API** | 1M | Unlimited | Full model selection |

The `SessionAdvisor` automatically splits large missions into sessions that fit your plan's budget and suggests which model to use for each drone.

---

## Development

```bash
# Prerequisites
node >= 20
pnpm >= 9

# Setup
pnpm install
pnpm build

# Test
pnpm test

# Run CLI locally
node packages/cli/dist/index.js init
node packages/cli/dist/index.js run "test task"
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@mctl/core` | Core engine — signals, memory, drones, missions, recovery |
| `@mctl/cli` | CLI interface — tactical terminal HUD |
| `@mctl/sdk` | Drone SDK — build, test, and share custom drones |
| `@mctl/claude-code-plugin` | Claude Code plugin with skills and hooks |

---

## License

MIT
