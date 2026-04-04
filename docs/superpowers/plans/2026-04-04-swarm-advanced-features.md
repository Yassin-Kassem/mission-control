# Swarm Advanced Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add execution modes, mission memory/learning, token budget tracking, mission rollback, self-healing review loops, and integrate all into the orchestration skill — the features that differentiate swarm from every other framework.

**Architecture:** New core modules for token tracking and rollback. CLI `analyze` command gains `--mode` flag. The skill reads mode and adjusts behavior. Memory learns from each mission's outcome. All communication stays file-based via `.swarm/mission/`.

**Tech Stack:** TypeScript, @swarm/core, @swarm/cli, Claude Code plugin skills

---

## File Structure

```
packages/core/src/
├── mission/
│   ├── token-tracker.ts          # Estimate + track token spend per drone
│   └── rollback.ts               # Git-based mission rollback
├── memory/
│   └── mission-learner.ts        # Extract learnings from completed missions

packages/core/tests/
├── mission/
│   ├── token-tracker.test.ts
│   └── rollback.test.ts
├── memory/
│   └── mission-learner.test.ts

packages/cli/src/commands/
├── analyze.ts                    # (modify: add mode to output)
├── rollback.ts                   # swarm rollback <mission-id>
└── budget.ts                     # swarm budget (show token spend)

packages/plugin/skills/swarm-run/
└── SKILL.md                      # (rewrite: integrate all features)
```

---

## Task 1: Token Tracker

Estimates and tracks token usage per drone and per mission.

**Files:**
- Create: `packages/core/src/mission/token-tracker.ts`
- Create: `packages/core/tests/mission/token-tracker.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/mission/token-tracker.test.ts
import { describe, it, expect } from 'vitest';
import { TokenTracker } from '../../src/mission/token-tracker.js';

describe('TokenTracker', () => {
  it('estimates cost for a mission plan', () => {
    const tracker = new TokenTracker();
    const estimate = tracker.estimate([
      { name: 'scout', type: 'tool' },
      { name: 'architect', type: 'ai', model: 'sonnet' },
      { name: 'coder', type: 'ai', model: 'sonnet' },
      { name: 'reviewer', type: 'ai', model: 'haiku' },
    ]);

    expect(estimate.totalTokens).toBeGreaterThan(0);
    expect(estimate.estimatedCost).toBeGreaterThan(0);
    expect(estimate.perDrone).toHaveLength(4);
    expect(estimate.perDrone[0].tokens).toBe(0); // tool drone = 0
    expect(estimate.perDrone[1].tokens).toBeGreaterThan(0); // AI drone > 0
  });

  it('tracks actual usage', () => {
    const tracker = new TokenTracker();
    tracker.recordDrone('scout', 0);
    tracker.recordDrone('architect', 25000);
    tracker.recordDrone('coder', 40000);

    const usage = tracker.getUsage();
    expect(usage.totalTokens).toBe(65000);
    expect(usage.perDrone).toHaveLength(3);
    expect(usage.perDrone[1].name).toBe('architect');
    expect(usage.perDrone[1].tokens).toBe(25000);
  });

  it('warns when budget threshold is reached', () => {
    const tracker = new TokenTracker(100000); // 100k budget
    tracker.recordDrone('architect', 55000);

    expect(tracker.isOverBudget()).toBe(false);
    expect(tracker.isWarning()).toBe(true); // > 50%

    tracker.recordDrone('coder', 50000);
    expect(tracker.isOverBudget()).toBe(true);
  });

  it('formats cost as readable string', () => {
    const tracker = new TokenTracker();
    tracker.recordDrone('coder', 50000);
    const formatted = tracker.formatCost();
    expect(formatted).toContain('$');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/mission/token-tracker.test.ts
```

- [ ] **Step 3: Implement TokenTracker**

```typescript
// packages/core/src/mission/token-tracker.ts

export interface DroneTokenEstimate {
  name: string;
  type: 'ai' | 'tool';
  model?: string;
  tokens: number;
  cost: number;
}

export interface TokenEstimate {
  totalTokens: number;
  estimatedCost: number;
  perDrone: DroneTokenEstimate[];
}

export interface TokenUsage {
  totalTokens: number;
  totalCost: number;
  perDrone: { name: string; tokens: number; cost: number }[];
}

// Approximate tokens per AI drone invocation (input + output)
const MODEL_TOKEN_ESTIMATES: Record<string, number> = {
  opus: 80000,
  sonnet: 40000,
  haiku: 15000,
};

// Cost per million tokens (input + output average)
const MODEL_COST_PER_MILLION: Record<string, number> = {
  opus: 75,    // ~$15 input + $75 output averaged
  sonnet: 18,  // ~$3 input + $15 output averaged
  haiku: 4,    // ~$0.80 input + $4 output averaged
};

export class TokenTracker {
  private recorded: { name: string; tokens: number }[] = [];
  private budget: number;

  constructor(budget = 200000) {
    this.budget = budget;
  }

  estimate(drones: { name: string; type: string; model?: string }[]): TokenEstimate {
    const perDrone: DroneTokenEstimate[] = drones.map((d) => {
      if (d.type === 'tool') {
        return { name: d.name, type: 'tool' as const, tokens: 0, cost: 0 };
      }
      const model = d.model ?? 'sonnet';
      const tokens = MODEL_TOKEN_ESTIMATES[model] ?? 40000;
      const cost = (tokens / 1_000_000) * (MODEL_COST_PER_MILLION[model] ?? 18);
      return { name: d.name, type: 'ai' as const, model, tokens, cost };
    });

    return {
      totalTokens: perDrone.reduce((sum, d) => sum + d.tokens, 0),
      estimatedCost: perDrone.reduce((sum, d) => sum + d.cost, 0),
      perDrone,
    };
  }

  recordDrone(name: string, tokens: number): void {
    this.recorded.push({ name, tokens });
  }

  getUsage(): TokenUsage {
    const perDrone = this.recorded.map((r) => ({
      name: r.name,
      tokens: r.tokens,
      cost: (r.tokens / 1_000_000) * 18, // approximate
    }));
    return {
      totalTokens: perDrone.reduce((sum, d) => sum + d.tokens, 0),
      totalCost: perDrone.reduce((sum, d) => sum + d.cost, 0),
      perDrone,
    };
  }

  isWarning(): boolean {
    return this.getUsage().totalTokens > this.budget * 0.5;
  }

  isOverBudget(): boolean {
    return this.getUsage().totalTokens > this.budget;
  }

  formatCost(): string {
    const usage = this.getUsage();
    return `~${usage.totalTokens.toLocaleString()} tokens ($${usage.totalCost.toFixed(4)})`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/mission/token-tracker.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:
```typescript
export { TokenTracker, type TokenEstimate, type TokenUsage, type DroneTokenEstimate } from './mission/token-tracker.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/mission/token-tracker.ts packages/core/tests/mission/token-tracker.test.ts packages/core/src/index.ts
git commit -m "feat(core): add TokenTracker for mission cost estimation and monitoring"
```

---

## Task 2: Mission Rollback

Git-based rollback to the state before a mission started.

**Files:**
- Create: `packages/core/src/mission/rollback.ts`
- Create: `packages/core/tests/mission/rollback.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/mission/rollback.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionRollback } from '../../src/mission/rollback.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('MissionRollback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-rollback-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'original');
    execSync('git add -A && git commit -m "initial"', { cwd: tmpDir });
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates a snapshot before mission', () => {
    const rb = new MissionRollback(tmpDir);
    const tag = rb.snapshot('m1');
    expect(tag).toBe('swarm-pre-m1');

    const tags = execSync('git tag', { cwd: tmpDir, encoding: 'utf-8' });
    expect(tags).toContain('swarm-pre-m1');
  });

  it('rolls back to pre-mission state', () => {
    const rb = new MissionRollback(tmpDir);
    rb.snapshot('m1');

    // Simulate mission making changes
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed by mission');
    execSync('git add -A && git commit -m "mission change"', { cwd: tmpDir });

    rb.rollback('m1');

    const content = fs.readFileSync(path.join(tmpDir, 'file.txt'), 'utf-8');
    expect(content).toBe('original');
  });

  it('throws if no snapshot exists for mission', () => {
    const rb = new MissionRollback(tmpDir);
    expect(() => rb.rollback('nonexistent')).toThrow('No snapshot');
  });

  it('lists available snapshots', () => {
    const rb = new MissionRollback(tmpDir);
    rb.snapshot('m1');
    rb.snapshot('m2');
    const snapshots = rb.listSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots).toContain('swarm-pre-m1');
    expect(snapshots).toContain('swarm-pre-m2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/mission/rollback.test.ts
```

- [ ] **Step 3: Implement MissionRollback**

```typescript
// packages/core/src/mission/rollback.ts
import { execSync } from 'child_process';

export class MissionRollback {
  constructor(private projectDir: string) {}

  snapshot(missionId: string): string {
    const tag = `swarm-pre-${missionId}`;
    this.git(`tag ${tag}`);
    return tag;
  }

  rollback(missionId: string): void {
    const tag = `swarm-pre-${missionId}`;

    // Verify tag exists
    try {
      this.git(`rev-parse ${tag}`);
    } catch {
      throw new Error(`No snapshot found for mission "${missionId}"`);
    }

    // Reset to the tagged commit
    this.git(`reset --hard ${tag}`);

    // Clean up the tag
    this.git(`tag -d ${tag}`);
  }

  listSnapshots(): string[] {
    const output = this.git('tag -l "swarm-pre-*"');
    return output.split('\n').filter((t) => t.length > 0);
  }

  private git(command: string): string {
    return execSync(`git ${command}`, {
      cwd: this.projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/mission/rollback.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:
```typescript
export { MissionRollback } from './mission/rollback.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/mission/rollback.ts packages/core/tests/mission/rollback.test.ts packages/core/src/index.ts
git commit -m "feat(core): add MissionRollback with git-based snapshots"
```

---

## Task 3: Mission Learner (Cross-Mission Memory)

Extracts learnings from completed missions and writes them to memory.

**Files:**
- Create: `packages/core/src/memory/mission-learner.ts`
- Create: `packages/core/tests/memory/mission-learner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/memory/mission-learner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionLearner } from '../../src/memory/mission-learner.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { SignalStore } from '../../src/signals/signal-store.js';
import { MissionStore } from '../../src/mission/mission-store.js';
import { createDatabase, createSignal, type SwarmDatabase } from '../../src/index.js';

describe('MissionLearner', () => {
  let db: SwarmDatabase;
  let memory: MemoryManager;
  let signals: SignalStore;
  let missions: MissionStore;
  let learner: MissionLearner;

  beforeEach(() => {
    db = createDatabase(':memory:');
    memory = new MemoryManager(db);
    signals = new SignalStore(db);
    missions = new MissionStore(db);
    learner = new MissionLearner(memory, signals, missions);
  });

  afterEach(() => { db.close(); });

  it('records project info to working memory after scout', () => {
    missions.create('m1', 'build auth');
    signals.save(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.done',
      severity: 'info', missionId: 'm1',
      payload: { drone: 'scout', summary: 'Scanned 50 files', languages: ['typescript'], frameworks: ['express'] },
    }));

    learner.learnFromMission('m1');

    expect(memory.working.get('project.languages')).toBe('typescript');
    expect(memory.working.get('project.frameworks')).toBe('express');
  });

  it('records mission outcome patterns', () => {
    missions.create('m1', 'fix login bug');
    missions.complete('m1', 'All drones completed');

    learner.learnFromMission('m1');

    expect(memory.working.get('pattern.last-mission-status')).toBe('completed');
  });

  it('tracks scope accuracy over time', () => {
    // Mission claimed as "small" but used many drones
    missions.create('m1', 'small fix');
    signals.save(createSignal({ type: 'progress', source: 'scout', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'scout' } }));
    signals.save(createSignal({ type: 'progress', source: 'architect', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'architect' } }));
    signals.save(createSignal({ type: 'progress', source: 'coder', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'coder' } }));
    signals.save(createSignal({ type: 'progress', source: 'tester', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'tester' } }));
    signals.save(createSignal({ type: 'progress', source: 'reviewer', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'reviewer' } }));
    missions.complete('m1', 'done');

    learner.learnFromMission('m1');

    const droneCount = memory.working.get('pattern.last-drone-count');
    expect(droneCount).toBe('5');
  });

  it('records failure patterns to long-term memory', () => {
    missions.create('m1', 'deploy to prod');
    signals.save(createSignal({
      type: 'progress', source: 'coder', topic: 'drone.failed',
      severity: 'critical', missionId: 'm1',
      payload: { drone: 'coder', error: 'context limit exceeded' },
    }));
    missions.complete('m1', 'Completed with failures: coder');

    learner.learnFromMission('m1');

    expect(memory.long.get('correction.coder-failed')).toContain('context limit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/memory/mission-learner.test.ts
```

- [ ] **Step 3: Implement MissionLearner**

```typescript
// packages/core/src/memory/mission-learner.ts
import type { MemoryManager } from './memory-manager.js';
import type { SignalStore } from '../signals/signal-store.js';
import type { MissionStore } from '../mission/mission-store.js';

export class MissionLearner {
  constructor(
    private memory: MemoryManager,
    private signals: SignalStore,
    private missions: MissionStore,
  ) {}

  learnFromMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const missionSignals = this.signals.getByMission(missionId);

    // Learn project info from scout
    const scoutDone = missionSignals.find(
      (s) => s.topic === 'drone.done' && s.payload.drone === 'scout',
    );
    if (scoutDone) {
      const langs = scoutDone.payload.languages;
      if (Array.isArray(langs) && langs.length > 0) {
        this.memory.working.set('project.languages', langs.join(', '));
      }
      const frameworks = scoutDone.payload.frameworks;
      if (Array.isArray(frameworks) && frameworks.length > 0) {
        this.memory.working.set('project.frameworks', frameworks.join(', '));
      }
    }

    // Record mission outcome pattern
    this.memory.working.set('pattern.last-mission-status', mission.status);
    this.memory.working.set('pattern.last-mission-description', mission.description);

    // Count drones used
    const dronesDone = missionSignals.filter(
      (s) => s.topic === 'drone.done' || s.topic === 'drone.failed',
    );
    this.memory.working.set('pattern.last-drone-count', String(dronesDone.length));

    // Learn from failures — persist to long-term
    const failures = missionSignals.filter((s) => s.topic === 'drone.failed');
    for (const failure of failures) {
      const drone = failure.payload.drone as string;
      const error = failure.payload.error as string;
      this.memory.long.set(
        `correction.${drone}-failed`,
        `${drone} failed: ${error}. Consider adjusting scope or splitting task.`,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/memory/mission-learner.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:
```typescript
export { MissionLearner } from './memory/mission-learner.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/memory/mission-learner.ts packages/core/tests/memory/mission-learner.test.ts packages/core/src/index.ts
git commit -m "feat(core): add MissionLearner for cross-mission memory"
```

---

## Task 4: CLI Budget Command + Analyze Mode

**Files:**
- Create: `packages/cli/src/commands/budget.ts`
- Create: `packages/cli/tests/commands/budget.test.ts`
- Modify: `packages/cli/src/commands/analyze.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write failing test for budget**

```typescript
// packages/cli/tests/commands/budget.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getMissionBudget } from '../../src/commands/budget.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import { createSignal } from '@swarm/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getMissionBudget', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-budget-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns token summary for past missions', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test');
    ctx.signalStore.save(createSignal({
      type: 'progress', source: 'coder', topic: 'drone.done',
      severity: 'info', payload: { drone: 'coder' }, missionId: 'm1',
    }));
    ctx.missionStore.complete('m1', 'done');
    ctx.close();

    const budget = getMissionBudget(tmpDir);
    expect(budget.totalMissions).toBe(1);
    expect(budget.totalSignals).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement budget command**

```typescript
// packages/cli/src/commands/budget.ts
import { loadProjectContext } from '../context.js';

export interface BudgetSummary {
  totalMissions: number;
  totalSignals: number;
  recentMissions: { id: string; description: string; signalCount: number; status: string }[];
}

export function getMissionBudget(projectDir: string): BudgetSummary {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(10);

  const recentMissions = missions.map((m) => {
    const signals = ctx.signalStore.getByMission(m.id);
    return {
      id: m.id,
      description: m.description,
      signalCount: signals.length,
      status: m.status,
    };
  });

  const totalSignals = recentMissions.reduce((sum, m) => sum + m.signalCount, 0);
  ctx.close();

  return {
    totalMissions: missions.length,
    totalSignals,
    recentMissions,
  };
}

export function printBudget(projectDir: string): void {
  const budget = getMissionBudget(projectDir);
  console.log(JSON.stringify(budget, null, 2));
}
```

- [ ] **Step 3: Add mode to analyze output**

Modify `packages/cli/src/commands/analyze.ts` — add `mode` field to `AnalysisResult` and accept an optional mode parameter:

Add to the `AnalysisResult` interface:
```typescript
  mode: string;
```

Add mode parameter to `analyzeMission`:
```typescript
export function analyzeMission(description: string, projectDir: string, mode = 'copilot'): AnalysisResult {
```

Add `mode` to the return object:
```typescript
  return {
    missionId,
    mode,
    intent: profile.intent,
    // ... rest unchanged
  };
```

Update `printAnalysis` to accept mode:
```typescript
export function printAnalysis(description: string, projectDir: string, mode = 'copilot'): void {
  const result = analyzeMission(description, projectDir, mode);
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Add budget + mode flag to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printBudget } from './commands/budget.js';
```

Add budget command:
```typescript
program
  .command('budget')
  .description('Show token usage summary')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printBudget(dir);
  });
```

Update analyze command to accept `--mode`:
```typescript
program
  .command('analyze')
  .description('Analyze a task and output structured plan (JSON)')
  .argument('<description>', 'Task description')
  .option('--mode <mode>', 'Execution mode (autopilot|copilot|stepwise|blitz|solo)', 'copilot')
  .action((description: string, options) => {
    printAnalysis(description, process.cwd(), options.mode);
  });
```

- [ ] **Step 5: Build and test**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/budget.ts packages/cli/tests/commands/budget.test.ts packages/cli/src/commands/analyze.ts packages/cli/src/index.ts
git commit -m "feat(cli): add budget command and execution mode to analyze"
```

---

## Task 5: CLI Rollback Command

**Files:**
- Create: `packages/cli/src/commands/rollback.ts`
- Create: `packages/cli/tests/commands/rollback.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/cli/tests/commands/rollback.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSnapshot, rollbackMission, listSnapshots } from '../../src/commands/rollback.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('rollback commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-rb-cmd-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'original');
    execSync('git add -A && git commit -m "initial"', { cwd: tmpDir });
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates and lists snapshots', () => {
    createSnapshot('m1', tmpDir);
    const snaps = listSnapshots(tmpDir);
    expect(snaps).toContain('swarm-pre-m1');
  });

  it('rolls back changes', () => {
    createSnapshot('m1', tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
    execSync('git add -A && git commit -m "change"', { cwd: tmpDir });

    rollbackMission('m1', tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'file.txt'), 'utf-8');
    expect(content).toBe('original');
  });
});
```

- [ ] **Step 2: Implement rollback command**

```typescript
// packages/cli/src/commands/rollback.ts
import { MissionRollback } from '@swarm/core';

export function createSnapshot(missionId: string, projectDir: string): string {
  const rb = new MissionRollback(projectDir);
  return rb.snapshot(missionId);
}

export function rollbackMission(missionId: string, projectDir: string): void {
  const rb = new MissionRollback(projectDir);
  rb.rollback(missionId);
}

export function listSnapshots(projectDir: string): string[] {
  const rb = new MissionRollback(projectDir);
  return rb.listSnapshots();
}

export function printSnapshots(projectDir: string): void {
  const snaps = listSnapshots(projectDir);
  if (snaps.length === 0) {
    console.log('No mission snapshots found.');
    return;
  }
  console.log(`Mission Snapshots (${snaps.length}):\n`);
  for (const s of snaps) {
    console.log(`  ${s}`);
  }
}
```

- [ ] **Step 3: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { rollbackMission, printSnapshots } from './commands/rollback.js';

program
  .command('rollback')
  .description('Roll back to the state before a mission')
  .argument('<mission-id>', 'Mission ID to roll back')
  .action((missionId: string) => {
    rollbackMission(missionId, process.cwd());
    console.log(`Rolled back to pre-mission state: ${missionId}`);
  });

program
  .command('snapshots')
  .description('List available mission snapshots')
  .action(() => {
    printSnapshots(process.cwd());
  });
```

- [ ] **Step 4: Build and test**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/rollback.ts packages/cli/tests/commands/rollback.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add rollback and snapshots commands"
```

---

## Task 6: Update Orchestration Skill with All Features

This is the final task — rewrite the plugin skill to integrate execution modes, token budgets, rollback, mission memory, and self-healing review.

**Files:**
- Modify: `packages/plugin/skills/swarm-run/SKILL.md`

- [ ] **Step 1: Rewrite the skill**

Replace `packages/plugin/skills/swarm-run/SKILL.md` with the full version that integrates all features. The skill must include:

1. **Mode selection** — Ask user which mode (autopilot/copilot/stepwise/blitz/solo) or default to copilot
2. **Pre-mission snapshot** — Create git snapshot before any changes
3. **Token budget display** — Show estimated cost before starting
4. **Scout + memory check** — Read previous learnings before dispatching
5. **Architect + plan** — Write design and step-by-step plan to file
6. **Coder follows plan** — Subagent reads plan file, implements
7. **Self-healing test loop** — If tests fail, dispatch fix subagent automatically
8. **Review loop** — If reviewer finds issues, dispatch fix subagent
9. **Mission learning** — After completion, record learnings
10. **Rollback offer** — If mission failed, offer to roll back

The full skill content:

```markdown
---
name: swarm-run
description: Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-drone execution with the swarm framework
---

# Swarm Mission Runner

Orchestrate a mission using the Swarm framework. Each AI drone runs as an isolated subagent. Drones communicate through files in `.swarm/mission/`. The parent (you) stays lean.

## How to Run Swarm Commands

```
SWARM="bash ${CLAUDE_PLUGIN_ROOT}/bin/swarm"
```

If `CLAUDE_PLUGIN_ROOT` is unset:
```bash
SWARM_ROOT="$(find ~/.claude/plugins -path '*/swarm/bin/swarm' -print -quit 2>/dev/null | xargs dirname | xargs dirname)"
SWARM="bash ${CLAUDE_PLUGIN_ROOT:-$SWARM_ROOT}/bin/swarm"
```

**NEVER:** `npx swarm`, `node .../bin/swarm`, `swarm` directly.

## Step 1: Analyze + Choose Mode

```bash
$SWARM analyze "$ARGUMENTS" --mode <mode>
mkdir -p .swarm/mission
$SWARM analyze "$ARGUMENTS" > .swarm/mission/analysis.json
```

Parse the JSON. Present to user:

> **Mission: [description]**
> Intent: [intent] | Scope: [scope] | Est. tokens: [N]
> Drones: [list]
>
> **Execution mode?**
> 1. **Copilot** (default) — pauses for approval after design and after coding
> 2. **Autopilot** — runs all drones without stopping
> 3. **Step-by-step** — pauses after every drone
> 4. **Blitz** — parallel where possible, fastest
> 5. **Solo** — no subagents, you do everything inline

If user doesn't pick, default to **copilot**. For **trivial/small scope**, always use **solo** regardless of choice.

## Step 2: Pre-Mission Snapshot

Create a git checkpoint before any changes:
```bash
$SWARM rollback snapshot <mission-id> 2>/dev/null || true
```

This lets the user roll back if anything goes wrong.

## Step 3: Check Mission Memory

```bash
$SWARM memory show
```

Read any previous learnings. If memory contains relevant info (e.g., "project uses Prisma", "user prefers minimal comments"), include it in subagent prompts.

## Step 4: Scout (tool drone)

```bash
$SWARM drone exec scout > .swarm/mission/scout.json
```

## Step 5: Architect + Plan (subagent)

**Skip for trivial/small scope or solo mode.**

```
Agent tool:
  description: "Architect drone: design + plan"
  model: sonnet
  prompt: |
    You are the Architect drone.
    TASK: [user's request]

    Read .swarm/mission/scout.json for project context.

    1. Design the solution (approach, file structure, data flow)
    2. Write a step-by-step implementation plan

    Write to .swarm/mission/plan.md:
    ## Design
    [2-3 sentences]

    ## Plan
    - [ ] Step 1: [action with exact file path]
    - [ ] Step 2: [action with exact file path]
    ...

    ## Files
    - Create: [paths]
    - Modify: [paths]

    Report: "Plan written to .swarm/mission/plan.md" + one-line summary.
```

**Copilot/Step-by-step mode:** Show plan to user. Wait for approval.
**Autopilot/Blitz mode:** Continue immediately.

## Step 6: Coder (subagent)

```
Agent tool:
  description: "Coder drone: implement plan"
  model: sonnet
  prompt: |
    You are the Coder drone.
    TASK: [user's request]

    Read:
    - .swarm/mission/scout.json (project structure)
    - .swarm/mission/plan.md (plan to follow)

    Follow the plan step by step. Write clean code. Match existing patterns.
    Write tests alongside your code.

    Test commands:
    - Package files: `pnpm test`
    - Root files: `pnpm exec vitest run tests/<file>.test.ts`
    - NEVER: npx vitest, turbo test, node_modules/.bin/vitest

    Write summary to .swarm/mission/coder.md.
    Report: "Implementation complete" + files list.
```

**Copilot mode:** Show changes to user after coder finishes.

## Step 7: Test + Self-Healing Loop

Run tool tester:
```bash
$SWARM drone exec tester > .swarm/mission/tester.json
```

**If tests fail:** Dispatch a fix subagent automatically (max 2 retries):

```
Agent tool:
  description: "Fix failing tests (retry N)"
  model: sonnet
  prompt: |
    Tests are failing. Read:
    - .swarm/mission/tester.json (test output)
    - .swarm/mission/coder.md (what was changed)

    Fix the issue. Run tests: `pnpm test` or `pnpm exec vitest run tests/<file>.test.ts`
    Report: what was wrong and what you fixed.
```

Re-run tester after fix. If still failing after 2 retries, report to user.

## Step 8: Security (tool drone)

```bash
$SWARM drone exec security > .swarm/mission/security.json
```

## Step 9: Review + Self-Healing Loop

```
Agent tool:
  description: "Reviewer drone"
  model: haiku
  prompt: |
    Review changes for this mission. Read:
    - .swarm/mission/plan.md (intended design)
    - .swarm/mission/coder.md (what was implemented)
    Run: `git diff HEAD~5` to see changes.

    Write findings to .swarm/mission/reviewer.md.
    Report: "clean" or list of issues.
```

**If reviewer finds issues:** Dispatch fix subagent:

```
Agent tool:
  description: "Fix review issues"
  model: sonnet
  prompt: |
    The reviewer found issues. Read .swarm/mission/reviewer.md.
    Fix each issue. Report what you fixed.
```

Re-run reviewer after fix. Max 1 retry.

## Step 10: Learn + Report

Record learnings:
```bash
$SWARM memory show  # Check what was learned
```

Write to `.swarm/mission/` any learnings that should persist (the memory promoter will handle promotion).

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

Tokens used: ~[N] ($[cost])
Snapshot: swarm-pre-[mission-id] (run `swarm rollback [id]` to undo)
```

**If mission had failures, offer:**
> Mission had issues. Run `swarm rollback [mission-id]` to undo all changes?

## Mode Behaviors Summary

| Mode | Architect pause | Coder pause | Self-heal | Parallel |
|------|----------------|-------------|-----------|----------|
| Solo | — | — | No | No |
| Copilot | Yes | Yes | Yes | No |
| Autopilot | No | No | Yes | No |
| Step-by-step | Yes | Yes | Yes (ask) | No |
| Blitz | No | No | Yes | Yes (independent drones) |

## Running Tests

**Package files:** `pnpm test`
**Root files:** `pnpm exec vitest run tests/<file>.test.ts`
**NEVER:** `npx vitest`, `vitest run`, `turbo test`

## Token Efficiency

1. Parent stays lean — dispatch + collect status only
2. Subagents read files, not parent context
3. Subagent results: one-line status, not full code
4. Use cheapest model: architect/coder=sonnet, reviewer/docs=haiku, debugger=opus
5. Trivial/small scope = solo mode, no subagents
6. Max 4 AI subagents per mission
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/skills/swarm-run/SKILL.md
git commit -m "feat(plugin): integrate execution modes, rollback, budget, memory, self-healing into skill"
```

---

## Task 7: Build + Test + Tag

- [ ] **Step 1: Build**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (~175+).

- [ ] **Step 3: Tag**

```bash
git tag v0.4.0-advanced -m "Execution modes, mission memory, rollback, token tracking, self-healing"
```
