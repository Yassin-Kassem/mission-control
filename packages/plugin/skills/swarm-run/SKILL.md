---
name: swarm-run
description: Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-drone execution with the swarm framework
---

# Swarm Mission Runner

Orchestrate a mission with the Swarm framework. AI drones run as isolated subagents. Communication is through `.swarm/mission/` files. You (parent) stay lean — dispatch, collect one-line status, report.

## How to Run Swarm Commands

```bash
SWARM="bash ${CLAUDE_PLUGIN_ROOT}/bin/swarm"
```

Fallback: `SWARM="bash $(find ~/.claude/plugins -path '*/swarm/bin/swarm' -print -quit 2>/dev/null)"`

**NEVER:** `npx swarm`, `node .../bin/swarm`, `swarm` directly.

## Step 1: Analyze + Mode Selection

```bash
$SWARM analyze "$ARGUMENTS" --mode copilot > .swarm/mission/analysis.json
mkdir -p .swarm/mission
```

Parse the JSON. Present to user:

> **Mission:** [description]
> Intent: [intent] | Scope: [scope] | Est. tokens: [N] (~$[cost])
> Drones: [list with type indicators]
>
> **Execution mode?**
> 1. **Copilot** (default) — pauses after design + after coding for approval
> 2. **Autopilot** — runs all drones, no stops
> 3. **Step-by-step** — pauses after every drone
> 4. **Blitz** — parallel independent drones, fastest
> 5. **Solo** — no subagents, do everything inline

Default to **copilot**. For **trivial/small scope**, force **solo**.

## Step 2: Pre-Mission Snapshot

```bash
git tag "swarm-pre-$(cat .swarm/mission/analysis.json | grep missionId | head -1 | sed 's/.*: "//;s/".*//')" 2>/dev/null || true
```

Creates a rollback point. User can undo everything with `swarm rollback <mission-id>`.

## Step 3: Check Memory

```bash
$SWARM memory show 2>/dev/null
```

If memory has project info (languages, frameworks, past corrections), include relevant entries in subagent prompts. This makes drones smarter on repeat missions.

## Step 4: Scout (tool — zero tokens)

```bash
$SWARM drone exec scout > .swarm/mission/scout.json
```

## Step 5: Architect + Plan (subagent)

**Skip for solo mode or trivial/small scope.**

```
Agent tool:
  description: "Architect drone: design + plan"
  model: sonnet
  prompt: |
    You are the Architect drone for a swarm mission.
    TASK: $ARGUMENTS

    Read .swarm/mission/scout.json for project context.

    Your job:
    1. Read scout results to understand the project
    2. Design the solution (approach, file structure, data flow)
    3. Write a step-by-step implementation plan with exact file paths

    Write to .swarm/mission/plan.md:
    ## Design
    [2-3 sentences on approach]

    ## Plan
    - [ ] Step 1: [exact action with file path]
    - [ ] Step 2: [exact action with file path]
    ...

    ## Files
    - Create: [paths]
    - Modify: [paths]

    Report: "Plan written to .swarm/mission/plan.md" + one-line summary.
```

**Copilot/Step-by-step:** Read `.swarm/mission/plan.md`, show to user, wait for approval.
**Autopilot/Blitz:** Continue immediately.

## Step 6: Coder (subagent)

```
Agent tool:
  description: "Coder drone: implement plan"
  model: sonnet
  prompt: |
    You are the Coder drone for a swarm mission.
    TASK: $ARGUMENTS

    Read:
    - .swarm/mission/scout.json (project structure)
    - .swarm/mission/plan.md (plan to follow exactly)

    Follow the plan step by step. Write clean code. Match existing patterns.
    Write tests alongside code. Commit after each logical unit.

    Test commands:
    - Package files: `pnpm test`
    - Root files: `pnpm exec vitest run tests/<file>.test.ts`
    - NEVER: npx vitest, turbo test, node_modules/.bin/vitest

    Write summary to .swarm/mission/coder.md:
    ## Changes
    - [file]: [what changed]
    ## Tests
    - [test]: [what it tests]

    Report: "Implementation complete" + files changed.
```

**Copilot:** Show changes summary to user after coder finishes.

## Step 7: Test + Self-Healing Loop

```bash
$SWARM drone exec tester > .swarm/mission/tester.json
```

**If tests fail (max 2 retries):**

```
Agent tool:
  description: "Fix failing tests (attempt N/2)"
  model: sonnet
  prompt: |
    Tests are failing. Read:
    - .swarm/mission/tester.json (test output)
    - .swarm/mission/coder.md (what was changed)

    Fix the issues. Test with: `pnpm test` or `pnpm exec vitest run tests/<file>.test.ts`
    Report: what was wrong + what you fixed.
```

Re-run `$SWARM drone exec tester` after each fix. If still failing after 2 retries, report to user.

## Step 8: Security (tool)

```bash
$SWARM drone exec security > .swarm/mission/security.json
```

## Step 9: Review + Self-Healing Loop

```
Agent tool:
  description: "Reviewer drone: quality check"
  model: haiku
  prompt: |
    Review code changes for this mission. Read:
    - .swarm/mission/plan.md (intended design)
    - .swarm/mission/coder.md (what was implemented)
    Run `git diff HEAD~5` to see actual changes.

    Check: design match, edge cases, security, quality.
    Write to .swarm/mission/reviewer.md.
    Report: "clean" or list of issues.
```

**If issues found (max 1 retry):**

```
Agent tool:
  description: "Fix review issues"
  model: sonnet
  prompt: |
    Reviewer found issues. Read .swarm/mission/reviewer.md.
    Fix each issue. Report what you fixed.
```

## Step 10: Learn + Report

The swarm learns from every mission. After completion, key findings get stored in memory for future missions.

Report to user:

```
| Drone     | Result                            |
|-----------|-----------------------------------|
| scout     | Scanned N files                   |
| architect | [approach summary]                |
| coder     | Created/modified [files]          |
| tester    | N/N tests passing                 |
| security  | N vulnerabilities                 |
| reviewer  | [clean or findings]               |

Snapshot: swarm-pre-[id] (swarm rollback [id] to undo)
```

**If mission had failures:**
> Some drones had issues. Run `swarm rollback [mission-id]` to undo all changes?

## Mode Behavior Summary

| Mode | Architect pause | Coder pause | Self-heal | Subagents |
|------|----------------|-------------|-----------|-----------|
| Solo | - | - | No | No |
| Copilot | Yes | Yes | Yes | Yes |
| Autopilot | No | No | Yes | Yes |
| Step-by-step | Yes (every drone) | Yes | Yes (ask) | Yes |
| Blitz | No | No | Yes | Yes (parallel) |

## Token Efficiency

1. Parent stays lean — dispatch + collect one-line status
2. Subagents read files themselves, parent NEVER reads full file contents
3. Communication via `.swarm/mission/` files only
4. Model selection: architect/coder=sonnet, reviewer/docs=haiku, debugger=opus
5. Trivial/small = solo mode, zero subagent overhead
6. Max 4 AI subagents per mission

## Running Tests

**Package files:** `pnpm test`
**Root files:** `pnpm exec vitest run tests/<file>.test.ts`
**NEVER:** `npx vitest`, `vitest run`, `turbo test`
