---
name: swarm-run
description: Run an adaptive mission with the swarm framework. Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-agent execution.
---

# Swarm Mission Runner

You are orchestrating a mission using the Swarm framework. Follow this process exactly.

## Step 1: Analyze the Task

Run the analyzer to get a structured plan:

```
swarm analyze "$ARGUMENTS"
```

This returns JSON with: missionId, intent, scope, drones (with type: "ai" or "tool"), and a parallel execution plan.

Parse the JSON output. You now have:
- **missionId**: Use this for all signal logging
- **drones**: The list of drones to execute
- **plan**: Execution order with parallel groups

Tell the user what you found: the intent, scope, and which drones will be activated.

## Step 2: Execute Tool Drones

For each drone where `type === "tool"`, run it via CLI:

```
swarm drone exec <drone-name>
```

Tool drones run immediately and return JSON results. Available tool drones:
- **scout**: Scans project files, detects languages/frameworks, lists all files
- **tester**: Runs the project's test suite (npm test / pytest / etc.)
- **security**: Runs dependency audit (npm/pnpm/yarn audit)

Run all tool drones first. Parse their JSON output — you'll need the scout results for AI drones.

## Step 3: Execute AI Drones

For each drone where `type === "ai"`, you act as that drone directly. Execute them in parallel group order.

### AI Drone Behaviors

**architect** — Design the solution architecture before writing code. Consider the scout results (project structure, languages, frameworks). Propose the approach, file structure, and data flow. Get user approval before proceeding to coder.

**coder** — Implement the solution. Follow the architect's design (if present). Use scout results to understand existing patterns. Write clean code. Follow TDD when tests exist. Commit after each logical unit.

**debugger** — Investigate the issue systematically. Use scout results for context. Reproduce the issue, trace the execution path, identify root cause, then fix. Don't guess.

**reviewer** — Review all changes made during this mission. Check for: correctness, edge cases, security issues, code quality, test coverage. Report findings.

**docs** — Check if public APIs and complex logic have adequate documentation. Add docstrings/comments only where the code isn't self-explanatory.

## Step 4: Report

After all drones complete, provide a summary:
- What was accomplished
- What each drone found/did
- Any warnings or issues
- Suggest next steps if applicable
