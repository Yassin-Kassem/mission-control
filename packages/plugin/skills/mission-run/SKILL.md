---
name: mission-run
description: Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-drone execution with the Mission Control framework
---

# Mission Control Runner

Orchestrate a mission with the Mission Control framework. AI drones run as isolated subagents. Communication is through `.mctl/mission/` files. You (parent) stay lean — dispatch, collect one-line status, report.

## Setup

Mission Control CLI must be available. Run this **once** at the start:

```bash
# Check if mission CLI is available
npx @mctl/cli --version 2>/dev/null || echo "INSTALL_NEEDED"
```

**If INSTALL_NEEDED:** Tell the user: "Mission Control CLI is not installed. Run `npm install -g @mctl/cli` to install it, or I can use `npx` to run it on-the-fly."

All CLI commands use this pattern:
```bash
npx @mctl/cli <command> [args]
```

If the user has it installed globally, `mission <command>` also works. Prefer `npx @mctl/cli` for portability.

## Step 1: Initialize (if needed)

```bash
# Check if project is initialized
test -d .mctl || npx @mctl/cli init
```

## Step 2: Analyze + Mode Selection

```bash
mkdir -p .mctl/mission
npx @mctl/cli analyze "$ARGUMENTS" --mode copilot > .mctl/mission/analysis.json
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

## Step 3: Pre-Mission Snapshot

```bash
git tag "mission-pre-$(cat .mctl/mission/analysis.json | grep missionId | head -1 | sed 's/.*: "//;s/".*//')" 2>/dev/null || true
```

Creates a rollback point. User can undo everything with `npx @mctl/cli rollback <mission-id>`.

## Step 4: Check Memory

```bash
npx @mctl/cli memory show 2>/dev/null
```

If memory has project info (languages, frameworks, past corrections), include relevant entries in subagent prompts. This makes drones smarter on repeat missions.

## Step 5: Scout (tool — zero tokens)

```bash
npx @mctl/cli drone exec scout > .mctl/mission/scout.json
```

## Step 6: Architect + Plan (subagent)

**Skip for solo mode or trivial/small scope.**

```
Agent tool:
  description: "Architect drone: design + plan"
  model: sonnet
  prompt: |
    You are the Architect drone for a Mission Control mission.
    TASK: $ARGUMENTS

    Read .mctl/mission/scout.json for project context.

    Your job:
    1. Read scout results to understand the project
    2. Design the solution (approach, file structure, data flow)
    3. Write a step-by-step implementation plan with exact file paths

    Write to .mctl/mission/plan.md:
    ## Design
    [2-3 sentences on approach]

    ## Plan
    - [ ] Step 1: [exact action with file path]
    - [ ] Step 2: [exact action with file path]
    ...

    ## Files
    - Create: [paths]
    - Modify: [paths]

    Report: "Plan written to .mctl/mission/plan.md" + one-line summary.
```

**Copilot/Step-by-step:** Read `.mctl/mission/plan.md`, show to user, wait for approval.
**Autopilot/Blitz:** Continue immediately.

## Step 7: Coder (subagent)

```
Agent tool:
  description: "Coder drone: implement plan"
  model: sonnet
  prompt: |
    You are the Coder drone for a Mission Control mission.
    TASK: $ARGUMENTS

    Read:
    - .mctl/mission/scout.json (project structure)
    - .mctl/mission/plan.md (plan to follow exactly)

    Follow the plan step by step. Write clean code. Match existing patterns.
    Write tests alongside code. Commit after each logical unit.

    Write summary to .mctl/mission/coder.md:
    ## Changes
    - [file]: [what changed]
    ## Tests
    - [test]: [what it tests]

    Report: "Implementation complete" + files changed.
```

**Copilot:** Show changes summary to user after coder finishes.

## Step 8: Test + Self-Healing Loop

```bash
npx @mctl/cli drone exec tester > .mctl/mission/tester.json
```

**If tests fail (max 2 retries):**

```
Agent tool:
  description: "Fix failing tests (attempt N/2)"
  model: sonnet
  prompt: |
    Tests are failing. Read:
    - .mctl/mission/tester.json (test output)
    - .mctl/mission/coder.md (what was changed)

    Fix the issues. Run tests to verify your fix.
    Report: what was wrong + what you fixed.
```

Re-run `npx @mctl/cli drone exec tester` after each fix. If still failing after 2 retries, report to user.

## Step 9: Security (tool)

```bash
npx @mctl/cli drone exec security > .mctl/mission/security.json
```

## Step 10: Review + Self-Healing Loop

```
Agent tool:
  description: "Reviewer drone: quality check"
  model: haiku
  prompt: |
    Review code changes for this mission. Read:
    - .mctl/mission/plan.md (intended design)
    - .mctl/mission/coder.md (what was implemented)
    Run `git diff HEAD~5` to see actual changes.

    Check: design match, edge cases, security, quality.
    Write to .mctl/mission/reviewer.md.
    Report: "clean" or list of issues.
```

**If issues found (max 1 retry):**

```
Agent tool:
  description: "Fix review issues"
  model: sonnet
  prompt: |
    Reviewer found issues. Read .mctl/mission/reviewer.md.
    Fix each issue. Report what you fixed.
```

## Step 11: Learn + Report

Mission Control learns from every mission. After completion, key findings get stored in memory for future missions.

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

Snapshot: mission-pre-[id] (npx @mctl/cli rollback [id] to undo)
```

**If mission had failures:**
> Some drones had issues. Run `npx @mctl/cli rollback [mission-id]` to undo all changes?

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
3. Communication via `.mctl/mission/` files only
4. Model selection: architect/coder=sonnet, reviewer/docs=haiku, debugger=opus
5. Trivial/small = solo mode, zero subagent overhead
6. Max 4 AI subagents per mission
