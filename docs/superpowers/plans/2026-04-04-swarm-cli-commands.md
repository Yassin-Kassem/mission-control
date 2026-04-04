# Swarm CLI Commands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all remaining CLI commands — status, history, replay, memory management, drone management, config, and a shared context helper to eliminate duplication across commands.

**Architecture:** Extract shared DB/registry setup from `run.ts` into a `context.ts` helper. Each new command is a thin file in `packages/cli/src/commands/` that uses the shared context. All commands are read-only against the SQLite database (no mutation except `memory promote/forget`). Commands produce formatted terminal output.

**Tech Stack:** TypeScript, Commander.js, @swarm/core (existing), chalk for colored output, Vitest

---

## File Structure

```
packages/cli/src/
├── commands/
│   ├── init.ts           # (existing)
│   ├── run.ts            # (existing — will be refactored to use context.ts)
│   ├── status.ts         # swarm status
│   ├── history.ts        # swarm history
│   ├── replay.ts         # swarm replay <mission-id>
│   ├── drone.ts          # swarm drone list/enable/disable
│   ├── memory.ts         # swarm memory show/promote/forget
│   └── config.ts         # swarm config show
├── context.ts            # Shared project context (DB, stores, registry)
├── format.ts             # Terminal output formatting helpers
├── dashboard/
│   ├── broadcaster.ts    # (existing)
│   └── server.ts         # (existing)
└── index.ts              # (existing — add new commands)

packages/cli/tests/
├── commands/
│   ├── init.test.ts      # (existing)
│   ├── run.test.ts       # (existing)
│   ├── status.test.ts
│   ├── history.test.ts
│   ├── replay.test.ts
│   ├── drone.test.ts
│   ├── memory.test.ts
│   └── config.test.ts
├── context.test.ts
└── format.test.ts
```

---

## Task 1: Add chalk dependency + Format helpers

**Files:**
- Create: `packages/cli/src/format.ts`
- Create: `packages/cli/tests/format.test.ts`

- [ ] **Step 1: Add chalk dependency**

Edit `packages/cli/package.json` — add `"chalk": "^5.0.0"` to `dependencies`. Then:

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm install
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/cli/tests/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatTimestamp, formatDuration, formatStatus, formatTable } from '../src/format.js';

describe('formatTimestamp', () => {
  it('formats a timestamp as readable date', () => {
    const ts = new Date('2026-04-04T10:30:00Z').getTime();
    const result = formatTimestamp(ts);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/04/);
  });
});

describe('formatDuration', () => {
  it('formats milliseconds as human-readable', () => {
    expect(formatDuration(500)).toBe('0.5s');
    expect(formatDuration(65000)).toBe('1m 5s');
    expect(formatDuration(3661000)).toBe('1h 1m');
  });
});

describe('formatStatus', () => {
  it('returns status with indicator', () => {
    expect(formatStatus('completed')).toContain('completed');
    expect(formatStatus('running')).toContain('running');
    expect(formatStatus('failed')).toContain('failed');
    expect(formatStatus('pending')).toContain('pending');
  });
});

describe('formatTable', () => {
  it('formats rows into aligned columns', () => {
    const rows = [
      ['Name', 'Status'],
      ['scout', 'done'],
      ['coder', 'running'],
    ];
    const result = formatTable(rows);
    expect(result).toContain('Name');
    expect(result).toContain('scout');
    // Columns should be aligned
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/format.test.ts
```

- [ ] **Step 4: Implement format helpers**

```typescript
// packages/cli/src/format.ts
import chalk from 'chalk';

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green('● completed');
    case 'running':
      return chalk.blue('● running');
    case 'failed':
      return chalk.red('● failed');
    case 'paused':
      return chalk.yellow('● paused');
    case 'pending':
      return chalk.gray('○ pending');
    default:
      return chalk.gray(`○ ${status}`);
  }
}

export function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';

  const colWidths: number[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i] ?? 0, row[i].length);
    }
  }

  return rows
    .map((row) =>
      row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join('  '),
    )
    .join('\n');
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/format.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/format.ts packages/cli/tests/format.test.ts packages/cli/package.json pnpm-lock.yaml
git commit -m "feat(cli): add terminal formatting helpers with chalk"
```

---

## Task 2: Shared Project Context

**Files:**
- Create: `packages/cli/src/context.ts`
- Create: `packages/cli/tests/context.test.ts`
- Modify: `packages/cli/src/commands/run.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/context.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadProjectContext, type ProjectContext } from '../src/context.js';
import { initProject } from '../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('loadProjectContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-ctx-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads all stores from project directory', () => {
    const ctx = loadProjectContext(tmpDir);
    expect(ctx.db).toBeDefined();
    expect(ctx.missionStore).toBeDefined();
    expect(ctx.signalStore).toBeDefined();
    expect(ctx.memory).toBeDefined();
    expect(ctx.checkpoints).toBeDefined();
    expect(ctx.registry).toBeDefined();
    ctx.close();
  });

  it('throws if project not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-empty-'));
    expect(() => loadProjectContext(emptyDir)).toThrow('not initialized');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('registers builtin drones', () => {
    const ctx = loadProjectContext(tmpDir);
    const drones = ctx.registry.list();
    expect(drones.length).toBeGreaterThan(0);
    expect(drones.map((d) => d.name)).toContain('scout');
    expect(drones.map((d) => d.name)).toContain('coder');
    ctx.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/context.test.ts
```

- [ ] **Step 3: Implement context**

```typescript
// packages/cli/src/context.ts
import {
  createDatabase, type SwarmDatabase, SignalBus, SignalStore, MemoryManager,
  MissionStore, MissionPlanner, CheckpointManager, ContextAnalyzer,
  DroneRegistry, type DroneManifest,
} from '@swarm/core';
import path from 'path';
import fs from 'fs';

export interface ProjectContext {
  projectDir: string;
  db: SwarmDatabase;
  bus: SignalBus;
  signalStore: SignalStore;
  memory: MemoryManager;
  missionStore: MissionStore;
  checkpoints: CheckpointManager;
  registry: DroneRegistry;
  planner: MissionPlanner;
  analyzer: ContextAnalyzer;
  close(): void;
}

export function loadProjectContext(projectDir: string): ProjectContext {
  const swarmDir = path.join(projectDir, '.swarm');
  if (!fs.existsSync(swarmDir)) {
    throw new Error(`Project not initialized. Run \`swarm init\` first.`);
  }

  const dbPath = path.join(swarmDir, 'memory.db');
  const db = createDatabase(dbPath);
  const bus = new SignalBus();
  const signalStore = new SignalStore(db);
  const memory = new MemoryManager(db);
  const missionStore = new MissionStore(db);
  const checkpoints = new CheckpointManager(db);
  const registry = new DroneRegistry();
  const planner = new MissionPlanner();

  for (const drone of getBuiltinDrones()) {
    registry.register(drone);
  }

  const analyzer = new ContextAnalyzer(registry, memory);

  return {
    projectDir,
    db, bus, signalStore, memory, missionStore, checkpoints,
    registry, planner, analyzer,
    close() { db.close(); },
  };
}

function getBuiltinDrones(): DroneManifest[] {
  return [
    { name: 'scout', description: 'Explores codebase, maps context', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['scout.done'], listens: [] }, priority: 100, escalation: 'user' },
    { name: 'architect', description: 'Designs system architecture', triggers: { taskSize: 'large' }, opinions: { requires: ['spec before code'], suggests: [], blocks: [] }, signals: { emits: ['architect.done'], listens: ['scout.done'] }, priority: 90, escalation: 'user' },
    { name: 'coder', description: 'Implements code', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['coder.done'], listens: ['architect.done'] }, priority: 50, escalation: 'user' },
    { name: 'tester', description: 'Writes and runs tests', triggers: {}, opinions: { requires: ['test coverage'], suggests: [], blocks: [] }, signals: { emits: ['tester.done'], listens: ['coder.done'] }, priority: 40, escalation: 'user' },
    { name: 'debugger', description: 'Systematic root-cause analysis', triggers: { keywords: ['bug', 'error', 'debug', 'crash'] }, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['debugger.done'], listens: [] }, priority: 85, escalation: 'user' },
    { name: 'security', description: 'Flags vulnerabilities', triggers: { keywords: ['auth', 'payment', 'token', 'password', 'credential'] }, opinions: { requires: [], suggests: [], blocks: ['insecure patterns'] }, signals: { emits: ['security.done'], listens: ['scout.done'] }, priority: 80, escalation: 'user' },
    { name: 'reviewer', description: 'Final quality check', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['reviewer.done'], listens: ['coder.done', 'tester.done'] }, priority: 10, escalation: 'user' },
    { name: 'docs', description: 'Documentation generation', triggers: { taskSize: 'large' }, opinions: { requires: [], suggests: ['document public APIs'], blocks: [] }, signals: { emits: ['docs.done'], listens: ['coder.done'] }, priority: 5, escalation: 'user' },
  ];
}
```

- [ ] **Step 4: Refactor run.ts to use context**

Replace `packages/cli/src/commands/run.ts` with:

```typescript
// packages/cli/src/commands/run.ts
import { createMissionId, MissionRunner, type DroneExecutor } from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import { loadProjectContext } from '../context.js';

export interface RunOptions {
  noDashboard?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(description: string, projectDir: string, options: RunOptions = {}): Promise<void> {
  const ctx = loadProjectContext(projectDir);

  const profile = ctx.analyzer.analyze(description, projectDir);

  console.log(`Mission: ${description}`);
  console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
  console.log(`Drones: ${profile.recommendedDrones.map((d) => d.manifest.name).join(', ')}`);
  console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);

  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard) {
    const port = options.port ?? 3000;
    dashboard = new DashboardServer(ctx.bus, { port });
    const address = await dashboard.start();
    console.log(`Dashboard: http://localhost:${address.port}`);
  }

  ctx.bus.on('*', (signal) => { ctx.signalStore.save(signal); });

  const missionId = createMissionId();
  const drones = profile.recommendedDrones.map((d) => d.manifest);

  const runner = new MissionRunner({
    bus: ctx.bus, memory: ctx.memory, missionStore: ctx.missionStore,
    checkpoints: ctx.checkpoints, planner: ctx.planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() { return { summary: `${_name} completed (placeholder)` }; },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  console.log(`\nMission ${result.status}`);
  if (result.completedDrones.length) console.log(`  Completed: ${result.completedDrones.join(', ')}`);
  if (result.failedDrones.length) console.log(`  Failed: ${result.failedDrones.join(', ')}`);

  if (dashboard) await dashboard.stop();
  ctx.close();
}
```

- [ ] **Step 5: Run all existing tests to verify refactor**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test
```

Expected: All 103+ tests pass (existing + 3 new context tests).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/context.ts packages/cli/tests/context.test.ts packages/cli/src/commands/run.ts
git commit -m "refactor(cli): extract shared ProjectContext from run command"
```

---

## Task 3: Status Command

**Files:**
- Create: `packages/cli/src/commands/status.ts`
- Create: `packages/cli/tests/commands/status.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/status.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStatus } from '../../src/commands/status.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getStatus', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-status-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns status with no missions', () => {
    const status = getStatus(tmpDir);
    expect(status.totalMissions).toBe(0);
    expect(status.latestMission).toBeUndefined();
    expect(status.memoryStats.short).toBe(0);
    expect(status.memoryStats.working).toBe(0);
    expect(status.memoryStats.long).toBe(0);
    expect(status.registeredDrones).toBeGreaterThan(0);
  });

  it('returns status with missions', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test mission');
    ctx.missionStore.complete('m1', 'done');
    ctx.close();

    const status = getStatus(tmpDir);
    expect(status.totalMissions).toBe(1);
    expect(status.latestMission?.id).toBe('m1');
    expect(status.latestMission?.status).toBe('completed');
  });

  it('includes memory stats', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'ts');
    ctx.memory.long.set('user.pref', 'minimal');
    ctx.close();

    const status = getStatus(tmpDir);
    expect(status.memoryStats.working).toBe(1);
    expect(status.memoryStats.long).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/status.test.ts
```

- [ ] **Step 3: Implement status command**

```typescript
// packages/cli/src/commands/status.ts
import { type Mission } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatStatus, formatTimestamp, formatTable } from '../format.js';

export interface SwarmStatus {
  totalMissions: number;
  latestMission?: Mission;
  memoryStats: { short: number; working: number; long: number };
  registeredDrones: number;
}

export function getStatus(projectDir: string): SwarmStatus {
  const ctx = loadProjectContext(projectDir);

  const missions = ctx.missionStore.list(1);
  const allMissions = ctx.missionStore.list(9999);

  const status: SwarmStatus = {
    totalMissions: allMissions.length,
    latestMission: missions[0],
    memoryStats: {
      short: ctx.memory.short.list().length,
      working: ctx.memory.working.list().length,
      long: ctx.memory.long.list().length,
    },
    registeredDrones: ctx.registry.list().length,
  };

  ctx.close();
  return status;
}

export function printStatus(projectDir: string): void {
  const status = getStatus(projectDir);

  console.log('Swarm Status');
  console.log('============\n');

  console.log(`Missions: ${status.totalMissions} total`);
  if (status.latestMission) {
    console.log(`Latest:   ${formatStatus(status.latestMission.status)} — "${status.latestMission.description}"`);
    console.log(`          ${formatTimestamp(status.latestMission.createdAt)}`);
  } else {
    console.log('Latest:   No missions yet');
  }

  console.log(`\nMemory:`);
  console.log(formatTable([
    ['Layer', 'Entries'],
    ['short-term', String(status.memoryStats.short)],
    ['working', String(status.memoryStats.working)],
    ['long-term', String(status.memoryStats.long)],
  ]));

  console.log(`\nDrones: ${status.registeredDrones} registered`);
}
```

- [ ] **Step 4: Add to CLI index**

Add this import and command to `packages/cli/src/index.ts` after the `run` command:

```typescript
import { printStatus } from './commands/status.js';

// ... after run command:

program
  .command('status')
  .description('Show current swarm status')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printStatus(dir);
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/status.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/status.ts packages/cli/tests/commands/status.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm status command"
```

---

## Task 4: History Command

**Files:**
- Create: `packages/cli/src/commands/history.ts`
- Create: `packages/cli/tests/commands/history.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/history.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHistory } from '../../src/commands/history.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getHistory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-hist-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty list when no missions', () => {
    const history = getHistory(tmpDir);
    expect(history).toHaveLength(0);
  });

  it('returns missions in reverse chronological order', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'first');
    ctx.missionStore.create('m2', 'second');
    ctx.close();

    const history = getHistory(tmpDir);
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('m2');
    expect(history[1].id).toBe('m1');
  });

  it('respects limit parameter', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'first');
    ctx.missionStore.create('m2', 'second');
    ctx.missionStore.create('m3', 'third');
    ctx.close();

    const history = getHistory(tmpDir, 2);
    expect(history).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/history.test.ts
```

- [ ] **Step 3: Implement history command**

```typescript
// packages/cli/src/commands/history.ts
import { type Mission } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatStatus, formatTimestamp, formatTable } from '../format.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);

  if (missions.length === 0) {
    console.log('No missions yet. Run `swarm run "task"` to start one.');
    return;
  }

  console.log(`Mission History (${missions.length} shown)\n`);

  const rows: string[][] = [['ID', 'Status', 'Description', 'Date']];
  for (const m of missions) {
    rows.push([
      m.id,
      m.status,
      m.description.length > 40 ? m.description.slice(0, 37) + '...' : m.description,
      formatTimestamp(m.createdAt),
    ]);
  }
  console.log(formatTable(rows));
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printHistory } from './commands/history.js';

program
  .command('history')
  .description('Show past missions')
  .option('-n, --limit <n>', 'Number of missions to show', '20')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string, options) => {
    printHistory(dir, parseInt(options.limit, 10));
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/history.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/history.ts packages/cli/tests/commands/history.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm history command"
```

---

## Task 5: Replay Command

**Files:**
- Create: `packages/cli/src/commands/replay.ts`
- Create: `packages/cli/tests/commands/replay.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/replay.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getReplay } from '../../src/commands/replay.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import { createSignal } from '@swarm/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getReplay', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-replay-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns signals for a mission', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test');
    ctx.signalStore.save(createSignal({ type: 'progress', source: 'scout', topic: 'drone.activated', severity: 'info', payload: { drone: 'scout' }, missionId: 'm1' }));
    ctx.signalStore.save(createSignal({ type: 'finding', source: 'scout', topic: 'file.found', severity: 'info', payload: { path: 'src/app.ts' }, missionId: 'm1' }));
    ctx.close();

    const replay = getReplay(tmpDir, 'm1');
    expect(replay.mission?.id).toBe('m1');
    expect(replay.signals).toHaveLength(2);
    expect(replay.signals[0].topic).toBe('drone.activated');
  });

  it('returns undefined mission for unknown id', () => {
    const replay = getReplay(tmpDir, 'nonexistent');
    expect(replay.mission).toBeUndefined();
    expect(replay.signals).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/replay.test.ts
```

- [ ] **Step 3: Implement replay command**

```typescript
// packages/cli/src/commands/replay.ts
import { type Mission, type Signal } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';

export interface ReplayData {
  mission: Mission | undefined;
  signals: Signal[];
}

export function getReplay(projectDir: string, missionId: string): ReplayData {
  const ctx = loadProjectContext(projectDir);
  const mission = ctx.missionStore.get(missionId);
  const signals = ctx.signalStore.getByMission(missionId);
  ctx.close();
  return { mission, signals };
}

export function printReplay(projectDir: string, missionId: string): void {
  const { mission, signals } = getReplay(projectDir, missionId);

  if (!mission) {
    console.error(`Mission "${missionId}" not found.`);
    return;
  }

  console.log(`Replay: ${mission.description}`);
  console.log(`Status: ${mission.status} | Created: ${formatTimestamp(mission.createdAt)}`);
  console.log(`Signals: ${signals.length}\n`);

  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString();
    const prefix = signal.severity === 'critical' ? '!' : signal.severity === 'warning' ? '~' : ' ';
    console.log(`${prefix} ${time} [${signal.source}] ${signal.topic}`);
    if (Object.keys(signal.payload).length > 0) {
      console.log(`    ${JSON.stringify(signal.payload)}`);
    }
  }
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printReplay } from './commands/replay.js';

program
  .command('replay')
  .description('Replay signal history for a mission')
  .argument('<mission-id>', 'Mission ID to replay')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((missionId: string, dir: string) => {
    printReplay(dir, missionId);
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/replay.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/replay.ts packages/cli/tests/commands/replay.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm replay command for signal history"
```

---

## Task 6: Drone Command (list/enable/disable)

**Files:**
- Create: `packages/cli/src/commands/drone.ts`
- Create: `packages/cli/tests/commands/drone.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/drone.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listDrones, getDroneInfo } from '../../src/commands/drone.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('listDrones', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-drone-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists all registered drones', () => {
    const drones = listDrones(tmpDir);
    expect(drones.length).toBeGreaterThan(0);
    const names = drones.map((d) => d.name);
    expect(names).toContain('scout');
    expect(names).toContain('architect');
    expect(names).toContain('coder');
    expect(names).toContain('tester');
    expect(names).toContain('security');
    expect(names).toContain('reviewer');
  });

  it('returns drones sorted by priority', () => {
    const drones = listDrones(tmpDir);
    expect(drones[0].name).toBe('scout'); // highest priority
  });
});

describe('getDroneInfo', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-drone-info-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns info for a known drone', () => {
    const info = getDroneInfo(tmpDir, 'scout');
    expect(info).toBeDefined();
    expect(info!.name).toBe('scout');
    expect(info!.description).toBeDefined();
  });

  it('returns undefined for unknown drone', () => {
    const info = getDroneInfo(tmpDir, 'nonexistent');
    expect(info).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/drone.test.ts
```

- [ ] **Step 3: Implement drone command**

```typescript
// packages/cli/src/commands/drone.ts
import { type DroneManifest } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTable } from '../format.js';

export function listDrones(projectDir: string): DroneManifest[] {
  const ctx = loadProjectContext(projectDir);
  const drones = ctx.registry.list();
  ctx.close();
  return drones;
}

export function getDroneInfo(projectDir: string, name: string): DroneManifest | undefined {
  const ctx = loadProjectContext(projectDir);
  const drone = ctx.registry.get(name);
  ctx.close();
  return drone;
}

export function printDroneList(projectDir: string): void {
  const drones = listDrones(projectDir);

  console.log(`Registered Drones (${drones.length})\n`);

  const rows: string[][] = [['Name', 'Priority', 'Description']];
  for (const d of drones) {
    rows.push([d.name, String(d.priority), d.description]);
  }
  console.log(formatTable(rows));
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);

  if (!drone) {
    console.error(`Drone "${name}" not found.`);
    return;
  }

  console.log(`Drone: ${drone.name}`);
  console.log(`Description: ${drone.description}`);
  console.log(`Priority: ${drone.priority}`);
  console.log(`Escalation: ${drone.escalation}`);

  if (drone.triggers.keywords) {
    console.log(`Keywords: ${(drone.triggers.keywords as string[]).join(', ')}`);
  }
  if (drone.opinions.requires.length) {
    console.log(`Requires: ${drone.opinions.requires.join(', ')}`);
  }
  if (drone.signals.emits.length) {
    console.log(`Emits: ${drone.signals.emits.join(', ')}`);
  }
  if (drone.signals.listens.length) {
    console.log(`Listens: ${drone.signals.listens.join(', ')}`);
  }
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printDroneList, printDroneInfo } from './commands/drone.js';

const droneCmd = program
  .command('drone')
  .description('Manage drones');

droneCmd
  .command('list')
  .description('List all registered drones')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printDroneList(dir);
  });

droneCmd
  .command('info')
  .description('Show drone details')
  .argument('<name>', 'Drone name')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((name: string, dir: string) => {
    printDroneInfo(dir, name);
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/drone.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/drone.ts packages/cli/tests/commands/drone.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm drone list/info commands"
```

---

## Task 7: Memory Command (show/promote/forget)

**Files:**
- Create: `packages/cli/src/commands/memory.ts`
- Create: `packages/cli/tests/commands/memory.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/memory.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listMemory, promoteMemory, forgetMemory } from '../../src/commands/memory.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('listMemory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-mem-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all memory entries grouped by layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.memory.long.set('user.pref', 'minimal');
    ctx.close();

    const result = listMemory(tmpDir);
    expect(result.working).toHaveLength(1);
    expect(result.long).toHaveLength(1);
    expect(result.short).toHaveLength(0);
  });

  it('filters by layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('a', '1');
    ctx.memory.long.set('b', '2');
    ctx.close();

    const result = listMemory(tmpDir, 'working');
    expect(result.working).toHaveLength(1);
    expect(result.long).toHaveLength(0);
  });
});

describe('promoteMemory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-mem-promote-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('promotes a key from one layer to another', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.close();

    promoteMemory(tmpDir, 'project.lang', 'working', 'long');

    const ctx2 = loadProjectContext(tmpDir);
    expect(ctx2.memory.long.get('project.lang')).toBe('typescript');
    expect(ctx2.memory.working.get('project.lang')).toBeUndefined();
    ctx2.close();
  });
});

describe('forgetMemory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-mem-forget-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('deletes a key from a layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.close();

    forgetMemory(tmpDir, 'project.lang', 'working');

    const ctx2 = loadProjectContext(tmpDir);
    expect(ctx2.memory.working.get('project.lang')).toBeUndefined();
    ctx2.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/memory.test.ts
```

- [ ] **Step 3: Implement memory command**

```typescript
// packages/cli/src/commands/memory.ts
import { type MemoryEntry, type MemoryLayerName } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTable, formatTimestamp } from '../format.js';

export interface MemoryListing {
  short: MemoryEntry[];
  working: MemoryEntry[];
  long: MemoryEntry[];
}

export function listMemory(projectDir: string, layer?: MemoryLayerName): MemoryListing {
  const ctx = loadProjectContext(projectDir);

  const result: MemoryListing = {
    short: (!layer || layer === 'short') ? ctx.memory.short.list() : [],
    working: (!layer || layer === 'working') ? ctx.memory.working.list() : [],
    long: (!layer || layer === 'long') ? ctx.memory.long.list() : [],
  };

  ctx.close();
  return result;
}

export function promoteMemory(
  projectDir: string,
  key: string,
  from: MemoryLayerName,
  to: MemoryLayerName,
): void {
  const ctx = loadProjectContext(projectDir);
  ctx.memory.promote(key, from, to);
  ctx.close();
}

export function forgetMemory(projectDir: string, key: string, layer: MemoryLayerName): void {
  const ctx = loadProjectContext(projectDir);
  const memLayer = layer === 'short' ? ctx.memory.short : layer === 'working' ? ctx.memory.working : ctx.memory.long;
  memLayer.delete(key);
  ctx.close();
}

export function printMemory(projectDir: string, layer?: MemoryLayerName): void {
  const listing = listMemory(projectDir, layer);

  const layers: [string, MemoryEntry[]][] = [
    ['Short-term', listing.short],
    ['Working', listing.working],
    ['Long-term', listing.long],
  ];

  for (const [name, entries] of layers) {
    if (entries.length === 0) continue;
    console.log(`\n${name} Memory (${entries.length} entries)\n`);
    const rows: string[][] = [['Key', 'Value', 'Updated']];
    for (const e of entries) {
      const val = e.value.length > 50 ? e.value.slice(0, 47) + '...' : e.value;
      rows.push([e.key, val, formatTimestamp(e.updatedAt)]);
    }
    console.log(formatTable(rows));
  }

  const total = listing.short.length + listing.working.length + listing.long.length;
  if (total === 0) {
    console.log('No memory entries. Memory is populated as missions run.');
  }
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printMemory, promoteMemory, forgetMemory } from './commands/memory.js';
import { type MemoryLayerName } from '@swarm/core';

const memoryCmd = program
  .command('memory')
  .description('Manage swarm memory');

memoryCmd
  .command('show')
  .description('Show memory entries')
  .option('--layer <layer>', 'Filter by layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string, options) => {
    printMemory(dir, options.layer as MemoryLayerName | undefined);
  });

memoryCmd
  .command('promote')
  .description('Promote a key from one layer to another')
  .argument('<key>', 'Memory key')
  .argument('<from>', 'Source layer (short|working|long)')
  .argument('<to>', 'Target layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((key: string, from: string, to: string, dir: string) => {
    promoteMemory(dir, key, from as MemoryLayerName, to as MemoryLayerName);
    console.log(`Promoted "${key}" from ${from} to ${to}`);
  });

memoryCmd
  .command('forget')
  .description('Delete a memory entry')
  .argument('<key>', 'Memory key')
  .argument('<layer>', 'Layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((key: string, layer: string, dir: string) => {
    forgetMemory(dir, key, layer as MemoryLayerName);
    console.log(`Forgot "${key}" from ${layer}`);
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/memory.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/memory.ts packages/cli/tests/commands/memory.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm memory show/promote/forget commands"
```

---

## Task 8: Config Command

**Files:**
- Create: `packages/cli/src/commands/config.ts`
- Create: `packages/cli/tests/commands/config.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig } from '../../src/commands/config.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-config-'));
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads the config file', () => {
    const config = getConfig(tmpDir);
    expect(config).toContain('drones:');
    expect(config).toContain('dashboard:');
  });

  it('throws if not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-empty-'));
    expect(() => getConfig(emptyDir)).toThrow();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/config.test.ts
```

- [ ] **Step 3: Implement config command**

```typescript
// packages/cli/src/commands/config.ts
import fs from 'fs';
import path from 'path';

export function getConfig(projectDir: string): string {
  const configPath = path.join(projectDir, '.swarm', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('Project not initialized. Run `swarm init` first.');
  }
  return fs.readFileSync(configPath, 'utf-8');
}

export function printConfig(projectDir: string): void {
  const config = getConfig(projectDir);
  console.log('Swarm Config (.swarm/config.yaml)\n');
  console.log(config);
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printConfig } from './commands/config.js';

const configCmd = program
  .command('config')
  .description('Manage swarm configuration');

configCmd
  .command('show')
  .description('Show current configuration')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printConfig(dir);
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/config.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/config.ts packages/cli/tests/commands/config.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm config show command"
```

---

## Task 9: Final Build + Full Test Suite

**Files:**
- No new files

- [ ] **Step 1: Build everything**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

Expected: Both packages compile.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (~120+ tests).

- [ ] **Step 3: Manual smoke test**

```bash
node packages/cli/dist/index.js status .
node packages/cli/dist/index.js history .
node packages/cli/dist/index.js drone list .
node packages/cli/dist/index.js memory show .
node packages/cli/dist/index.js config show .
node packages/cli/dist/index.js run "test the new commands" --no-dashboard
node packages/cli/dist/index.js status .
node packages/cli/dist/index.js history .
```

- [ ] **Step 4: Tag**

```bash
git tag v0.1.1-cli -m "Complete CLI commands"
```
