---
name: drone-create
description: Use when the user wants to create a custom drone for Mission Control, build a new drone, or extend the framework with new capabilities
---

# Create a Custom Drone

Build a new drone for Mission Control. Scaffolds the files, then customizes them based on the user's requirements.

## How to Run Commands

```bash
MISSION="bash ${CLAUDE_PLUGIN_ROOT}/bin/mission"
```

**NEVER:** `npx mission`, `node .../bin/mission`, `mission` directly.

## Step 1: Understand What the User Wants

Ask if not clear:
- What should this drone do?
- Is it a **tool drone** (runs a CLI command, no AI needed) or an **AI drone** (needs LLM reasoning)?
- What keywords should trigger it?
- What priority? (higher = runs earlier. scout=100, coder=50, reviewer=10)

## Step 2: Scaffold

```bash
$MISSION drone create <name>
```

This creates:
```
<name>/
├── drone.yaml          # Manifest — triggers, signals, priority
├── skills/main.md      # AI drone behavior instructions
├── tests/drone.test.ts # Test suite
├── package.json        # npm package config
└── README.md           # Documentation
```

## Step 3: Customize the Manifest

Edit `<name>/drone.yaml` based on user's requirements:

```yaml
name: <name>
description: <what it does — one line>

triggers:
  keywords:
    - <word that activates this drone>
    - <another trigger word>
  # taskSize: large        # uncomment to only activate on large tasks

opinions:
  requires: []              # things this drone insists on
  suggests: []              # things it recommends
  blocks: []                # things it prevents

signals:
  emits:
    - <name>.done
  listens:
    - scout.done            # wait for scout to finish first

priority: 50                # 0-100, higher = runs earlier
escalation: user
```

## Step 4: Write the Skill (AI drones only)

Edit `<name>/skills/main.md` with specific instructions for what the drone should do. This is what Claude reads when acting as this drone.

Good skills include:
- Clear step-by-step process
- What files to read for context
- What output to produce
- Where to write results (`.mctl/mission/<name>.md`)

## Step 5: Write Tests

Edit `<name>/tests/drone.test.ts` to verify:
- Manifest is valid
- Keywords trigger correctly
- Signals are declared

Run tests:
```bash
cd <name> && npx vitest run
```

## Step 6: Install the Drone

To use the drone in this project:
```bash
# Copy to project's drone directory (future: mission drone add <path>)
cp -r <name>/ .mctl/drones/<name>/
```

## Tool vs AI Drone Guide

| Type | When to use | Example |
|------|------------|---------|
| **Tool** | Runs a shell command, parses output | linter, formatter, dep-check |
| **AI** | Needs reasoning, writes code, makes decisions | code-reviewer, api-designer |
| **Hybrid** | Runs a tool, then AI interprets results | test-analyzer (runs tests + explains failures) |

For tool drones, the user also needs to create an executor in `packages/core/src/drones/executors/` — guide them through this if needed.
