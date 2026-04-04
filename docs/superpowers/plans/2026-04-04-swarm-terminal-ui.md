# Swarm Terminal Mission Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live-updating terminal UI that renders mission progress, drone states, and signal feed inline during `swarm run` — no browser, no React, no extra dependencies beyond chalk (already installed).

**Architecture:** A `TerminalUI` class subscribes to the SignalBus and redraws the display on each signal using raw ANSI escape codes (`\x1b[`) for cursor movement and screen clearing. The UI is opt-in (default when running `swarm run` with a TTY) and gracefully degrades to the existing line-by-line output when piped or when `--no-ui` is passed. The `run.ts` command wires the UI to the bus before starting the mission.

**Tech Stack:** TypeScript, chalk (already installed), raw ANSI escape codes (no new dependencies)

---

## File Structure

```
packages/cli/src/
├── ui/
│   ├── terminal-ui.ts       # Main UI renderer — subscribes to bus, redraws on signal
│   ├── layout.ts            # Builds the frame: box drawing, sections, alignment
│   └── drone-panel.ts       # Renders drone status rows with state indicators
├── commands/
│   └── run.ts               # (modify) Wire TerminalUI when TTY detected
└── format.ts                # (existing — reuse formatDuration, formatTimestamp)

packages/cli/tests/
├── ui/
│   ├── terminal-ui.test.ts
│   ├── layout.test.ts
│   └── drone-panel.test.ts
```

---

## Task 1: Layout Renderer (Box Drawing)

**Files:**
- Create: `packages/cli/src/ui/layout.ts`
- Create: `packages/cli/tests/ui/layout.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/ui/layout.test.ts
import { describe, it, expect } from 'vitest';
import { renderBox, renderDivider, padRight, truncate } from '../../src/ui/layout.js';

describe('renderBox', () => {
  it('wraps content in a box with title', () => {
    const result = renderBox('SWARM', ['Hello world'], 30);
    expect(result).toContain('SWARM');
    expect(result).toContain('Hello world');
    expect(result).toContain('┌');
    expect(result).toContain('┘');
  });

  it('pads lines to consistent width', () => {
    const result = renderBox('', ['short', 'a longer line'], 30);
    const lines = result.split('\n');
    // All lines should be the same visual width (30 chars)
    for (const line of lines) {
      expect(line.length).toBe(30);
    }
  });
});

describe('renderDivider', () => {
  it('renders a horizontal divider', () => {
    const result = renderDivider(20);
    expect(result).toContain('├');
    expect(result).toContain('┤');
    expect(result.length).toBe(20);
  });
});

describe('padRight', () => {
  it('pads string to given width', () => {
    expect(padRight('hi', 10)).toBe('hi        ');
    expect(padRight('hi', 10).length).toBe(10);
  });

  it('truncates if string exceeds width', () => {
    expect(padRight('hello world', 5)).toBe('hell…');
  });
});

describe('truncate', () => {
  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('returns original if within limit', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/ui/layout.test.ts
```

- [ ] **Step 3: Implement layout**

```typescript
// packages/cli/src/ui/layout.ts

export function renderBox(title: string, contentLines: string[], width: number): string {
  const innerWidth = width - 2; // minus left+right borders
  const top = title
    ? `┌ ${title} ${'─'.repeat(Math.max(0, innerWidth - title.length - 3))}┐`
    : `┌${'─'.repeat(innerWidth)}┐`;

  // Ensure top line is exactly `width`
  const topLine = padRight(top, width).slice(0, width);

  const body = contentLines.map(
    (line) => `│${padRight(line, innerWidth)}│`,
  );

  const bottom = `└${'─'.repeat(innerWidth)}┘`;

  return [topLine, ...body, bottom].join('\n');
}

export function renderDivider(width: number): string {
  const innerWidth = width - 2;
  return `├${'─'.repeat(innerWidth)}┤`;
}

export function padRight(str: string, width: number): string {
  if (str.length > width) {
    return str.slice(0, width - 1) + '…';
  }
  return str + ' '.repeat(width - str.length);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/ui/layout.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/ui/ packages/cli/tests/ui/
git commit -m "feat(cli): add terminal UI layout renderer with box drawing"
```

---

## Task 2: Drone Panel Renderer

**Files:**
- Create: `packages/cli/src/ui/drone-panel.ts`
- Create: `packages/cli/tests/ui/drone-panel.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/ui/drone-panel.test.ts
import { describe, it, expect } from 'vitest';
import { renderDronePanel, type DroneDisplayState } from '../../src/ui/drone-panel.js';

describe('renderDronePanel', () => {
  it('renders drones with state indicators', () => {
    const drones: DroneDisplayState[] = [
      { name: 'scout', state: 'done' },
      { name: 'architect', state: 'running' },
      { name: 'coder', state: 'idle' },
    ];
    const lines = renderDronePanel(drones, 25);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('scout');
    expect(lines[0]).toContain('DONE');
    expect(lines[1]).toContain('architect');
    expect(lines[1]).toContain('RUNNING');
    expect(lines[2]).toContain('coder');
    expect(lines[2]).toContain('IDLE');
  });

  it('uses different indicators per state', () => {
    const drones: DroneDisplayState[] = [
      { name: 'a', state: 'done' },
      { name: 'b', state: 'running' },
      { name: 'c', state: 'failed' },
      { name: 'd', state: 'idle' },
      { name: 'e', state: 'activated' },
    ];
    const lines = renderDronePanel(drones, 25);
    expect(lines[0]).toContain('●'); // done
    expect(lines[1]).toContain('◉'); // running
    expect(lines[2]).toContain('✗'); // failed
    expect(lines[3]).toContain('○'); // idle
    expect(lines[4]).toContain('◎'); // activated
  });

  it('pads lines to given width', () => {
    const drones: DroneDisplayState[] = [
      { name: 'scout', state: 'done' },
    ];
    const lines = renderDronePanel(drones, 30);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(30);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/ui/drone-panel.test.ts
```

- [ ] **Step 3: Implement drone panel**

```typescript
// packages/cli/src/ui/drone-panel.ts
import chalk from 'chalk';
import { padRight } from './layout.js';

export interface DroneDisplayState {
  name: string;
  state: string; // idle | activated | running | done | failed | waiting
}

const STATE_DISPLAY: Record<string, { icon: string; label: string; color: (s: string) => string }> = {
  idle:      { icon: '○', label: 'IDLE',      color: chalk.gray },
  activated: { icon: '◎', label: 'ACTIVATED', color: chalk.cyan },
  running:   { icon: '◉', label: 'RUNNING',   color: chalk.blue },
  waiting:   { icon: '◌', label: 'WAITING',   color: chalk.yellow },
  done:      { icon: '●', label: 'DONE',       color: chalk.green },
  failed:    { icon: '✗', label: 'FAILED',     color: chalk.red },
};

export function renderDronePanel(drones: DroneDisplayState[], width: number): string[] {
  return drones.map((d) => {
    const display = STATE_DISPLAY[d.state] ?? STATE_DISPLAY.idle;
    const raw = `${display.icon} ${padRight(d.name, 12)} ${display.label}`;
    // Apply color but return consistent-width plain text for layout calculations
    return padRight(raw, width).slice(0, width);
  });
}

export function renderDronePanelColored(drones: DroneDisplayState[], width: number): string[] {
  return drones.map((d) => {
    const display = STATE_DISPLAY[d.state] ?? STATE_DISPLAY.idle;
    const icon = display.color(display.icon);
    const label = display.color(display.label);
    const nameStr = padRight(d.name, 12);
    // For colored output we can't measure width from ANSI strings,
    // so we pad the plain version and apply color to parts
    return `${icon} ${nameStr} ${label}`;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/ui/drone-panel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/ui/drone-panel.ts packages/cli/tests/ui/drone-panel.test.ts
git commit -m "feat(cli): add drone panel renderer with state indicators"
```

---

## Task 3: Terminal UI (Main Renderer)

**Files:**
- Create: `packages/cli/src/ui/terminal-ui.ts`
- Create: `packages/cli/tests/ui/terminal-ui.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/ui/terminal-ui.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminalUI } from '../../src/ui/terminal-ui.js';
import { SignalBus, createSignal } from '@swarm/core';

describe('TerminalUI', () => {
  let bus: SignalBus;
  let output: string[];

  beforeEach(() => {
    bus = new SignalBus();
    output = [];
  });

  function createUI(droneNames: string[], description = 'test mission') {
    return new TerminalUI({
      bus,
      droneNames,
      missionDescription: description,
      missionId: 'm1',
      write: (text: string) => { output.push(text); },
    });
  }

  it('renders initial state with all drones idle', () => {
    const ui = createUI(['scout', 'coder']);
    ui.render();
    const frame = output.join('');
    expect(frame).toContain('SWARM');
    expect(frame).toContain('test mission');
    expect(frame).toContain('scout');
    expect(frame).toContain('coder');
    expect(frame).toContain('IDLE');
  });

  it('updates drone state on signal', () => {
    const ui = createUI(['scout', 'coder']);
    ui.start();

    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.activated',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('ACTIVATED');
  });

  it('adds signals to the feed', () => {
    const ui = createUI(['scout']);
    ui.start();

    bus.emit(createSignal({
      type: 'finding', source: 'scout', topic: 'file.found',
      severity: 'info', payload: { path: 'src/app.ts' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('file.found');
  });

  it('tracks progress as drones complete', () => {
    const ui = createUI(['scout', 'coder']);
    ui.start();

    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.done',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('50%');
  });

  it('stops listening on stop()', () => {
    const ui = createUI(['scout']);
    ui.start();
    ui.stop();

    output = [];
    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.done',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    expect(output).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/ui/terminal-ui.test.ts
```

- [ ] **Step 3: Implement TerminalUI**

```typescript
// packages/cli/src/ui/terminal-ui.ts
import chalk from 'chalk';
import type { SignalBus, Signal } from '@swarm/core';
import { type DroneDisplayState, renderDronePanelColored } from './drone-panel.js';
import { formatDuration } from '../format.js';

export interface TerminalUIOptions {
  bus: SignalBus;
  droneNames: string[];
  missionDescription: string;
  missionId: string;
  width?: number;
  write?: (text: string) => void;
}

export class TerminalUI {
  private droneStates: Map<string, string>;
  private signalFeed: { time: string; source: string; topic: string; severity: string }[] = [];
  private startTime: number;
  private completedCount = 0;
  private totalDrones: number;
  private description: string;
  private missionId: string;
  private width: number;
  private write: (text: string) => void;
  private bus: SignalBus;
  private handler: ((signal: Signal) => void) | null = null;
  private frameCount = 0;

  constructor(options: TerminalUIOptions) {
    this.bus = options.bus;
    this.description = options.missionDescription;
    this.missionId = options.missionId;
    this.totalDrones = options.droneNames.length;
    this.width = options.width ?? 60;
    this.write = options.write ?? ((text: string) => process.stdout.write(text));
    this.startTime = Date.now();

    this.droneStates = new Map();
    for (const name of options.droneNames) {
      this.droneStates.set(name, 'idle');
    }
  }

  start(): void {
    this.handler = (signal: Signal) => {
      if (signal.missionId !== this.missionId) return;
      this.processSignal(signal);
      this.render();
    };
    this.bus.on('*', this.handler);
    this.render();
  }

  stop(): void {
    if (this.handler) {
      this.bus.off('*', this.handler);
      this.handler = null;
    }
  }

  render(): void {
    this.frameCount++;
    const lines: string[] = [];
    const w = this.width;
    const inner = w - 2;

    // Top border with title
    const title = ' SWARM ';
    const topPad = Math.max(0, inner - title.length - 1);
    lines.push(`┌${title}${'─'.repeat(topPad)}┐`);

    // Mission info
    const desc = this.description.length > inner - 2
      ? this.description.slice(0, inner - 3) + '…'
      : this.description;
    lines.push(this.pad(` ${desc}`));

    const elapsed = formatDuration(Date.now() - this.startTime);
    const pct = this.totalDrones > 0
      ? Math.round((this.completedCount / this.totalDrones) * 100)
      : 0;
    lines.push(this.pad(` Progress: ${this.progressBar(pct, 20)} ${pct}%  ${elapsed}`));

    // Divider
    lines.push(`├${'─'.repeat(inner)}┤`);

    // Drone panel header
    lines.push(this.pad(chalk.bold(' DRONES')));

    const drones: DroneDisplayState[] = [];
    for (const [name, state] of this.droneStates) {
      drones.push({ name, state });
    }
    const droneLines = renderDronePanelColored(drones, inner - 2);
    for (const line of droneLines) {
      lines.push(`│ ${line}${' '.repeat(Math.max(0, inner - line.length - 1))}│`);
    }

    // Divider
    lines.push(`├${'─'.repeat(inner)}┤`);

    // Signal feed header
    lines.push(this.pad(chalk.bold(' SIGNALS')));

    // Show last N signals that fit
    const maxSignals = 6;
    const recentSignals = this.signalFeed.slice(-maxSignals);
    if (recentSignals.length === 0) {
      lines.push(this.pad(chalk.gray('  Waiting for signals...')));
    } else {
      for (const sig of recentSignals) {
        const prefix = sig.severity === 'critical' ? chalk.red('!') : sig.severity === 'warning' ? chalk.yellow('~') : ' ';
        const text = `${prefix} ${sig.time} ${chalk.gray(`[${sig.source}]`)} ${sig.topic}`;
        lines.push(`│ ${text}${' '.repeat(Math.max(0, inner - stripAnsi(text).length - 1))}│`);
      }
    }

    // Bottom border
    lines.push(`└${'─'.repeat(inner)}┘`);

    // Clear previous frame and write new one
    const output = lines.join('\n') + '\n';

    if (this.frameCount > 1) {
      // Move cursor up to overwrite previous frame
      this.write(`\x1b[${lines.length}A\x1b[0J`);
    }
    this.write(output);
  }

  private processSignal(signal: Signal): void {
    const droneName = signal.payload.drone as string | undefined;

    // Update drone states
    if (signal.topic === 'drone.activated' && droneName) {
      this.droneStates.set(droneName, 'activated');
    } else if (signal.topic === 'drone.running' && droneName) {
      this.droneStates.set(droneName, 'running');
    } else if (signal.topic === 'drone.done' && droneName) {
      this.droneStates.set(droneName, 'done');
      this.completedCount++;
    } else if (signal.topic === 'drone.failed' && droneName) {
      this.droneStates.set(droneName, 'failed');
      this.completedCount++;
    }

    // Add to signal feed (skip lifecycle noise, keep interesting signals)
    if (!signal.topic.startsWith('mission.')) {
      const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      this.signalFeed.push({
        time,
        source: signal.source,
        topic: signal.topic,
        severity: signal.severity,
      });
    }
  }

  private progressBar(pct: number, width: number): string {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  private pad(content: string): string {
    const inner = this.width - 2;
    const plainLen = stripAnsi(content).length;
    const padding = Math.max(0, inner - plainLen);
    return `│${content}${' '.repeat(padding)}│`;
  }
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/ui/terminal-ui.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/ui/terminal-ui.ts packages/cli/tests/ui/terminal-ui.test.ts
git commit -m "feat(cli): add TerminalUI live mission control renderer"
```

---

## Task 4: Wire Terminal UI into `swarm run`

**Files:**
- Modify: `packages/cli/src/commands/run.ts`
- Modify: `packages/cli/src/index.ts` (add `--no-ui` flag)

- [ ] **Step 1: Update run.ts**

Replace the entire contents of `packages/cli/src/commands/run.ts` with:

```typescript
// packages/cli/src/commands/run.ts
import { createMissionId, MissionRunner, type DroneExecutor } from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import { loadProjectContext } from '../context.js';
import { TerminalUI } from '../ui/terminal-ui.js';

export interface RunOptions {
  noDashboard?: boolean;
  noUi?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(description: string, projectDir: string, options: RunOptions = {}): Promise<void> {
  const ctx = loadProjectContext(projectDir);

  const profile = ctx.analyzer.analyze(description, projectDir);
  const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
  const missionId = createMissionId();

  // Decide UI mode
  const isTTY = process.stdout.isTTY ?? false;
  const useTerminalUI = isTTY && !options.noUi;

  if (!useTerminalUI) {
    // Plain output for pipes / --no-ui
    console.log(`Mission: ${description}`);
    console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
    console.log(`Drones: ${droneNames.join(', ')}`);
    console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);
  }

  // Optional browser dashboard (still available with --port)
  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard && options.port) {
    dashboard = new DashboardServer(ctx.bus, { port: options.port });
    const address = await dashboard.start();
    if (!useTerminalUI) {
      console.log(`Dashboard: http://localhost:${address.port}`);
    }
  }

  // Persist signals
  ctx.bus.on('*', (signal) => { ctx.signalStore.save(signal); });

  // Start terminal UI
  let terminalUI: TerminalUI | undefined;
  if (useTerminalUI) {
    const width = Math.min(process.stdout.columns ?? 80, 80);
    terminalUI = new TerminalUI({
      bus: ctx.bus,
      droneNames,
      missionDescription: description,
      missionId,
      width,
    });
    terminalUI.start();
  }

  // Run mission
  const drones = profile.recommendedDrones.map((d) => d.manifest);
  const runner = new MissionRunner({
    bus: ctx.bus, memory: ctx.memory, missionStore: ctx.missionStore,
    checkpoints: ctx.checkpoints, planner: ctx.planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() { return { summary: `${_name} completed (placeholder)` }; },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  // Stop terminal UI
  if (terminalUI) {
    terminalUI.stop();
  }

  if (!useTerminalUI) {
    console.log(`\nMission ${result.status}`);
    if (result.completedDrones.length) console.log(`  Completed: ${result.completedDrones.join(', ')}`);
    if (result.failedDrones.length) console.log(`  Failed: ${result.failedDrones.join(', ')}`);
  } else {
    // Print final summary below the UI
    console.log(`\nMission ${result.status} — ${result.completedDrones.length} drones completed${result.failedDrones.length ? `, ${result.failedDrones.length} failed` : ''}`);
  }

  if (dashboard) await dashboard.stop();
  ctx.close();
}
```

- [ ] **Step 2: Update index.ts — add --no-ui flag to run command**

In `packages/cli/src/index.ts`, find the `run` command definition and add the `--no-ui` option. The full run command block should be:

```typescript
program
  .command('run')
  .description('Start a new mission')
  .argument('<description>', 'What you want to accomplish')
  .option('--no-ui', 'Disable terminal mission control UI')
  .option('--no-dashboard', 'Disable browser dashboard server')
  .option('--drones <names>', 'Comma-separated list of drones to activate')
  .option('--scope <scope>', 'Override scope detection (trivial|small|medium|large|epic)')
  .option('--no-analyze', 'Skip the context analyzer')
  .option('--port <port>', 'Dashboard port (enables browser dashboard)')
  .action(async (description: string, options) => {
    await runMission(description, process.cwd(), {
      noUi: !options.ui,
      noDashboard: !options.dashboard,
      drones: options.drones,
      scope: options.scope,
      noAnalyze: !options.analyze,
      port: options.port ? parseInt(options.port, 10) : undefined,
    });
  });
```

- [ ] **Step 3: Build and run all tests**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test
```

Expected: All tests pass. Existing `run.test.ts` still passes because it uses `noDashboard: true` and runs in a non-TTY test environment (so TerminalUI won't activate).

- [ ] **Step 4: Manual smoke test**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator
node packages/cli/dist/index.js run "build a complete payment system with auth" .

# Should show live terminal UI with drones, progress bar, signal feed
# Then: test plain mode
node packages/cli/dist/index.js run "fix a typo" --no-ui .
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/run.ts packages/cli/src/index.ts
git commit -m "feat(cli): wire TerminalUI into swarm run with TTY detection"
```

---

## Task 5: Final Build + Tag

- [ ] **Step 1: Build**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (~135+).

- [ ] **Step 3: Tag**

```bash
git tag v0.2.0-terminal-ui -m "Terminal mission control UI"
```
