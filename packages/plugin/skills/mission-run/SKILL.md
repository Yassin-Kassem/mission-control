---
name: mission-run
description: Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-drone execution with the Mission Control framework
---

# Mission Control Runner

Orchestrate a mission using the Mission Control drone swarm. Each drone is a real subagent with defined inputs, outputs, and behavior loaded from its manifest and skill file.

## Setup

```bash
npx @missionctl/cli --version 2>/dev/null || echo "INSTALL_NEEDED"
```

If INSTALL_NEEDED: tell the user to run `npm install -g @missionctl/cli`.

## Step 1: Initialize + Dispatch Plan

```bash
test -d .mctl || npx @missionctl/cli init
mkdir -p .mctl/mission
npx @missionctl/cli dispatch "$ARGUMENTS" > .mctl/mission/dispatch.json
```

Read `.mctl/mission/dispatch.json`. It contains a structured plan:

```json
{
  "missionId": "m_...",
  "description": "the task",
  "intent": "build",
  "scope": "medium",
  "mode": "copilot",
  "steps": [
    { "drone": "scout", "type": "tool", "command": "npx @missionctl/cli drone exec scout", "outputs": ["scout.json"] },
    { "drone": "architect", "type": "ai", "model": "sonnet", "prompt": "...", "inputs": ["scout.json"], "outputs": ["plan.md"] },
    { "drone": "coder", "type": "ai", "model": "sonnet", "prompt": "...", "inputs": ["scout.json", "plan.md"], "outputs": ["coder.md"] },
    ...
  ]
}
```

Present to user:

> **Mission:** [description]
> **Intent:** [intent] | **Scope:** [scope] | **Est. tokens:** [N]
> **Drones:** [list each step's drone name and type]
>
> **Execution mode?**
> 1. **Copilot** (default) — pauses after architect + after coder
> 2. **Autopilot** — runs all drones, no stops
> 3. **Step-by-step** — pauses after every drone
> 4. **Blitz** — parallel independent drones
> 5. **Solo** — no subagents, do everything inline

For **trivial/small scope**, force **solo** (skip subagents, do the work directly).

## Step 2: Pre-Mission Snapshot

```bash
MISSION_ID=$(cat .mctl/mission/dispatch.json | grep missionId | head -1 | sed 's/.*: "//;s/".*//')
git tag "mission-pre-$MISSION_ID" 2>/dev/null || true
```

## Step 3: Execute the Dispatch Plan

Iterate through each step in `dispatch.json.steps`:

### For tool drones (`type: "tool"`):

Run the command and redirect output to `.mctl/mission/`:

```bash
# Example for scout
npx @missionctl/cli drone exec scout > .mctl/mission/scout.json
```

### For AI drones (`type: "ai"`):

Dispatch a subagent using the Agent tool. The prompt is provided in full by the dispatch plan — use it exactly:

```
Agent tool:
  description: "[drone name] drone"
  model: [step.model]  (sonnet, haiku, or opus as specified)
  prompt: [step.prompt]  (the full prompt from dispatch.json — DO NOT modify it)
```

The prompt already contains:
- The drone's role and the task description
- Behavior instructions from the drone's skill file
- Required input files to read
- Required output files to write
- Communication protocol

**You do not need to construct prompts yourself.** The dispatch plan provides everything.

### Mode-specific pauses:

| Mode | When to pause |
|------|---------------|
| **Copilot** | After architect (show plan.md, ask approval) and after coder (show coder.md summary) |
| **Autopilot** | Never |
| **Step-by-step** | After every drone |
| **Blitz** | Never — run independent drones in parallel |
| **Solo** | N/A — you do everything inline, no subagents |

## Step 4: Self-Healing Loop

After the **tester** drone runs, check its output:

```bash
cat .mctl/mission/tester.json
```

**If tests fail (max 2 retries):**

```bash
# Get a targeted fix prompt
npx @missionctl/cli drone-prompt debugger "fix failing tests" > /tmp/fix-prompt.json
```

Dispatch a debugger subagent with that prompt. After the fix, re-run tester:

```bash
npx @missionctl/cli drone exec tester > .mctl/mission/tester.json
```

## Step 5: Review Loop

After the **reviewer** drone writes `.mctl/mission/reviewer.md`, read it.

**If issues found (max 1 retry):**

Dispatch coder again with: "Fix the issues in .mctl/mission/reviewer.md"

Then re-run reviewer.

## Step 6: Report

```
| Drone     | Type | Result                      |
|-----------|------|-----------------------------|
| scout     | tool | Scanned N files             |
| architect | ai   | [approach summary]          |
| coder     | ai   | Created/modified [files]    |
| tester    | tool | N/N tests passing           |
| security  | tool | N vulnerabilities           |
| reviewer  | ai   | [clean or findings]         |

Snapshot: mission-pre-[id]
Rollback: npx @missionctl/cli rollback [id]
```

## How Drones Work

Each drone is defined by:
- **drone.yaml** — manifest with name, type, triggers, signals, inputs/outputs
- **skill.md** — behavior instructions (AI drones only)

The `dispatch` command reads these files, builds context-aware prompts, and outputs a structured execution plan. Community drones installed via `npx @missionctl/cli drone add <path>` get the same treatment — their skill files become subagent prompts.

To create a new drone: use the `drone-create` skill or run `npx @missionctl/cli drone create <name>`.

## Token Efficiency

- Parent stays lean — read dispatch.json, execute steps, collect one-line results
- Each subagent gets exactly the context it needs via its manifest's `inputs` list
- Communication is file-based through `.mctl/mission/`
- Model selection comes from the drone manifest (architect=sonnet, reviewer=haiku)
- Trivial/small tasks force solo mode — zero subagent overhead
