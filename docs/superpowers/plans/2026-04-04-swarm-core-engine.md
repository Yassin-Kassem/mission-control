# Swarm Core Engine + CLI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core orchestration engine and CLI that powers the swarm framework — signal bus, layered memory, drone system, mission runner, context analyzer, failure recovery, and CLI commands with a live dashboard server.

**Architecture:** Monorepo with pnpm workspaces and Turborepo. The `@swarm/core` package contains all engine logic (zero external runtime deps beyond SQLite). The `@swarm/cli` package wraps core with Commander.js commands and a WebSocket-based dashboard server. Everything is TypeScript strict mode, tested with Vitest.

**Tech Stack:** TypeScript, Node.js, pnpm, Turborepo, Commander.js, better-sqlite3, ws (WebSocket), Vitest, ESLint, Prettier

---

## File Structure

```
claude-orchestrator/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── signals/
│   │   │   │   ├── signal.ts              # Signal interface + type guards
│   │   │   │   ├── signal-bus.ts          # EventEmitter-based bus
│   │   │   │   └── signal-store.ts        # SQLite persistence for signals
│   │   │   ├── memory/
│   │   │   │   ├── memory-entry.ts        # MemoryEntry interface + types
│   │   │   │   ├── memory-layer.ts        # Single layer (short/working/long)
│   │   │   │   ├── memory-manager.ts      # Three-layer coordinator
│   │   │   │   └── memory-promoter.ts     # Auto-promotion logic
│   │   │   ├── drones/
│   │   │   │   ├── drone-manifest.ts      # Manifest schema + parser
│   │   │   │   ├── drone-registry.ts      # Load, enable/disable, lookup
│   │   │   │   └── drone-runner.ts        # Lifecycle: activate → run → done/fail
│   │   │   ├── analyzer/
│   │   │   │   ├── situation-profile.ts   # SituationProfile interface
│   │   │   │   ├── intent-classifier.ts   # Classify user request intent
│   │   │   │   ├── scope-detector.ts      # Detect task scope (trivial→epic)
│   │   │   │   ├── project-scanner.ts     # Scan project for languages/frameworks/etc
│   │   │   │   └── context-analyzer.ts    # Orchestrates analysis, recommends drones
│   │   │   ├── mission/
│   │   │   │   ├── mission.ts             # Mission interface + states
│   │   │   │   ├── mission-planner.ts     # Plan drone ordering + parallelism
│   │   │   │   ├── mission-runner.ts      # Execute mission lifecycle
│   │   │   │   └── mission-store.ts       # SQLite persistence for missions
│   │   │   ├── recovery/
│   │   │   │   ├── checkpoint.ts          # Checkpoint interface + serialization
│   │   │   │   ├── checkpoint-manager.ts  # Create/restore checkpoints
│   │   │   │   ├── escalation.ts          # Tier 2 supervisor logic
│   │   │   │   └── consensus.ts           # Tier 3 conflict resolution
│   │   │   ├── db.ts                      # SQLite connection + schema init
│   │   │   └── index.ts                   # Public API barrel export
│   │   ├── tests/
│   │   │   ├── signals/
│   │   │   │   ├── signal-bus.test.ts
│   │   │   │   └── signal-store.test.ts
│   │   │   ├── memory/
│   │   │   │   ├── memory-layer.test.ts
│   │   │   │   ├── memory-manager.test.ts
│   │   │   │   └── memory-promoter.test.ts
│   │   │   ├── drones/
│   │   │   │   ├── drone-manifest.test.ts
│   │   │   │   ├── drone-registry.test.ts
│   │   │   │   └── drone-runner.test.ts
│   │   │   ├── analyzer/
│   │   │   │   ├── intent-classifier.test.ts
│   │   │   │   ├── scope-detector.test.ts
│   │   │   │   ├── project-scanner.test.ts
│   │   │   │   └── context-analyzer.test.ts
│   │   │   ├── mission/
│   │   │   │   ├── mission-planner.test.ts
│   │   │   │   ├── mission-runner.test.ts
│   │   │   │   └── mission-store.test.ts
│   │   │   └── recovery/
│   │   │       ├── checkpoint-manager.test.ts
│   │   │       ├── escalation.test.ts
│   │   │       └── consensus.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── cli/
│       ├── src/
│       │   ├── commands/
│       │   │   ├── run.ts                 # swarm run
│       │   │   ├── status.ts              # swarm status
│       │   │   ├── pause-resume.ts        # swarm pause / resume
│       │   │   ├── checkpoint.ts          # swarm checkpoint
│       │   │   ├── history.ts             # swarm history
│       │   │   ├── replay.ts              # swarm replay
│       │   │   ├── drone.ts               # swarm drone (list/add/remove/create/enable/disable/publish)
│       │   │   ├── memory.ts              # swarm memory (show/promote/forget/export/import)
│       │   │   ├── marketplace.ts         # swarm marketplace (search/trending/list)
│       │   │   ├── init.ts                # swarm init
│       │   │   └── config.ts              # swarm config (show/share)
│       │   ├── dashboard/
│       │   │   ├── server.ts              # HTTP + WebSocket server
│       │   │   └── broadcaster.ts         # Signal → WebSocket relay
│       │   └── index.ts                   # CLI entry point, Commander setup
│       ├── tests/
│       │   ├── commands/
│       │   │   ├── run.test.ts
│       │   │   ├── drone.test.ts
│       │   │   ├── memory.test.ts
│       │   │   └── init.test.ts
│       │   └── dashboard/
│       │       ├── server.test.ts
│       │       └── broadcaster.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
│
├── package.json                           # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── .eslintrc.json
├── .prettierrc
└── .gitignore
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `turbo.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/vitest.config.ts`

- [ ] **Step 1: Initialize git repo**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "swarm-framework",
  "version": "0.0.1",
  "private": true,
  "description": "Adaptive Claude Code orchestration framework",
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 5: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 6: Create .eslintrc.json**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

- [ ] **Step 7: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 8: Create .gitignore**

```gitignore
node_modules/
dist/
*.tsbuildinfo
.swarm/memory.db
.swarm/checkpoints/
.env
.env.local
coverage/
```

- [ ] **Step 9: Create packages/core/package.json**

```json
{
  "name": "@swarm/core",
  "version": "0.0.1",
  "description": "Swarm framework core engine",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.0.0",
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 10: Create packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 11: Create packages/core/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 12: Create packages/cli/package.json**

```json
{
  "name": "@swarm/cli",
  "version": "0.0.1",
  "description": "Swarm framework CLI",
  "type": "module",
  "bin": {
    "swarm": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@swarm/core": "workspace:*",
    "commander": "^13.0.0",
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.0.0",
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 13: Create packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../core" }
  ]
}
```

- [ ] **Step 14: Create packages/cli/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 15: Install dependencies and verify**

```bash
pnpm install
pnpm build
```

Expected: Install succeeds. Build may warn about missing source files — that's fine at this stage.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with core and cli packages"
```

---

## Task 2: SQLite Database Layer

**Files:**
- Create: `packages/core/src/db.ts`
- Create: `packages/core/tests/db.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/db.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase, type SwarmDatabase } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SwarmDatabase', () => {
  const testDbPath = path.join(os.tmpdir(), `swarm-test-${Date.now()}.db`);
  let db: SwarmDatabase;

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('creates database with all tables', () => {
    db = createDatabase(testDbPath);

    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('signals');
    expect(tableNames).toContain('memory');
    expect(tableNames).toContain('missions');
    expect(tableNames).toContain('checkpoints');
  });

  it('creates in-memory database when no path given', () => {
    db = createDatabase(':memory:');

    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    expect(tables.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/db.test.ts
```

Expected: FAIL — module `../src/db.js` not found.

- [ ] **Step 3: Write the implementation**

```typescript
// packages/core/src/db.ts
import Database from 'better-sqlite3';

export interface SwarmDatabase {
  raw: Database.Database;
  close(): void;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    topic TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    payload TEXT NOT NULL DEFAULT '{}',
    mission_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer TEXT NOT NULL CHECK(layer IN ('short', 'working', 'long')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    mission_id TEXT,
    UNIQUE(layer, key)
  );

  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    phase TEXT NOT NULL DEFAULT 'analyze',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER,
    result TEXT
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    label TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_signals_mission ON signals(mission_id);
  CREATE INDEX IF NOT EXISTS idx_signals_topic ON signals(topic);
  CREATE INDEX IF NOT EXISTS idx_memory_layer ON memory(layer);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_mission ON checkpoints(mission_id);
`;

export function createDatabase(dbPath: string): SwarmDatabase {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  return {
    raw: db,
    close() {
      db.close();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/db.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/db.ts packages/core/tests/db.test.ts
git commit -m "feat(core): add SQLite database layer with schema"
```

---

## Task 3: Signal Types & Signal Bus

**Files:**
- Create: `packages/core/src/signals/signal.ts`
- Create: `packages/core/src/signals/signal-bus.ts`
- Create: `packages/core/tests/signals/signal-bus.test.ts`

- [ ] **Step 1: Write signal types**

```typescript
// packages/core/src/signals/signal.ts
export type SignalType = 'finding' | 'decision' | 'question' | 'warning' | 'progress';
export type SignalSeverity = 'info' | 'warning' | 'critical';

export interface Signal {
  type: SignalType;
  source: string;
  topic: string;
  severity: SignalSeverity;
  payload: Record<string, unknown>;
  timestamp: number;
  missionId: string;
}

export function createSignal(
  partial: Omit<Signal, 'timestamp'> & { timestamp?: number },
): Signal {
  return {
    ...partial,
    timestamp: partial.timestamp ?? Date.now(),
  };
}

export function isSignal(value: unknown): value is Signal {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.missionId === 'string' &&
    typeof obj.timestamp === 'number'
  );
}
```

- [ ] **Step 2: Write the failing test for SignalBus**

```typescript
// packages/core/tests/signals/signal-bus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SignalBus } from '../../src/signals/signal-bus.js';
import { createSignal, type Signal } from '../../src/signals/signal.js';

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return createSignal({
    type: 'finding',
    source: 'test-drone',
    topic: 'test.event',
    severity: 'info',
    payload: {},
    missionId: 'mission-1',
    ...overrides,
  });
}

describe('SignalBus', () => {
  it('emits signals to topic subscribers', () => {
    const bus = new SignalBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    const signal = makeSignal();
    bus.emit(signal);

    expect(handler).toHaveBeenCalledWith(signal);
  });

  it('emits signals to wildcard subscribers', () => {
    const bus = new SignalBus();
    const handler = vi.fn();

    bus.on('*', handler);
    bus.emit(makeSignal({ topic: 'any.topic' }));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('emits signals to prefix subscribers', () => {
    const bus = new SignalBus();
    const handler = vi.fn();

    bus.on('vuln.*', handler);
    bus.emit(makeSignal({ topic: 'vuln.found' }));
    bus.emit(makeSignal({ topic: 'vuln.fixed' }));
    bus.emit(makeSignal({ topic: 'design.proposed' }));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('stores emitted signals in history', () => {
    const bus = new SignalBus();

    bus.emit(makeSignal({ topic: 'a' }));
    bus.emit(makeSignal({ topic: 'b' }));

    expect(bus.history()).toHaveLength(2);
    expect(bus.history()[0].topic).toBe('a');
  });

  it('filters history by mission', () => {
    const bus = new SignalBus();

    bus.emit(makeSignal({ missionId: 'm1', topic: 'a' }));
    bus.emit(makeSignal({ missionId: 'm2', topic: 'b' }));

    expect(bus.history('m1')).toHaveLength(1);
    expect(bus.history('m1')[0].topic).toBe('a');
  });

  it('removes subscriber with off()', () => {
    const bus = new SignalBus();
    const handler = vi.fn();

    bus.on('test.event', handler);
    bus.off('test.event', handler);
    bus.emit(makeSignal());

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all history', () => {
    const bus = new SignalBus();
    bus.emit(makeSignal());
    bus.clearHistory();
    expect(bus.history()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/signals/signal-bus.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement SignalBus**

```typescript
// packages/core/src/signals/signal-bus.ts
import type { Signal } from './signal.js';

type SignalHandler = (signal: Signal) => void;

export class SignalBus {
  private subscribers = new Map<string, Set<SignalHandler>>();
  private signals: Signal[] = [];

  on(topicPattern: string, handler: SignalHandler): void {
    if (!this.subscribers.has(topicPattern)) {
      this.subscribers.set(topicPattern, new Set());
    }
    this.subscribers.get(topicPattern)!.add(handler);
  }

  off(topicPattern: string, handler: SignalHandler): void {
    this.subscribers.get(topicPattern)?.delete(handler);
  }

  emit(signal: Signal): void {
    this.signals.push(signal);

    for (const [pattern, handlers] of this.subscribers) {
      if (this.matches(signal.topic, pattern)) {
        for (const handler of handlers) {
          handler(signal);
        }
      }
    }
  }

  history(missionId?: string): Signal[] {
    if (missionId) {
      return this.signals.filter((s) => s.missionId === missionId);
    }
    return [...this.signals];
  }

  clearHistory(): void {
    this.signals = [];
  }

  private matches(topic: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return topic.startsWith(prefix + '.') || topic === prefix;
    }
    return topic === pattern;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/signals/signal-bus.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/signals/ packages/core/tests/signals/
git commit -m "feat(core): add Signal types and SignalBus with topic matching"
```

---

## Task 4: Signal Store (SQLite Persistence)

**Files:**
- Create: `packages/core/src/signals/signal-store.ts`
- Create: `packages/core/tests/signals/signal-store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/signals/signal-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignalStore } from '../../src/signals/signal-store.js';
import { createSignal } from '../../src/signals/signal.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('SignalStore', () => {
  let db: SwarmDatabase;
  let store: SignalStore;

  beforeEach(() => {
    db = createDatabase(':memory:');
    store = new SignalStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('saves and retrieves signals by mission', () => {
    const signal = createSignal({
      type: 'finding',
      source: 'scout',
      topic: 'file.found',
      severity: 'info',
      payload: { path: '/src/app.ts' },
      missionId: 'm1',
    });

    store.save(signal);
    const results = store.getByMission('m1');

    expect(results).toHaveLength(1);
    expect(results[0].topic).toBe('file.found');
    expect(results[0].payload).toEqual({ path: '/src/app.ts' });
  });

  it('retrieves signals by topic', () => {
    store.save(createSignal({ type: 'finding', source: 'a', topic: 'vuln.found', severity: 'critical', payload: {}, missionId: 'm1' }));
    store.save(createSignal({ type: 'progress', source: 'b', topic: 'scan.done', severity: 'info', payload: {}, missionId: 'm1' }));

    const results = store.getByTopic('vuln.found');
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('critical');
  });

  it('saves multiple signals in batch', () => {
    const signals = [
      createSignal({ type: 'finding', source: 'a', topic: 't1', severity: 'info', payload: {}, missionId: 'm1' }),
      createSignal({ type: 'finding', source: 'b', topic: 't2', severity: 'info', payload: {}, missionId: 'm1' }),
    ];

    store.saveBatch(signals);
    expect(store.getByMission('m1')).toHaveLength(2);
  });

  it('deletes signals by mission', () => {
    store.save(createSignal({ type: 'finding', source: 'a', topic: 't1', severity: 'info', payload: {}, missionId: 'm1' }));
    store.save(createSignal({ type: 'finding', source: 'a', topic: 't2', severity: 'info', payload: {}, missionId: 'm2' }));

    store.deleteByMission('m1');

    expect(store.getByMission('m1')).toHaveLength(0);
    expect(store.getByMission('m2')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/signals/signal-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SignalStore**

```typescript
// packages/core/src/signals/signal-store.ts
import type { SwarmDatabase } from '../db.js';
import type { Signal } from './signal.js';

export class SignalStore {
  constructor(private db: SwarmDatabase) {}

  save(signal: Signal): void {
    this.db.raw
      .prepare(
        `INSERT INTO signals (type, source, topic, severity, payload, mission_id, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        signal.type,
        signal.source,
        signal.topic,
        signal.severity,
        JSON.stringify(signal.payload),
        signal.missionId,
        signal.timestamp,
      );
  }

  saveBatch(signals: Signal[]): void {
    const insert = this.db.raw.prepare(
      `INSERT INTO signals (type, source, topic, severity, payload, mission_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    const tx = this.db.raw.transaction((items: Signal[]) => {
      for (const s of items) {
        insert.run(s.type, s.source, s.topic, s.severity, JSON.stringify(s.payload), s.missionId, s.timestamp);
      }
    });

    tx(signals);
  }

  getByMission(missionId: string): Signal[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM signals WHERE mission_id = ? ORDER BY timestamp ASC')
      .all(missionId) as SignalRow[];

    return rows.map(rowToSignal);
  }

  getByTopic(topic: string): Signal[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM signals WHERE topic = ? ORDER BY timestamp ASC')
      .all(topic) as SignalRow[];

    return rows.map(rowToSignal);
  }

  deleteByMission(missionId: string): void {
    this.db.raw.prepare('DELETE FROM signals WHERE mission_id = ?').run(missionId);
  }
}

interface SignalRow {
  id: number;
  type: string;
  source: string;
  topic: string;
  severity: string;
  payload: string;
  mission_id: string;
  timestamp: number;
}

function rowToSignal(row: SignalRow): Signal {
  return {
    type: row.type as Signal['type'],
    source: row.source,
    topic: row.topic,
    severity: row.severity as Signal['severity'],
    payload: JSON.parse(row.payload),
    missionId: row.mission_id,
    timestamp: row.timestamp,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/signals/signal-store.test.ts
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/signals/signal-store.ts packages/core/tests/signals/signal-store.test.ts
git commit -m "feat(core): add SignalStore for SQLite signal persistence"
```

---

## Task 5: Memory Entry Types & Memory Layer

**Files:**
- Create: `packages/core/src/memory/memory-entry.ts`
- Create: `packages/core/src/memory/memory-layer.ts`
- Create: `packages/core/tests/memory/memory-layer.test.ts`

- [ ] **Step 1: Write memory types**

```typescript
// packages/core/src/memory/memory-entry.ts
export type MemoryLayerName = 'short' | 'working' | 'long';

export interface MemoryEntry {
  id?: number;
  layer: MemoryLayerName;
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  missionId?: string;
}

export function createMemoryEntry(
  partial: Omit<MemoryEntry, 'createdAt' | 'updatedAt' | 'id'> & {
    createdAt?: number;
    updatedAt?: number;
  },
): MemoryEntry {
  const now = Date.now();
  return {
    ...partial,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}
```

- [ ] **Step 2: Write the failing test for MemoryLayer**

```typescript
// packages/core/tests/memory/memory-layer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryLayer } from '../../src/memory/memory-layer.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryLayer', () => {
  let db: SwarmDatabase;
  let layer: MemoryLayer;

  beforeEach(() => {
    db = createDatabase(':memory:');
    layer = new MemoryLayer(db, 'working');
  });

  afterEach(() => {
    db.close();
  });

  it('sets and gets a value', () => {
    layer.set('project.language', 'typescript');
    expect(layer.get('project.language')).toBe('typescript');
  });

  it('returns undefined for missing keys', () => {
    expect(layer.get('nonexistent')).toBeUndefined();
  });

  it('overwrites existing values', () => {
    layer.set('project.language', 'typescript');
    layer.set('project.language', 'python');
    expect(layer.get('project.language')).toBe('python');
  });

  it('deletes a value', () => {
    layer.set('key', 'value');
    layer.delete('key');
    expect(layer.get('key')).toBeUndefined();
  });

  it('lists all entries', () => {
    layer.set('a', '1');
    layer.set('b', '2');
    const entries = layer.list();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.key).sort()).toEqual(['a', 'b']);
  });

  it('searches entries by key prefix', () => {
    layer.set('project.language', 'ts');
    layer.set('project.framework', 'next');
    layer.set('user.name', 'yassin');

    const results = layer.search('project.');
    expect(results).toHaveLength(2);
  });

  it('clears all entries', () => {
    layer.set('a', '1');
    layer.set('b', '2');
    layer.clear();
    expect(layer.list()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/memory/memory-layer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement MemoryLayer**

```typescript
// packages/core/src/memory/memory-layer.ts
import type { SwarmDatabase } from '../db.js';
import type { MemoryEntry, MemoryLayerName } from './memory-entry.js';

export class MemoryLayer {
  constructor(
    private db: SwarmDatabase,
    private layer: MemoryLayerName,
  ) {}

  get(key: string): string | undefined {
    const row = this.db.raw
      .prepare('SELECT value FROM memory WHERE layer = ? AND key = ?')
      .get(this.layer, key) as { value: string } | undefined;

    return row?.value;
  }

  set(key: string, value: string, missionId?: string): void {
    const now = Date.now();
    this.db.raw
      .prepare(
        `INSERT INTO memory (layer, key, value, created_at, updated_at, mission_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(layer, key) DO UPDATE SET value = ?, updated_at = ?`,
      )
      .run(this.layer, key, value, now, now, missionId ?? null, value, now);
  }

  delete(key: string): void {
    this.db.raw.prepare('DELETE FROM memory WHERE layer = ? AND key = ?').run(this.layer, key);
  }

  list(): MemoryEntry[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM memory WHERE layer = ? ORDER BY key ASC')
      .all(this.layer) as MemoryRow[];

    return rows.map(rowToEntry);
  }

  search(keyPrefix: string): MemoryEntry[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM memory WHERE layer = ? AND key LIKE ? ORDER BY key ASC')
      .all(this.layer, keyPrefix + '%') as MemoryRow[];

    return rows.map(rowToEntry);
  }

  clear(): void {
    this.db.raw.prepare('DELETE FROM memory WHERE layer = ?').run(this.layer);
  }
}

interface MemoryRow {
  id: number;
  layer: string;
  key: string;
  value: string;
  created_at: number;
  updated_at: number;
  mission_id: string | null;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    layer: row.layer as MemoryLayerName,
    key: row.key,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    missionId: row.mission_id ?? undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/memory/memory-layer.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/memory/ packages/core/tests/memory/
git commit -m "feat(core): add MemoryEntry types and MemoryLayer with SQLite backing"
```

---

## Task 6: Memory Manager (Three-Layer Coordinator)

**Files:**
- Create: `packages/core/src/memory/memory-manager.ts`
- Create: `packages/core/tests/memory/memory-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/memory/memory-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryManager', () => {
  let db: SwarmDatabase;
  let mm: MemoryManager;

  beforeEach(() => {
    db = createDatabase(':memory:');
    mm = new MemoryManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('exposes short, working, and long layers', () => {
    mm.short.set('a', '1');
    mm.working.set('b', '2');
    mm.long.set('c', '3');

    expect(mm.short.get('a')).toBe('1');
    expect(mm.working.get('b')).toBe('2');
    expect(mm.long.get('c')).toBe('3');
  });

  it('layers are isolated from each other', () => {
    mm.short.set('key', 'short-val');
    mm.working.set('key', 'working-val');

    expect(mm.short.get('key')).toBe('short-val');
    expect(mm.working.get('key')).toBe('working-val');
  });

  it('promotes entry from short to working', () => {
    mm.short.set('project.lang', 'python');
    mm.promote('project.lang', 'short', 'working');

    expect(mm.working.get('project.lang')).toBe('python');
    expect(mm.short.get('project.lang')).toBeUndefined();
  });

  it('promotes entry from working to long', () => {
    mm.working.set('user.pref', 'no-semicolons');
    mm.promote('user.pref', 'working', 'long');

    expect(mm.long.get('user.pref')).toBe('no-semicolons');
    expect(mm.working.get('user.pref')).toBeUndefined();
  });

  it('clears short-term memory only', () => {
    mm.short.set('a', '1');
    mm.working.set('b', '2');
    mm.long.set('c', '3');

    mm.clearShortTerm();

    expect(mm.short.list()).toHaveLength(0);
    expect(mm.working.list()).toHaveLength(1);
    expect(mm.long.list()).toHaveLength(1);
  });

  it('searches across all layers', () => {
    mm.short.set('project.lang', 'ts');
    mm.working.set('project.framework', 'next');
    mm.long.set('user.name', 'yassin');

    const results = mm.searchAll('project.');
    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/memory/memory-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MemoryManager**

```typescript
// packages/core/src/memory/memory-manager.ts
import type { SwarmDatabase } from '../db.js';
import type { MemoryEntry, MemoryLayerName } from './memory-entry.js';
import { MemoryLayer } from './memory-layer.js';

export class MemoryManager {
  readonly short: MemoryLayer;
  readonly working: MemoryLayer;
  readonly long: MemoryLayer;

  constructor(private db: SwarmDatabase) {
    this.short = new MemoryLayer(db, 'short');
    this.working = new MemoryLayer(db, 'working');
    this.long = new MemoryLayer(db, 'long');
  }

  promote(key: string, from: MemoryLayerName, to: MemoryLayerName): void {
    const sourceLayer = this.getLayer(from);
    const targetLayer = this.getLayer(to);

    const value = sourceLayer.get(key);
    if (value === undefined) return;

    targetLayer.set(key, value);
    sourceLayer.delete(key);
  }

  clearShortTerm(): void {
    this.short.clear();
  }

  searchAll(keyPrefix: string): MemoryEntry[] {
    return [
      ...this.short.search(keyPrefix),
      ...this.working.search(keyPrefix),
      ...this.long.search(keyPrefix),
    ];
  }

  private getLayer(name: MemoryLayerName): MemoryLayer {
    switch (name) {
      case 'short':
        return this.short;
      case 'working':
        return this.working;
      case 'long':
        return this.long;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/memory/memory-manager.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/memory-manager.ts packages/core/tests/memory/memory-manager.test.ts
git commit -m "feat(core): add MemoryManager three-layer coordinator"
```

---

## Task 7: Memory Promoter (Auto-Promotion Logic)

**Files:**
- Create: `packages/core/src/memory/memory-promoter.ts`
- Create: `packages/core/tests/memory/memory-promoter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/memory/memory-promoter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryPromoter } from '../../src/memory/memory-promoter.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryPromoter', () => {
  let db: SwarmDatabase;
  let mm: MemoryManager;
  let promoter: MemoryPromoter;

  beforeEach(() => {
    db = createDatabase(':memory:');
    mm = new MemoryManager(db);
    promoter = new MemoryPromoter(mm);
  });

  afterEach(() => {
    db.close();
  });

  it('promotes project patterns to working memory', () => {
    // Simulate a short-term entry with a project-level key
    mm.short.set('project.language', 'typescript');
    mm.short.set('project.framework', 'nextjs');

    const promoted = promoter.scanAndPromote();

    expect(mm.working.get('project.language')).toBe('typescript');
    expect(mm.working.get('project.framework')).toBe('nextjs');
    expect(mm.short.get('project.language')).toBeUndefined();
    expect(promoted).toHaveLength(2);
  });

  it('promotes user preferences to long-term memory', () => {
    mm.short.set('user.prefers-no-comments', 'true');

    const promoted = promoter.scanAndPromote();

    expect(mm.long.get('user.prefers-no-comments')).toBe('true');
    expect(mm.short.get('user.prefers-no-comments')).toBeUndefined();
    expect(promoted).toHaveLength(1);
  });

  it('does not promote entries with no recognized prefix', () => {
    mm.short.set('temp.scratchpad', 'some value');

    const promoted = promoter.scanAndPromote();

    expect(promoted).toHaveLength(0);
    expect(mm.short.get('temp.scratchpad')).toBe('some value');
  });

  it('does not overwrite existing working memory', () => {
    mm.working.set('project.language', 'python');
    mm.short.set('project.language', 'typescript');

    promoter.scanAndPromote();

    // Existing working memory is not overwritten
    expect(mm.working.get('project.language')).toBe('python');
    // Short-term entry remains since it wasn't promoted
    expect(mm.short.get('project.language')).toBe('typescript');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/memory/memory-promoter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MemoryPromoter**

```typescript
// packages/core/src/memory/memory-promoter.ts
import type { MemoryManager } from './memory-manager.js';
import type { MemoryLayerName } from './memory-entry.js';

interface Promotion {
  key: string;
  from: MemoryLayerName;
  to: MemoryLayerName;
}

const PROMOTION_RULES: { prefix: string; target: MemoryLayerName }[] = [
  { prefix: 'project.', target: 'working' },
  { prefix: 'user.', target: 'long' },
  { prefix: 'pattern.', target: 'working' },
  { prefix: 'correction.', target: 'long' },
];

export class MemoryPromoter {
  constructor(private memory: MemoryManager) {}

  scanAndPromote(): Promotion[] {
    const promoted: Promotion[] = [];
    const shortEntries = this.memory.short.list();

    for (const entry of shortEntries) {
      const rule = PROMOTION_RULES.find((r) => entry.key.startsWith(r.prefix));
      if (!rule) continue;

      const targetLayer =
        rule.target === 'working' ? this.memory.working : this.memory.long;

      // Don't overwrite existing entries in the target layer
      if (targetLayer.get(entry.key) !== undefined) continue;

      targetLayer.set(entry.key, entry.value);
      this.memory.short.delete(entry.key);
      promoted.push({ key: entry.key, from: 'short', to: rule.target });
    }

    return promoted;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/memory/memory-promoter.test.ts
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/memory-promoter.ts packages/core/tests/memory/memory-promoter.test.ts
git commit -m "feat(core): add MemoryPromoter with auto-promotion rules"
```

---

## Task 8: Drone Manifest Schema & Parser

**Files:**
- Create: `packages/core/src/drones/drone-manifest.ts`
- Create: `packages/core/tests/drones/drone-manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/drone-manifest.test.ts
import { describe, it, expect } from 'vitest';
import { parseDroneManifest, validateManifest, type DroneManifest } from '../../src/drones/drone-manifest.js';

const VALID_YAML = `
name: architect
description: Designs system architecture before implementation
triggers:
  taskSize: large
  keywords:
    - build
    - create
    - design
  fileCount: ">5"
opinions:
  requires:
    - "spec before code"
  suggests:
    - "consider edge cases"
  blocks:
    - "implementation without design approval"
signals:
  emits:
    - design.proposed
    - design.approved
  listens:
    - mission.started
    - user.override
priority: 10
escalation: user
`;

describe('parseDroneManifest', () => {
  it('parses valid YAML manifest', () => {
    const manifest = parseDroneManifest(VALID_YAML);

    expect(manifest.name).toBe('architect');
    expect(manifest.description).toBe('Designs system architecture before implementation');
    expect(manifest.triggers.taskSize).toBe('large');
    expect(manifest.triggers.keywords).toEqual(['build', 'create', 'design']);
    expect(manifest.opinions.requires).toEqual(['spec before code']);
    expect(manifest.signals.emits).toEqual(['design.proposed', 'design.approved']);
    expect(manifest.priority).toBe(10);
    expect(manifest.escalation).toBe('user');
  });

  it('applies defaults for optional fields', () => {
    const minimal = `
name: simple
description: A simple drone
`;
    const manifest = parseDroneManifest(minimal);

    expect(manifest.triggers).toEqual({});
    expect(manifest.opinions).toEqual({ requires: [], suggests: [], blocks: [] });
    expect(manifest.signals).toEqual({ emits: [], listens: [] });
    expect(manifest.priority).toBe(0);
    expect(manifest.escalation).toBe('user');
  });
});

describe('validateManifest', () => {
  it('returns no errors for valid manifest', () => {
    const manifest = parseDroneManifest(VALID_YAML);
    const errors = validateManifest(manifest);
    expect(errors).toHaveLength(0);
  });

  it('returns error for missing name', () => {
    const manifest = { description: 'test' } as DroneManifest;
    const errors = validateManifest(manifest);
    expect(errors).toContain('name is required');
  });

  it('returns error for missing description', () => {
    const manifest = { name: 'test' } as DroneManifest;
    const errors = validateManifest(manifest);
    expect(errors).toContain('description is required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/drone-manifest.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement drone manifest**

We need a YAML parser. Add `yaml` as a dependency to core.

Update `packages/core/package.json` dependencies to include:
```json
"yaml": "^2.0.0"
```

Then run:
```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm install
```

```typescript
// packages/core/src/drones/drone-manifest.ts
import YAML from 'yaml';

export interface DroneTriggers {
  taskSize?: string;
  keywords?: string[];
  fileCount?: string;
  [key: string]: unknown;
}

export interface DroneOpinions {
  requires: string[];
  suggests: string[];
  blocks: string[];
}

export interface DroneSignals {
  emits: string[];
  listens: string[];
}

export interface DroneManifest {
  name: string;
  description: string;
  triggers: DroneTriggers;
  opinions: DroneOpinions;
  signals: DroneSignals;
  priority: number;
  escalation: string;
}

export function parseDroneManifest(yamlContent: string): DroneManifest {
  const raw = YAML.parse(yamlContent) ?? {};

  return {
    name: raw.name ?? '',
    description: raw.description ?? '',
    triggers: raw.triggers ?? {},
    opinions: {
      requires: raw.opinions?.requires ?? [],
      suggests: raw.opinions?.suggests ?? [],
      blocks: raw.opinions?.blocks ?? [],
    },
    signals: {
      emits: raw.signals?.emits ?? [],
      listens: raw.signals?.listens ?? [],
    },
    priority: raw.priority ?? 0,
    escalation: raw.escalation ?? 'user',
  };
}

export function validateManifest(manifest: DroneManifest): string[] {
  const errors: string[] = [];

  if (!manifest.name) errors.push('name is required');
  if (!manifest.description) errors.push('description is required');

  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/drone-manifest.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/drones/ packages/core/tests/drones/ packages/core/package.json pnpm-lock.yaml
git commit -m "feat(core): add drone manifest schema, parser, and validator"
```

---

## Task 9: Drone Registry

**Files:**
- Create: `packages/core/src/drones/drone-registry.ts`
- Create: `packages/core/tests/drones/drone-registry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/drone-registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DroneRegistry } from '../../src/drones/drone-registry.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeManifest(overrides: Partial<DroneManifest> = {}): DroneManifest {
  return {
    name: 'test-drone',
    description: 'A test drone',
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [], listens: [] },
    priority: 0,
    escalation: 'user',
    ...overrides,
  };
}

describe('DroneRegistry', () => {
  let registry: DroneRegistry;

  beforeEach(() => {
    registry = new DroneRegistry();
  });

  it('registers and retrieves a drone', () => {
    const manifest = makeManifest({ name: 'scout' });
    registry.register(manifest);

    expect(registry.get('scout')).toEqual(manifest);
  });

  it('lists all registered drones', () => {
    registry.register(makeManifest({ name: 'scout', priority: 10 }));
    registry.register(makeManifest({ name: 'coder', priority: 5 }));

    const list = registry.list();
    expect(list).toHaveLength(2);
  });

  it('lists drones sorted by priority (descending)', () => {
    registry.register(makeManifest({ name: 'coder', priority: 5 }));
    registry.register(makeManifest({ name: 'scout', priority: 10 }));

    const list = registry.list();
    expect(list[0].name).toBe('scout');
    expect(list[1].name).toBe('coder');
  });

  it('enables and disables drones', () => {
    registry.register(makeManifest({ name: 'docs' }));
    expect(registry.isEnabled('docs')).toBe(true);

    registry.disable('docs');
    expect(registry.isEnabled('docs')).toBe(false);

    registry.enable('docs');
    expect(registry.isEnabled('docs')).toBe(true);
  });

  it('lists only enabled drones', () => {
    registry.register(makeManifest({ name: 'scout' }));
    registry.register(makeManifest({ name: 'docs' }));
    registry.disable('docs');

    const enabled = registry.listEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe('scout');
  });

  it('unregisters a drone', () => {
    registry.register(makeManifest({ name: 'scout' }));
    registry.unregister('scout');
    expect(registry.get('scout')).toBeUndefined();
  });

  it('throws on duplicate registration', () => {
    registry.register(makeManifest({ name: 'scout' }));
    expect(() => registry.register(makeManifest({ name: 'scout' }))).toThrow(
      'Drone "scout" is already registered',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/drone-registry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DroneRegistry**

```typescript
// packages/core/src/drones/drone-registry.ts
import type { DroneManifest } from './drone-manifest.js';

export class DroneRegistry {
  private drones = new Map<string, DroneManifest>();
  private disabled = new Set<string>();

  register(manifest: DroneManifest): void {
    if (this.drones.has(manifest.name)) {
      throw new Error(`Drone "${manifest.name}" is already registered`);
    }
    this.drones.set(manifest.name, manifest);
  }

  unregister(name: string): void {
    this.drones.delete(name);
    this.disabled.delete(name);
  }

  get(name: string): DroneManifest | undefined {
    return this.drones.get(name);
  }

  list(): DroneManifest[] {
    return [...this.drones.values()].sort((a, b) => b.priority - a.priority);
  }

  listEnabled(): DroneManifest[] {
    return this.list().filter((d) => !this.disabled.has(d.name));
  }

  enable(name: string): void {
    this.disabled.delete(name);
  }

  disable(name: string): void {
    this.disabled.add(name);
  }

  isEnabled(name: string): boolean {
    return !this.disabled.has(name);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/drone-registry.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/drones/drone-registry.ts packages/core/tests/drones/drone-registry.test.ts
git commit -m "feat(core): add DroneRegistry with enable/disable and priority sorting"
```

---

## Task 10: Drone Runner (Lifecycle Management)

**Files:**
- Create: `packages/core/src/drones/drone-runner.ts`
- Create: `packages/core/tests/drones/drone-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/drone-runner.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DroneRunner, type DroneExecutor, DroneState } from '../../src/drones/drone-runner.js';
import { SignalBus } from '../../src/signals/signal-bus.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeManifest(name: string): DroneManifest {
  return {
    name,
    description: `${name} drone`,
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [`${name}.done`], listens: [] },
    priority: 0,
    escalation: 'user',
  };
}

describe('DroneRunner', () => {
  let bus: SignalBus;

  beforeEach(() => {
    bus = new SignalBus();
  });

  it('runs a drone executor and transitions through states', async () => {
    const executor: DroneExecutor = {
      execute: vi.fn().mockResolvedValue({ summary: 'done' }),
    };

    const runner = new DroneRunner(makeManifest('scout'), executor, bus, 'mission-1');

    expect(runner.state).toBe(DroneState.IDLE);

    runner.activate();
    expect(runner.state).toBe(DroneState.ACTIVATED);

    await runner.run();
    expect(runner.state).toBe(DroneState.DONE);
    expect(executor.execute).toHaveBeenCalledOnce();
  });

  it('emits progress signals during lifecycle', async () => {
    const executor: DroneExecutor = {
      execute: vi.fn().mockResolvedValue({ summary: 'done' }),
    };

    const runner = new DroneRunner(makeManifest('scout'), executor, bus, 'mission-1');
    const signals: string[] = [];
    bus.on('*', (s) => signals.push(s.topic));

    runner.activate();
    await runner.run();

    expect(signals).toContain('drone.activated');
    expect(signals).toContain('drone.running');
    expect(signals).toContain('drone.done');
  });

  it('transitions to FAILED state on executor error', async () => {
    const executor: DroneExecutor = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    };

    const runner = new DroneRunner(makeManifest('scout'), executor, bus, 'mission-1');
    runner.activate();
    await runner.run();

    expect(runner.state).toBe(DroneState.FAILED);
    expect(runner.error).toBe('boom');
  });

  it('emits drone.failed signal on error', async () => {
    const executor: DroneExecutor = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    };

    const runner = new DroneRunner(makeManifest('scout'), executor, bus, 'mission-1');
    const handler = vi.fn();
    bus.on('drone.failed', handler);

    runner.activate();
    await runner.run();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].payload.error).toBe('boom');
  });

  it('returns executor result on success', async () => {
    const executor: DroneExecutor = {
      execute: vi.fn().mockResolvedValue({ summary: 'found 12 files', data: [1, 2, 3] }),
    };

    const runner = new DroneRunner(makeManifest('scout'), executor, bus, 'mission-1');
    runner.activate();
    const result = await runner.run();

    expect(result).toEqual({ summary: 'found 12 files', data: [1, 2, 3] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/drone-runner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DroneRunner**

```typescript
// packages/core/src/drones/drone-runner.ts
import type { DroneManifest } from './drone-manifest.js';
import type { SignalBus } from '../signals/signal-bus.js';
import { createSignal } from '../signals/signal.js';

export enum DroneState {
  IDLE = 'idle',
  ACTIVATED = 'activated',
  RUNNING = 'running',
  WAITING = 'waiting',
  DONE = 'done',
  FAILED = 'failed',
}

export interface DroneResult {
  summary: string;
  [key: string]: unknown;
}

export interface DroneExecutor {
  execute(): Promise<DroneResult>;
}

export class DroneRunner {
  state: DroneState = DroneState.IDLE;
  error?: string;
  private result?: DroneResult;

  constructor(
    readonly manifest: DroneManifest,
    private executor: DroneExecutor,
    private bus: SignalBus,
    private missionId: string,
  ) {}

  activate(): void {
    this.state = DroneState.ACTIVATED;
    this.emitSignal('drone.activated', 'info', { drone: this.manifest.name });
  }

  async run(): Promise<DroneResult | undefined> {
    this.state = DroneState.RUNNING;
    this.emitSignal('drone.running', 'info', { drone: this.manifest.name });

    try {
      this.result = await this.executor.execute();
      this.state = DroneState.DONE;
      this.emitSignal('drone.done', 'info', {
        drone: this.manifest.name,
        summary: this.result.summary,
      });
      return this.result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state = DroneState.FAILED;
      this.error = message;
      this.emitSignal('drone.failed', 'critical', {
        drone: this.manifest.name,
        error: message,
      });
      return undefined;
    }
  }

  private emitSignal(
    topic: string,
    severity: 'info' | 'warning' | 'critical',
    payload: Record<string, unknown>,
  ): void {
    this.bus.emit(
      createSignal({
        type: 'progress',
        source: this.manifest.name,
        topic,
        severity,
        payload,
        missionId: this.missionId,
      }),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/drone-runner.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/drones/drone-runner.ts packages/core/tests/drones/drone-runner.test.ts
git commit -m "feat(core): add DroneRunner with lifecycle states and signal emission"
```

---

## Task 11: Context Analyzer — Intent Classifier

**Files:**
- Create: `packages/core/src/analyzer/situation-profile.ts`
- Create: `packages/core/src/analyzer/intent-classifier.ts`
- Create: `packages/core/tests/analyzer/intent-classifier.test.ts`

- [ ] **Step 1: Write situation profile types**

```typescript
// packages/core/src/analyzer/situation-profile.ts
import type { DroneManifest } from '../drones/drone-manifest.js';

export type Intent = 'fix' | 'build' | 'refactor' | 'explore' | 'debug' | 'deploy';
export type Scope = 'trivial' | 'small' | 'medium' | 'large' | 'epic';

export interface ProjectInfo {
  languages: string[];
  frameworks: string[];
  hasTests: boolean;
  testRunner: string | null;
  hasCI: boolean;
  packageManager: string;
  repoSize: 'small' | 'medium' | 'large';
}

export interface UserPrefs {
  wantsTDD: boolean;
  verbosity: 'minimal' | 'normal' | 'detailed';
  riskTolerance: 'cautious' | 'balanced' | 'yolo';
  pastOverrides: string[];
}

export interface DroneActivation {
  manifest: DroneManifest;
  reason: string;
}

export interface SituationProfile {
  intent: Intent;
  scope: Scope;
  project: ProjectInfo;
  userPrefs: UserPrefs;
  recommendedDrones: DroneActivation[];
  estimatedTokens: number;
  estimatedCost: number;
}
```

- [ ] **Step 2: Write the failing test for IntentClassifier**

```typescript
// packages/core/tests/analyzer/intent-classifier.test.ts
import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../src/analyzer/intent-classifier.js';

describe('classifyIntent', () => {
  it('classifies bug fix requests', () => {
    expect(classifyIntent('fix the login bug')).toBe('fix');
    expect(classifyIntent('there is an error in the auth module')).toBe('fix');
    expect(classifyIntent('patch the null pointer issue')).toBe('fix');
  });

  it('classifies build/create requests', () => {
    expect(classifyIntent('build a payment system')).toBe('build');
    expect(classifyIntent('create a new user registration page')).toBe('build');
    expect(classifyIntent('add authentication to the app')).toBe('build');
    expect(classifyIntent('implement the checkout flow')).toBe('build');
  });

  it('classifies refactor requests', () => {
    expect(classifyIntent('refactor the database layer')).toBe('refactor');
    expect(classifyIntent('clean up the auth module')).toBe('refactor');
    expect(classifyIntent('restructure the API routes')).toBe('refactor');
  });

  it('classifies explore requests', () => {
    expect(classifyIntent('how does the auth system work')).toBe('explore');
    expect(classifyIntent('explain the payment flow')).toBe('explore');
    expect(classifyIntent('what does this function do')).toBe('explore');
  });

  it('classifies debug requests', () => {
    expect(classifyIntent('debug why the tests are failing')).toBe('debug');
    expect(classifyIntent('investigate the memory leak')).toBe('debug');
    expect(classifyIntent('why is the API returning 500')).toBe('debug');
  });

  it('classifies deploy requests', () => {
    expect(classifyIntent('deploy to production')).toBe('deploy');
    expect(classifyIntent('release version 2.0')).toBe('deploy');
    expect(classifyIntent('push this to staging')).toBe('deploy');
  });

  it('defaults to build for ambiguous requests', () => {
    expect(classifyIntent('make the app better')).toBe('build');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/analyzer/intent-classifier.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement IntentClassifier**

```typescript
// packages/core/src/analyzer/intent-classifier.ts
import type { Intent } from './situation-profile.js';

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  {
    intent: 'fix',
    patterns: [
      /\bfix\b/i, /\bbug\b/i, /\berror\b/i, /\bpatch\b/i, /\bbroken\b/i,
      /\bissue\b/i, /\bcorrect\b/i, /\brepair\b/i,
    ],
  },
  {
    intent: 'debug',
    patterns: [
      /\bdebug\b/i, /\binvestigat/i, /\bwhy is\b/i, /\bwhy are\b/i,
      /\bmemory leak\b/i, /\bprofile\b/i, /\btrace\b/i,
    ],
  },
  {
    intent: 'refactor',
    patterns: [
      /\brefactor\b/i, /\bclean\s*up\b/i, /\brestructur/i, /\breorganiz/i,
      /\bsimplif/i, /\bextract\b/i, /\bmodulariz/i,
    ],
  },
  {
    intent: 'explore',
    patterns: [
      /\bhow does\b/i, /\bexplain\b/i, /\bwhat does\b/i, /\bwhat is\b/i,
      /\bshow me\b/i, /\bdescribe\b/i, /\bunderstand\b/i,
    ],
  },
  {
    intent: 'deploy',
    patterns: [
      /\bdeploy\b/i, /\brelease\b/i, /\bpublish\b/i, /\bship\b/i,
      /\bstaging\b/i, /\bproduction\b/i, /\brollout\b/i,
    ],
  },
  {
    intent: 'build',
    patterns: [
      /\bbuild\b/i, /\bcreate\b/i, /\badd\b/i, /\bimplement\b/i,
      /\bnew\b/i, /\bset\s*up\b/i, /\bintegrat/i, /\bmake\b/i,
    ],
  },
];

export function classifyIntent(request: string): Intent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(request))) {
      return intent;
    }
  }
  return 'build';
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/analyzer/intent-classifier.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/analyzer/ packages/core/tests/analyzer/
git commit -m "feat(core): add SituationProfile types and IntentClassifier"
```

---

## Task 12: Context Analyzer — Scope Detector

**Files:**
- Create: `packages/core/src/analyzer/scope-detector.ts`
- Create: `packages/core/tests/analyzer/scope-detector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/analyzer/scope-detector.test.ts
import { describe, it, expect } from 'vitest';
import { detectScope } from '../../src/analyzer/scope-detector.js';
import type { Intent } from '../../src/analyzer/situation-profile.js';

describe('detectScope', () => {
  it('detects trivial scope for tiny requests', () => {
    expect(detectScope('fix typo in readme', 'fix', 1)).toBe('trivial');
  });

  it('detects small scope for single-file changes', () => {
    expect(detectScope('add a loading spinner to the button', 'build', 2)).toBe('small');
  });

  it('detects medium scope for multi-file features', () => {
    expect(detectScope('add user preferences page with API endpoint', 'build', 8)).toBe('medium');
  });

  it('detects large scope for system-level features', () => {
    expect(detectScope('build a complete payment system with Stripe integration', 'build', 20)).toBe('large');
  });

  it('detects epic scope for massive rewrites', () => {
    expect(detectScope('rewrite the entire authentication system and migrate all users', 'refactor', 50)).toBe('epic');
  });

  it('explore intent always has trivial scope', () => {
    expect(detectScope('how does the auth system work', 'explore', 100)).toBe('trivial');
  });

  it('uses word count as a complexity signal', () => {
    const short = 'fix login';
    const long = 'build a comprehensive user management system with role-based access control, admin dashboard, audit logging, and integration with our existing SSO provider';
    expect(detectScope(short, 'fix', 0)).toBe('trivial');
    expect(detectScope(long, 'build', 0)).toBe('large');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/analyzer/scope-detector.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement scope detector**

```typescript
// packages/core/src/analyzer/scope-detector.ts
import type { Intent, Scope } from './situation-profile.js';

const EPIC_KEYWORDS = /\bentire\b|\bcomplete rewrite\b|\bmigrate all\b|\bfrom scratch\b/i;
const LARGE_KEYWORDS = /\bcomplete\b|\bcomprehensive\b|\bfull\b|\bsystem\b|\bintegration\b/i;

export function detectScope(
  request: string,
  intent: Intent,
  estimatedFileCount: number,
): Scope {
  // Explore intent is always trivial — no code changes
  if (intent === 'explore') return 'trivial';

  const wordCount = request.split(/\s+/).length;

  // Check for epic signals
  if (EPIC_KEYWORDS.test(request) || estimatedFileCount > 30) {
    return 'epic';
  }

  // Check for large signals
  if (LARGE_KEYWORDS.test(request) || estimatedFileCount > 15 || wordCount > 25) {
    return 'large';
  }

  // Medium: multi-file or moderately complex
  if (estimatedFileCount > 4 || wordCount > 12) {
    return 'medium';
  }

  // Small: a few files
  if (estimatedFileCount > 1 || wordCount > 5) {
    return 'small';
  }

  return 'trivial';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/analyzer/scope-detector.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/analyzer/scope-detector.ts packages/core/tests/analyzer/scope-detector.test.ts
git commit -m "feat(core): add scope detector with keyword and file-count heuristics"
```

---

## Task 13: Context Analyzer — Project Scanner

**Files:**
- Create: `packages/core/src/analyzer/project-scanner.ts`
- Create: `packages/core/tests/analyzer/project-scanner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/analyzer/project-scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanProject } from '../../src/analyzer/project-scanner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('scanProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-scan-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects TypeScript project with package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { next: '14.0.0' },
      devDependencies: { typescript: '5.0.0', jest: '29.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'console.log("hello")');

    const info = scanProject(tmpDir);

    expect(info.languages).toContain('typescript');
    expect(info.frameworks).toContain('next.js');
    expect(info.hasTests).toBe(true);
    expect(info.testRunner).toBe('jest');
    expect(info.packageManager).toBe('npm');
  });

  it('detects Python project with requirements.txt', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django==4.0\npytest==7.0\n');
    fs.writeFileSync(path.join(tmpDir, 'app.py'), 'print("hello")');

    const info = scanProject(tmpDir);

    expect(info.languages).toContain('python');
    expect(info.frameworks).toContain('django');
    expect(info.testRunner).toBe('pytest');
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    const info = scanProject(tmpDir);

    expect(info.packageManager).toBe('pnpm');
  });

  it('detects CI from .github/workflows', () => {
    const workflowDir = path.join(tmpDir, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(path.join(workflowDir, 'ci.yml'), 'name: CI');

    const info = scanProject(tmpDir);

    expect(info.hasCI).toBe(true);
  });

  it('estimates repo size', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    // Small project with just a few files
    const info = scanProject(tmpDir);
    expect(info.repoSize).toBe('small');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/analyzer/project-scanner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement project scanner**

```typescript
// packages/core/src/analyzer/project-scanner.ts
import fs from 'fs';
import path from 'path';
import type { ProjectInfo } from './situation-profile.js';

export function scanProject(projectDir: string): ProjectInfo {
  const languages = detectLanguages(projectDir);
  const frameworks = detectFrameworks(projectDir);
  const testInfo = detectTestRunner(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const hasCI = detectCI(projectDir);
  const repoSize = estimateRepoSize(projectDir);

  return {
    languages,
    frameworks,
    hasTests: testInfo.hasTests,
    testRunner: testInfo.runner,
    hasCI,
    packageManager,
    repoSize,
  };
}

function detectLanguages(dir: string): string[] {
  const langs: string[] = [];

  if (fileExists(dir, 'tsconfig.json') || hasExtension(dir, '.ts')) {
    langs.push('typescript');
  }
  if (hasExtension(dir, '.js') && !langs.includes('typescript')) {
    langs.push('javascript');
  }
  if (hasExtension(dir, '.py') || fileExists(dir, 'requirements.txt') || fileExists(dir, 'pyproject.toml')) {
    langs.push('python');
  }
  if (fileExists(dir, 'go.mod')) langs.push('go');
  if (fileExists(dir, 'Cargo.toml')) langs.push('rust');
  if (fileExists(dir, 'Gemfile')) langs.push('ruby');

  return langs;
}

function detectFrameworks(dir: string): string[] {
  const frameworks: string[] = [];
  const pkg = readPackageJson(dir);

  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.next) frameworks.push('next.js');
    if (allDeps.react && !allDeps.next) frameworks.push('react');
    if (allDeps.vue) frameworks.push('vue');
    if (allDeps.svelte) frameworks.push('svelte');
    if (allDeps.express) frameworks.push('express');
    if (allDeps.fastify) frameworks.push('fastify');
    if (allDeps.hono) frameworks.push('hono');
  }

  const reqTxt = readFile(dir, 'requirements.txt');
  if (reqTxt) {
    if (/django/i.test(reqTxt)) frameworks.push('django');
    if (/flask/i.test(reqTxt)) frameworks.push('flask');
    if (/fastapi/i.test(reqTxt)) frameworks.push('fastapi');
  }

  return frameworks;
}

function detectTestRunner(dir: string): { hasTests: boolean; runner: string | null } {
  const pkg = readPackageJson(dir);

  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.vitest) return { hasTests: true, runner: 'vitest' };
    if (allDeps.jest) return { hasTests: true, runner: 'jest' };
    if (allDeps.mocha) return { hasTests: true, runner: 'mocha' };
  }

  const reqTxt = readFile(dir, 'requirements.txt');
  if (reqTxt && /pytest/i.test(reqTxt)) {
    return { hasTests: true, runner: 'pytest' };
  }

  if (fileExists(dir, 'pytest.ini') || fileExists(dir, 'setup.cfg')) {
    return { hasTests: true, runner: 'pytest' };
  }

  return { hasTests: false, runner: null };
}

function detectPackageManager(dir: string): string {
  if (fileExists(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(dir, 'yarn.lock')) return 'yarn';
  if (fileExists(dir, 'bun.lockb')) return 'bun';
  if (fileExists(dir, 'package-lock.json') || fileExists(dir, 'package.json')) return 'npm';
  if (fileExists(dir, 'requirements.txt') || fileExists(dir, 'pyproject.toml')) return 'pip';
  return 'unknown';
}

function detectCI(dir: string): boolean {
  return (
    dirExists(dir, '.github/workflows') ||
    fileExists(dir, '.gitlab-ci.yml') ||
    fileExists(dir, 'Jenkinsfile') ||
    fileExists(dir, '.circleci/config.yml')
  );
}

function estimateRepoSize(dir: string): 'small' | 'medium' | 'large' {
  let count = 0;

  function walk(current: string, depth: number): void {
    if (depth > 4 || count > 500) return;
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        count++;
        if (entry.isDirectory()) walk(path.join(current, entry.name), depth + 1);
      }
    } catch {
      // Permission denied or similar — skip
    }
  }

  walk(dir, 0);

  if (count < 50) return 'small';
  if (count < 300) return 'medium';
  return 'large';
}

function fileExists(dir: string, file: string): boolean {
  return fs.existsSync(path.join(dir, file));
}

function dirExists(dir: string, subdir: string): boolean {
  const full = path.join(dir, subdir);
  return fs.existsSync(full) && fs.statSync(full).isDirectory();
}

function hasExtension(dir: string, ext: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
    return entries.some((e) => e.isFile() && e.name.endsWith(ext));
  } catch {
    return false;
  }
}

function readFile(dir: string, file: string): string | null {
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

function readPackageJson(dir: string): Record<string, Record<string, string>> | null {
  const content = readFile(dir, 'package.json');
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/analyzer/project-scanner.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/analyzer/project-scanner.ts packages/core/tests/analyzer/project-scanner.test.ts
git commit -m "feat(core): add project scanner for auto-detecting languages, frameworks, and tools"
```

---

## Task 14: Context Analyzer — Orchestrator

**Files:**
- Create: `packages/core/src/analyzer/context-analyzer.ts`
- Create: `packages/core/tests/analyzer/context-analyzer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/analyzer/context-analyzer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextAnalyzer } from '../../src/analyzer/context-analyzer.js';
import { DroneRegistry } from '../../src/drones/drone-registry.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeDrone(name: string, triggers: Record<string, unknown> = {}, priority = 0): DroneManifest {
  return {
    name,
    description: `${name} drone`,
    triggers,
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [], listens: [] },
    priority,
    escalation: 'user',
  };
}

describe('ContextAnalyzer', () => {
  let db: SwarmDatabase;
  let registry: DroneRegistry;
  let memory: MemoryManager;
  let analyzer: ContextAnalyzer;

  beforeEach(() => {
    db = createDatabase(':memory:');
    registry = new DroneRegistry();
    memory = new MemoryManager(db);

    registry.register(makeDrone('scout', {}, 100));
    registry.register(makeDrone('architect', { taskSize: 'large' }, 90));
    registry.register(makeDrone('coder', {}, 50));
    registry.register(makeDrone('tester', {}, 40));
    registry.register(makeDrone('security', { keywords: ['auth', 'payment'] }, 80));
    registry.register(makeDrone('reviewer', {}, 10));
    registry.register(makeDrone('docs', { taskSize: 'large' }, 5));

    analyzer = new ContextAnalyzer(registry, memory);
  });

  afterEach(() => {
    db.close();
  });

  it('activates minimal drones for trivial scope', () => {
    const profile = analyzer.analyze('fix typo', '/tmp/fake');

    expect(profile.intent).toBe('fix');
    expect(profile.scope).toBe('trivial');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('coder');
    expect(droneNames).not.toContain('architect');
    expect(droneNames).not.toContain('docs');
  });

  it('activates full suite for large scope', () => {
    const profile = analyzer.analyze(
      'build a complete payment system with Stripe integration',
      '/tmp/fake',
    );

    expect(profile.scope).toBe('large');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('scout');
    expect(droneNames).toContain('architect');
    expect(droneNames).toContain('coder');
    expect(droneNames).toContain('security');
    expect(droneNames).toContain('reviewer');
  });

  it('activates security drone when keywords match', () => {
    const profile = analyzer.analyze('add auth to the login page', '/tmp/fake');

    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('security');
  });

  it('respects user override from long-term memory', () => {
    memory.long.set('user.override.skip.docs', 'true');

    const profile = analyzer.analyze(
      'build a complete payment system with Stripe integration',
      '/tmp/fake',
    );

    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).not.toContain('docs');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/analyzer/context-analyzer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ContextAnalyzer**

```typescript
// packages/core/src/analyzer/context-analyzer.ts
import type { DroneManifest } from '../drones/drone-manifest.js';
import type { DroneRegistry } from '../drones/drone-registry.js';
import type { MemoryManager } from '../memory/memory-manager.js';
import { classifyIntent } from './intent-classifier.js';
import { detectScope } from './scope-detector.js';
import { scanProject } from './project-scanner.js';
import type { SituationProfile, Scope, DroneActivation, ProjectInfo, UserPrefs } from './situation-profile.js';

const SCOPE_DRONE_MAP: Record<Scope, string[]> = {
  trivial: ['coder'],
  small: ['scout', 'coder', 'tester'],
  medium: ['scout', 'architect', 'coder', 'tester', 'reviewer'],
  large: ['scout', 'architect', 'security', 'coder', 'tester', 'docs', 'reviewer'],
  epic: ['scout', 'architect', 'security', 'coder', 'tester', 'docs', 'reviewer'],
};

export class ContextAnalyzer {
  constructor(
    private registry: DroneRegistry,
    private memory: MemoryManager,
  ) {}

  analyze(request: string, projectDir: string): SituationProfile {
    const intent = classifyIntent(request);
    const scope = detectScope(request, intent, 0);
    const project = this.scanProjectSafe(projectDir);
    const userPrefs = this.loadUserPrefs();
    const recommendedDrones = this.selectDrones(request, scope, userPrefs);

    const estimatedTokens = this.estimateTokens(scope);
    const estimatedCost = estimatedTokens * 0.000003; // rough estimate

    return {
      intent,
      scope,
      project,
      userPrefs,
      recommendedDrones,
      estimatedTokens,
      estimatedCost,
    };
  }

  private selectDrones(request: string, scope: Scope, prefs: UserPrefs): DroneActivation[] {
    const enabledDrones = this.registry.listEnabled();
    const scopeDrones = SCOPE_DRONE_MAP[scope];
    const activations: DroneActivation[] = [];

    for (const manifest of enabledDrones) {
      // Check if user has overridden this drone
      if (prefs.pastOverrides.includes(manifest.name)) continue;

      let reason: string | null = null;

      // Check scope-based activation
      if (scopeDrones.includes(manifest.name)) {
        reason = `Activated by scope: ${scope}`;
      }

      // Check keyword-based activation
      if (!reason && manifest.triggers.keywords) {
        const keywords = manifest.triggers.keywords as string[];
        const matched = keywords.find((kw) => request.toLowerCase().includes(kw.toLowerCase()));
        if (matched) {
          reason = `Keyword match: "${matched}"`;
        }
      }

      if (reason) {
        activations.push({ manifest, reason });
      }
    }

    // Sort by priority descending
    return activations.sort((a, b) => b.manifest.priority - a.manifest.priority);
  }

  private loadUserPrefs(): UserPrefs {
    const skipOverrides: string[] = [];

    // Check long-term memory for user overrides
    const overrideEntries = this.memory.long.search('user.override.skip.');
    for (const entry of overrideEntries) {
      if (entry.value === 'true') {
        const droneName = entry.key.replace('user.override.skip.', '');
        skipOverrides.push(droneName);
      }
    }

    return {
      wantsTDD: this.memory.long.get('user.wants-tdd') !== 'false',
      verbosity: (this.memory.long.get('user.verbosity') as UserPrefs['verbosity']) ?? 'normal',
      riskTolerance: (this.memory.long.get('user.risk-tolerance') as UserPrefs['riskTolerance']) ?? 'balanced',
      pastOverrides: skipOverrides,
    };
  }

  private scanProjectSafe(projectDir: string): ProjectInfo {
    try {
      return scanProject(projectDir);
    } catch {
      return {
        languages: [],
        frameworks: [],
        hasTests: false,
        testRunner: null,
        hasCI: false,
        packageManager: 'unknown',
        repoSize: 'small',
      };
    }
  }

  private estimateTokens(scope: Scope): number {
    const estimates: Record<Scope, number> = {
      trivial: 5_000,
      small: 20_000,
      medium: 60_000,
      large: 150_000,
      epic: 400_000,
    };
    return estimates[scope];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/analyzer/context-analyzer.test.ts
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/analyzer/context-analyzer.ts packages/core/tests/analyzer/context-analyzer.test.ts
git commit -m "feat(core): add ContextAnalyzer with adaptive drone selection"
```

---

## Task 15: Checkpoint Manager

**Files:**
- Create: `packages/core/src/recovery/checkpoint.ts`
- Create: `packages/core/src/recovery/checkpoint-manager.ts`
- Create: `packages/core/tests/recovery/checkpoint-manager.test.ts`

- [ ] **Step 1: Write checkpoint types**

```typescript
// packages/core/src/recovery/checkpoint.ts
export interface Checkpoint {
  id?: number;
  missionId: string;
  label: string;
  data: CheckpointData;
  createdAt: number;
}

export interface CheckpointData {
  missionState: Record<string, unknown>;
  signalHistory: unknown[];
  memorySnapshot: {
    short: Record<string, string>;
    working: Record<string, string>;
  };
  droneStates: Record<string, string>;
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/core/tests/recovery/checkpoint-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointManager } from '../../src/recovery/checkpoint-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';
import type { CheckpointData } from '../../src/recovery/checkpoint.js';

function makeData(overrides: Partial<CheckpointData> = {}): CheckpointData {
  return {
    missionState: { phase: 'execute' },
    signalHistory: [{ topic: 'test' }],
    memorySnapshot: { short: { a: '1' }, working: { b: '2' } },
    droneStates: { scout: 'done', coder: 'running' },
    ...overrides,
  };
}

describe('CheckpointManager', () => {
  let db: SwarmDatabase;
  let mgr: CheckpointManager;

  beforeEach(() => {
    db = createDatabase(':memory:');
    mgr = new CheckpointManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves a checkpoint', () => {
    mgr.create('m1', 'after-planning', makeData());
    const checkpoints = mgr.listByMission('m1');

    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].label).toBe('after-planning');
    expect(checkpoints[0].data.missionState.phase).toBe('execute');
  });

  it('retrieves latest checkpoint for a mission', () => {
    mgr.create('m1', 'cp1', makeData({ missionState: { phase: 'plan' } }));
    mgr.create('m1', 'cp2', makeData({ missionState: { phase: 'execute' } }));

    const latest = mgr.getLatest('m1');
    expect(latest?.label).toBe('cp2');
    expect(latest?.data.missionState.phase).toBe('execute');
  });

  it('returns undefined for missing mission', () => {
    expect(mgr.getLatest('nonexistent')).toBeUndefined();
  });

  it('deletes checkpoints by mission', () => {
    mgr.create('m1', 'cp1', makeData());
    mgr.create('m2', 'cp1', makeData());

    mgr.deleteByMission('m1');

    expect(mgr.listByMission('m1')).toHaveLength(0);
    expect(mgr.listByMission('m2')).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/recovery/checkpoint-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement CheckpointManager**

```typescript
// packages/core/src/recovery/checkpoint-manager.ts
import type { SwarmDatabase } from '../db.js';
import type { Checkpoint, CheckpointData } from './checkpoint.js';

export class CheckpointManager {
  constructor(private db: SwarmDatabase) {}

  create(missionId: string, label: string, data: CheckpointData): Checkpoint {
    const now = Date.now();
    const serialized = JSON.stringify(data);

    this.db.raw
      .prepare(
        'INSERT INTO checkpoints (mission_id, label, data, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(missionId, label, serialized, now);

    return { missionId, label, data, createdAt: now };
  }

  getLatest(missionId: string): Checkpoint | undefined {
    const row = this.db.raw
      .prepare(
        'SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY created_at DESC LIMIT 1',
      )
      .get(missionId) as CheckpointRow | undefined;

    return row ? rowToCheckpoint(row) : undefined;
  }

  listByMission(missionId: string): Checkpoint[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY created_at ASC')
      .all(missionId) as CheckpointRow[];

    return rows.map(rowToCheckpoint);
  }

  deleteByMission(missionId: string): void {
    this.db.raw.prepare('DELETE FROM checkpoints WHERE mission_id = ?').run(missionId);
  }
}

interface CheckpointRow {
  id: number;
  mission_id: string;
  label: string;
  data: string;
  created_at: number;
}

function rowToCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    missionId: row.mission_id,
    label: row.label,
    data: JSON.parse(row.data),
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/recovery/checkpoint-manager.test.ts
```

Expected: PASS — all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/recovery/ packages/core/tests/recovery/
git commit -m "feat(core): add CheckpointManager for mission state snapshots"
```

---

## Task 16: Escalation & Consensus (Recovery Tiers 2 & 3)

**Files:**
- Create: `packages/core/src/recovery/escalation.ts`
- Create: `packages/core/src/recovery/consensus.ts`
- Create: `packages/core/tests/recovery/escalation.test.ts`
- Create: `packages/core/tests/recovery/consensus.test.ts`

- [ ] **Step 1: Write the failing test for Escalation**

```typescript
// packages/core/tests/recovery/escalation.test.ts
import { describe, it, expect } from 'vitest';
import { EscalationHandler, EscalationAction } from '../../src/recovery/escalation.js';

describe('EscalationHandler', () => {
  it('recommends retry for first failure', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({
      droneName: 'coder',
      error: 'context limit exceeded',
      attemptCount: 1,
    });

    expect(action.type).toBe('retry');
  });

  it('recommends decompose after max retries', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({
      droneName: 'coder',
      error: 'context limit exceeded',
      attemptCount: 3,
    });

    expect(action.type).toBe('decompose');
  });

  it('recommends skip for non-critical drones', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({
      droneName: 'docs',
      error: 'failed to generate docs',
      attemptCount: 3,
      critical: false,
    });

    expect(action.type).toBe('skip');
  });

  it('escalates to user for critical drones after exhausting options', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({
      droneName: 'security',
      error: 'cannot verify dependencies',
      attemptCount: 3,
      critical: true,
    });

    expect(action.type).toBe('escalate-user');
  });
});
```

- [ ] **Step 2: Write the failing test for Consensus**

```typescript
// packages/core/tests/recovery/consensus.test.ts
import { describe, it, expect } from 'vitest';
import { ConsensusBuilder, type DroneArgument } from '../../src/recovery/consensus.js';

describe('ConsensusBuilder', () => {
  it('builds a conflict with arguments from multiple drones', () => {
    const builder = new ConsensusBuilder('refactor-vs-ship');

    builder.addArgument({
      droneName: 'architect',
      position: 'Refactor auth module first',
      reasoning: 'Current structure cannot support new feature safely',
      severity: 'critical',
    });

    builder.addArgument({
      droneName: 'coder',
      position: 'Inline fix is faster',
      reasoning: 'Refactor is out of scope for this mission',
      severity: 'info',
    });

    const conflict = builder.build();

    expect(conflict.id).toBe('refactor-vs-ship');
    expect(conflict.arguments).toHaveLength(2);
    expect(conflict.recommendation.droneName).toBe('architect');
    expect(conflict.recommendation.reasoning).toContain('higher severity');
  });

  it('recommends the argument with higher severity', () => {
    const builder = new ConsensusBuilder('test-conflict');

    builder.addArgument({
      droneName: 'tester',
      position: 'Need tests',
      reasoning: 'No coverage',
      severity: 'warning',
    });

    builder.addArgument({
      droneName: 'coder',
      position: 'Skip tests',
      reasoning: 'Trivial change',
      severity: 'info',
    });

    const conflict = builder.build();
    expect(conflict.recommendation.droneName).toBe('tester');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/core && pnpm test -- tests/recovery/
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement Escalation**

```typescript
// packages/core/src/recovery/escalation.ts
export interface EscalationInput {
  droneName: string;
  error: string;
  attemptCount: number;
  critical?: boolean;
}

export interface EscalationAction {
  type: 'retry' | 'decompose' | 'skip' | 'escalate-user';
  reason: string;
}

const MAX_RETRIES = 2;

export class EscalationHandler {
  handle(input: EscalationInput): EscalationAction {
    const { attemptCount, critical = true } = input;

    // Tier 1: retry
    if (attemptCount <= MAX_RETRIES) {
      return {
        type: 'retry',
        reason: `Attempt ${attemptCount}/${MAX_RETRIES} — retrying with fresh context`,
      };
    }

    // Tier 2: decompose or skip
    if (!critical) {
      return {
        type: 'skip',
        reason: `Non-critical drone "${input.droneName}" failed after ${MAX_RETRIES} retries — skipping`,
      };
    }

    // Try decomposition for critical drones
    if (attemptCount === MAX_RETRIES + 1) {
      return {
        type: 'decompose',
        reason: `Critical drone "${input.droneName}" failed — attempting task decomposition`,
      };
    }

    // Tier 3: escalate to user
    return {
      type: 'escalate-user',
      reason: `Critical drone "${input.droneName}" failed after all recovery attempts — user intervention required`,
    };
  }
}
```

- [ ] **Step 5: Implement Consensus**

```typescript
// packages/core/src/recovery/consensus.ts
export interface DroneArgument {
  droneName: string;
  position: string;
  reasoning: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface Conflict {
  id: string;
  arguments: DroneArgument[];
  recommendation: {
    droneName: string;
    position: string;
    reasoning: string;
  };
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export class ConsensusBuilder {
  private arguments: DroneArgument[] = [];

  constructor(private conflictId: string) {}

  addArgument(arg: DroneArgument): void {
    this.arguments.push(arg);
  }

  build(): Conflict {
    // Recommend the argument with highest severity
    const sorted = [...this.arguments].sort(
      (a, b) => (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0),
    );

    const winner = sorted[0];

    return {
      id: this.conflictId,
      arguments: this.arguments,
      recommendation: {
        droneName: winner.droneName,
        position: winner.position,
        reasoning: `Recommended: "${winner.droneName}" has higher severity (${winner.severity})`,
      },
    };
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd packages/core && pnpm test -- tests/recovery/
```

Expected: PASS — all 6 tests green (4 escalation + 2 consensus).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/recovery/ packages/core/tests/recovery/
git commit -m "feat(core): add EscalationHandler and ConsensusBuilder for failure recovery"
```

---

## Task 17: Mission Types & Mission Store

**Files:**
- Create: `packages/core/src/mission/mission.ts`
- Create: `packages/core/src/mission/mission-store.ts`
- Create: `packages/core/tests/mission/mission-store.test.ts`

- [ ] **Step 1: Write mission types**

```typescript
// packages/core/src/mission/mission.ts
export type MissionPhase = 'analyze' | 'plan' | 'execute' | 'report';
export type MissionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface Mission {
  id: string;
  description: string;
  status: MissionStatus;
  phase: MissionPhase;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  result?: string;
}

export function createMissionId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/core/tests/mission/mission-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionStore } from '../../src/mission/mission-store.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MissionStore', () => {
  let db: SwarmDatabase;
  let store: MissionStore;

  beforeEach(() => {
    db = createDatabase(':memory:');
    store = new MissionStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves a mission', () => {
    const mission = store.create('m1', 'Build payment system');
    expect(mission.id).toBe('m1');
    expect(mission.description).toBe('Build payment system');
    expect(mission.status).toBe('pending');
    expect(mission.phase).toBe('analyze');

    const retrieved = store.get('m1');
    expect(retrieved?.description).toBe('Build payment system');
  });

  it('updates mission status and phase', () => {
    store.create('m1', 'test');
    store.update('m1', { status: 'running', phase: 'execute' });

    const mission = store.get('m1');
    expect(mission?.status).toBe('running');
    expect(mission?.phase).toBe('execute');
  });

  it('completes a mission', () => {
    store.create('m1', 'test');
    store.complete('m1', 'All drones finished successfully');

    const mission = store.get('m1');
    expect(mission?.status).toBe('completed');
    expect(mission?.result).toBe('All drones finished successfully');
    expect(mission?.completedAt).toBeDefined();
  });

  it('lists missions in reverse chronological order', () => {
    store.create('m1', 'first');
    store.create('m2', 'second');

    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('m2');
  });

  it('returns undefined for missing mission', () => {
    expect(store.get('nonexistent')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/mission/mission-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement MissionStore**

```typescript
// packages/core/src/mission/mission-store.ts
import type { SwarmDatabase } from '../db.js';
import type { Mission, MissionPhase, MissionStatus } from './mission.js';

export class MissionStore {
  constructor(private db: SwarmDatabase) {}

  create(id: string, description: string): Mission {
    const now = Date.now();
    this.db.raw
      .prepare(
        `INSERT INTO missions (id, description, status, phase, created_at, updated_at)
         VALUES (?, ?, 'pending', 'analyze', ?, ?)`,
      )
      .run(id, description, now, now);

    return {
      id,
      description,
      status: 'pending',
      phase: 'analyze',
      createdAt: now,
      updatedAt: now,
    };
  }

  get(id: string): Mission | undefined {
    const row = this.db.raw
      .prepare('SELECT * FROM missions WHERE id = ?')
      .get(id) as MissionRow | undefined;

    return row ? rowToMission(row) : undefined;
  }

  update(id: string, changes: { status?: MissionStatus; phase?: MissionPhase }): void {
    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [Date.now()];

    if (changes.status) {
      sets.push('status = ?');
      values.push(changes.status);
    }
    if (changes.phase) {
      sets.push('phase = ?');
      values.push(changes.phase);
    }

    values.push(id);
    this.db.raw.prepare(`UPDATE missions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  complete(id: string, result: string): void {
    const now = Date.now();
    this.db.raw
      .prepare(
        `UPDATE missions SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      )
      .run(result, now, now, id);
  }

  list(limit = 50): Mission[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT ?')
      .all(limit) as MissionRow[];

    return rows.map(rowToMission);
  }
}

interface MissionRow {
  id: string;
  description: string;
  status: string;
  phase: string;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  result: string | null;
}

function rowToMission(row: MissionRow): Mission {
  return {
    id: row.id,
    description: row.description,
    status: row.status as MissionStatus,
    phase: row.phase as MissionPhase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    result: row.result ?? undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/mission/mission-store.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/mission/ packages/core/tests/mission/
git commit -m "feat(core): add Mission types and MissionStore with SQLite persistence"
```

---

## Task 18: Mission Planner

**Files:**
- Create: `packages/core/src/mission/mission-planner.ts`
- Create: `packages/core/tests/mission/mission-planner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/mission/mission-planner.test.ts
import { describe, it, expect } from 'vitest';
import { MissionPlanner, type MissionPlan } from '../../src/mission/mission-planner.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeDrone(name: string, priority: number, listens: string[] = []): DroneManifest {
  return {
    name,
    description: `${name} drone`,
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [`${name}.done`], listens },
    priority,
    escalation: 'user',
  };
}

describe('MissionPlanner', () => {
  it('orders drones by priority', () => {
    const planner = new MissionPlanner();
    const drones = [
      makeDrone('coder', 50),
      makeDrone('scout', 100),
      makeDrone('reviewer', 10),
    ];

    const plan = planner.plan(drones);

    expect(plan.steps.map((s) => s.droneName)).toEqual(['scout', 'coder', 'reviewer']);
  });

  it('identifies parallel opportunities', () => {
    const planner = new MissionPlanner();
    const drones = [
      makeDrone('scout', 100),
      makeDrone('architect', 90),
      makeDrone('security', 80),
      makeDrone('coder', 50, ['architect.done']),
    ];

    const plan = planner.plan(drones);

    // scout runs first (highest priority, no deps)
    expect(plan.steps[0].droneName).toBe('scout');

    // architect and security can run in parallel (same tier, no deps on each other)
    const architectStep = plan.steps.find((s) => s.droneName === 'architect')!;
    const securityStep = plan.steps.find((s) => s.droneName === 'security')!;
    expect(architectStep.parallelGroup).toBe(securityStep.parallelGroup);

    // coder depends on architect.done, must be in a later group
    const coderStep = plan.steps.find((s) => s.droneName === 'coder')!;
    expect(coderStep.parallelGroup).toBeGreaterThan(architectStep.parallelGroup);
  });

  it('assigns sequential groups when all drones have dependencies', () => {
    const planner = new MissionPlanner();
    const drones = [
      makeDrone('scout', 100),
      makeDrone('coder', 50, ['scout.done']),
      makeDrone('tester', 40, ['coder.done']),
    ];

    const plan = planner.plan(drones);
    const groups = plan.steps.map((s) => s.parallelGroup);
    expect(new Set(groups).size).toBe(3); // all different groups
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/mission/mission-planner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MissionPlanner**

```typescript
// packages/core/src/mission/mission-planner.ts
import type { DroneManifest } from '../drones/drone-manifest.js';

export interface PlanStep {
  droneName: string;
  parallelGroup: number;
  dependsOn: string[];
}

export interface MissionPlan {
  steps: PlanStep[];
}

export class MissionPlanner {
  plan(drones: DroneManifest[]): MissionPlan {
    // Sort by priority descending
    const sorted = [...drones].sort((a, b) => b.priority - a.priority);

    // Build a set of all signals emitted by drones in this plan
    const emittedSignals = new Map<string, string>(); // signal → droneName
    for (const drone of sorted) {
      for (const signal of drone.signals.emits) {
        emittedSignals.set(signal, drone.name);
      }
    }

    // For each drone, find which drones it depends on (via signals.listens)
    const deps = new Map<string, string[]>();
    for (const drone of sorted) {
      const droneDeps: string[] = [];
      for (const listen of drone.signals.listens) {
        const emitter = emittedSignals.get(listen);
        if (emitter && emitter !== drone.name) {
          droneDeps.push(emitter);
        }
      }
      deps.set(drone.name, droneDeps);
    }

    // Assign parallel groups using topological ordering
    const assigned = new Map<string, number>();
    const steps: PlanStep[] = [];

    for (const drone of sorted) {
      const droneDeps = deps.get(drone.name) ?? [];
      let group = 0;

      for (const dep of droneDeps) {
        const depGroup = assigned.get(dep) ?? 0;
        group = Math.max(group, depGroup + 1);
      }

      assigned.set(drone.name, group);
      steps.push({
        droneName: drone.name,
        parallelGroup: group,
        dependsOn: droneDeps,
      });
    }

    return { steps };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/mission/mission-planner.test.ts
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/mission/mission-planner.ts packages/core/tests/mission/mission-planner.test.ts
git commit -m "feat(core): add MissionPlanner with dependency-aware parallel grouping"
```

---

## Task 19: Mission Runner (Full Lifecycle Orchestrator)

**Files:**
- Create: `packages/core/src/mission/mission-runner.ts`
- Create: `packages/core/tests/mission/mission-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/mission/mission-runner.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MissionRunner } from '../../src/mission/mission-runner.js';
import { SignalBus } from '../../src/signals/signal-bus.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { MissionStore } from '../../src/mission/mission-store.js';
import { CheckpointManager } from '../../src/recovery/checkpoint-manager.js';
import { DroneRegistry } from '../../src/drones/drone-registry.js';
import { MissionPlanner } from '../../src/mission/mission-planner.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';
import type { DroneExecutor } from '../../src/drones/drone-runner.js';

function makeDrone(name: string, priority: number): DroneManifest {
  return {
    name,
    description: `${name} drone`,
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [`${name}.done`], listens: [] },
    priority,
    escalation: 'user',
  };
}

describe('MissionRunner', () => {
  let db: SwarmDatabase;
  let bus: SignalBus;
  let memory: MemoryManager;
  let missionStore: MissionStore;
  let checkpoints: CheckpointManager;
  let registry: DroneRegistry;
  let runner: MissionRunner;

  const executors = new Map<string, DroneExecutor>();

  beforeEach(() => {
    db = createDatabase(':memory:');
    bus = new SignalBus();
    memory = new MemoryManager(db);
    missionStore = new MissionStore(db);
    checkpoints = new CheckpointManager(db);
    registry = new DroneRegistry();

    registry.register(makeDrone('scout', 100));
    registry.register(makeDrone('coder', 50));

    executors.set('scout', {
      execute: vi.fn().mockResolvedValue({ summary: 'scanned 10 files' }),
    });
    executors.set('coder', {
      execute: vi.fn().mockResolvedValue({ summary: 'implemented feature' }),
    });

    runner = new MissionRunner({
      bus,
      memory,
      missionStore,
      checkpoints,
      planner: new MissionPlanner(),
      resolveExecutor: (name: string) => executors.get(name)!,
    });
  });

  afterEach(() => {
    db.close();
  });

  it('runs a complete mission lifecycle', async () => {
    const result = await runner.run('m1', 'test task', [
      registry.get('scout')!,
      registry.get('coder')!,
    ]);

    expect(result.status).toBe('completed');

    const mission = missionStore.get('m1');
    expect(mission?.status).toBe('completed');
  });

  it('creates checkpoints during mission', async () => {
    await runner.run('m1', 'test task', [
      registry.get('scout')!,
      registry.get('coder')!,
    ]);

    const cps = checkpoints.listByMission('m1');
    expect(cps.length).toBeGreaterThanOrEqual(1);
  });

  it('emits mission lifecycle signals', async () => {
    const topics: string[] = [];
    bus.on('mission.*', (s) => topics.push(s.topic));

    await runner.run('m1', 'test task', [registry.get('scout')!]);

    expect(topics).toContain('mission.started');
    expect(topics).toContain('mission.completed');
  });

  it('handles drone failure gracefully', async () => {
    executors.set('scout', {
      execute: vi.fn().mockRejectedValue(new Error('crash')),
    });

    const result = await runner.run('m1', 'test task', [registry.get('scout')!]);

    // Mission should still complete (with failures noted)
    expect(result.status).toBe('completed');
    expect(result.failedDrones).toContain('scout');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/mission/mission-runner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MissionRunner**

```typescript
// packages/core/src/mission/mission-runner.ts
import type { SignalBus } from '../signals/signal-bus.js';
import type { MemoryManager } from '../memory/memory-manager.js';
import type { MissionStore } from './mission-store.js';
import type { CheckpointManager } from '../recovery/checkpoint-manager.js';
import type { MissionPlanner } from './mission-planner.js';
import type { DroneManifest } from '../drones/drone-manifest.js';
import { DroneRunner, type DroneExecutor } from '../drones/drone-runner.js';
import { createSignal } from '../signals/signal.js';
import { MemoryPromoter } from '../memory/memory-promoter.js';

export interface MissionRunnerConfig {
  bus: SignalBus;
  memory: MemoryManager;
  missionStore: MissionStore;
  checkpoints: CheckpointManager;
  planner: MissionPlanner;
  resolveExecutor: (droneName: string) => DroneExecutor;
}

export interface MissionResult {
  status: 'completed' | 'failed';
  failedDrones: string[];
  completedDrones: string[];
}

export class MissionRunner {
  constructor(private config: MissionRunnerConfig) {}

  async run(
    missionId: string,
    description: string,
    drones: DroneManifest[],
  ): Promise<MissionResult> {
    const { bus, memory, missionStore, checkpoints, planner } = this.config;

    // Create mission
    missionStore.create(missionId, description);
    missionStore.update(missionId, { status: 'running', phase: 'plan' });

    bus.emit(
      createSignal({
        type: 'progress',
        source: 'mission-runner',
        topic: 'mission.started',
        severity: 'info',
        payload: { missionId, description, droneCount: drones.length },
        missionId,
      }),
    );

    // Plan
    const plan = planner.plan(drones);

    // Checkpoint after planning
    checkpoints.create(missionId, 'after-planning', {
      missionState: { phase: 'plan', droneCount: drones.length },
      signalHistory: bus.history(missionId),
      memorySnapshot: { short: {}, working: {} },
      droneStates: Object.fromEntries(drones.map((d) => [d.name, 'idle'])),
    });

    // Execute
    missionStore.update(missionId, { phase: 'execute' });

    const completedDrones: string[] = [];
    const failedDrones: string[] = [];

    // Group steps by parallelGroup
    const groups = new Map<number, typeof plan.steps>();
    for (const step of plan.steps) {
      if (!groups.has(step.parallelGroup)) {
        groups.set(step.parallelGroup, []);
      }
      groups.get(step.parallelGroup)!.push(step);
    }

    // Execute groups in order
    const sortedGroupKeys = [...groups.keys()].sort((a, b) => a - b);

    for (const groupKey of sortedGroupKeys) {
      const groupSteps = groups.get(groupKey)!;

      // Run all drones in this group in parallel
      const results = await Promise.all(
        groupSteps.map(async (step) => {
          const manifest = drones.find((d) => d.name === step.droneName);
          if (!manifest) return { name: step.droneName, success: false };

          const executor = this.config.resolveExecutor(manifest.name);
          const droneRunner = new DroneRunner(manifest, executor, bus, missionId);

          droneRunner.activate();
          const result = await droneRunner.run();

          return {
            name: manifest.name,
            success: droneRunner.state === 'done',
            result,
          };
        }),
      );

      for (const r of results) {
        if (r.success) {
          completedDrones.push(r.name);
        } else {
          failedDrones.push(r.name);
        }
      }
    }

    // Report
    missionStore.update(missionId, { phase: 'report' });

    // Promote memory
    const promoter = new MemoryPromoter(memory);
    promoter.scanAndPromote();

    // Clear short-term memory
    memory.clearShortTerm();

    // Complete mission
    const resultSummary = failedDrones.length
      ? `Completed with failures: ${failedDrones.join(', ')}`
      : `All ${completedDrones.length} drones completed successfully`;

    missionStore.complete(missionId, resultSummary);

    bus.emit(
      createSignal({
        type: 'progress',
        source: 'mission-runner',
        topic: 'mission.completed',
        severity: failedDrones.length ? 'warning' : 'info',
        payload: { missionId, completedDrones, failedDrones },
        missionId,
      }),
    );

    return {
      status: 'completed',
      failedDrones,
      completedDrones,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/mission/mission-runner.test.ts
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/mission/mission-runner.ts packages/core/tests/mission/mission-runner.test.ts
git commit -m "feat(core): add MissionRunner with full lifecycle orchestration"
```

---

## Task 20: Core Barrel Export

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Write the barrel export**

```typescript
// packages/core/src/index.ts

// Database
export { createDatabase, type SwarmDatabase } from './db.js';

// Signals
export { type Signal, type SignalType, type SignalSeverity, createSignal, isSignal } from './signals/signal.js';
export { SignalBus } from './signals/signal-bus.js';
export { SignalStore } from './signals/signal-store.js';

// Memory
export { type MemoryEntry, type MemoryLayerName, createMemoryEntry } from './memory/memory-entry.js';
export { MemoryLayer } from './memory/memory-layer.js';
export { MemoryManager } from './memory/memory-manager.js';
export { MemoryPromoter } from './memory/memory-promoter.js';

// Drones
export { type DroneManifest, type DroneTriggers, type DroneOpinions, type DroneSignals, parseDroneManifest, validateManifest } from './drones/drone-manifest.js';
export { DroneRegistry } from './drones/drone-registry.js';
export { DroneRunner, DroneState, type DroneExecutor, type DroneResult } from './drones/drone-runner.js';

// Analyzer
export { type SituationProfile, type Intent, type Scope, type ProjectInfo, type UserPrefs, type DroneActivation } from './analyzer/situation-profile.js';
export { classifyIntent } from './analyzer/intent-classifier.js';
export { detectScope } from './analyzer/scope-detector.js';
export { scanProject } from './analyzer/project-scanner.js';
export { ContextAnalyzer } from './analyzer/context-analyzer.js';

// Mission
export { type Mission, type MissionPhase, type MissionStatus, createMissionId } from './mission/mission.js';
export { MissionStore } from './mission/mission-store.js';
export { MissionPlanner, type MissionPlan, type PlanStep } from './mission/mission-planner.js';
export { MissionRunner, type MissionRunnerConfig, type MissionResult } from './mission/mission-runner.js';

// Recovery
export { type Checkpoint, type CheckpointData } from './recovery/checkpoint.js';
export { CheckpointManager } from './recovery/checkpoint-manager.js';
export { EscalationHandler, type EscalationInput, type EscalationAction } from './recovery/escalation.js';
export { ConsensusBuilder, type DroneArgument, type Conflict } from './recovery/consensus.js';
```

- [ ] **Step 2: Build the core package**

```bash
cd packages/core && pnpm build
```

Expected: Compiles with no errors.

- [ ] **Step 3: Run all core tests**

```bash
cd packages/core && pnpm test
```

Expected: All tests pass (approximately 55+ tests).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): add barrel export for all public APIs"
```

---

## Task 21: CLI Entry Point & Init Command

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/tests/commands/init.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('initProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .swarm directory with config.yaml', () => {
    initProject(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, '.swarm'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.swarm', 'config.yaml'))).toBe(true);

    const config = fs.readFileSync(path.join(tmpDir, '.swarm', 'config.yaml'), 'utf-8');
    expect(config).toContain('drones:');
  });

  it('creates checkpoints directory', () => {
    initProject(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.swarm', 'checkpoints'))).toBe(true);
  });

  it('appends to existing .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
    initProject(tmpDir);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.swarm/memory.db');
    expect(gitignore).toContain('.swarm/checkpoints/');
  });

  it('creates .gitignore if it does not exist', () => {
    initProject(tmpDir);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.swarm/memory.db');
  });

  it('does not duplicate gitignore entries on re-init', () => {
    initProject(tmpDir);
    initProject(tmpDir);

    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const matches = gitignore.match(/\.swarm\/memory\.db/g);
    expect(matches).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/init.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement init command**

```typescript
// packages/cli/src/commands/init.ts
import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = `# Swarm Framework Configuration
# This file is meant to be committed to version control.

drones:
  enabled:
    - scout
    - architect
    - coder
    - tester
    - debugger
    - security
    - reviewer
    - docs

analyzer:
  # Override scope detection: trivial | small | medium | large | epic | auto
  defaultScope: auto

dashboard:
  # Port for the dashboard server
  port: 3000
  # Auto-open browser on mission start
  autoOpen: true
`;

const GITIGNORE_ENTRIES = ['.swarm/memory.db', '.swarm/checkpoints/'];

export function initProject(projectDir: string): void {
  const swarmDir = path.join(projectDir, '.swarm');
  const checkpointsDir = path.join(swarmDir, 'checkpoints');
  const configPath = path.join(swarmDir, 'config.yaml');

  // Create directories
  fs.mkdirSync(swarmDir, { recursive: true });
  fs.mkdirSync(checkpointsDir, { recursive: true });

  // Write config if it doesn't exist
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, DEFAULT_CONFIG, 'utf-8');
  }

  // Update .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  let gitignore = '';

  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const newEntries: string[] = [];
  for (const entry of GITIGNORE_ENTRIES) {
    if (!gitignore.includes(entry)) {
      newEntries.push(entry);
    }
  }

  if (newEntries.length > 0) {
    const suffix = gitignore.endsWith('\n') || gitignore === '' ? '' : '\n';
    const addition =
      (gitignore === '' ? '' : suffix) +
      '\n# Swarm Framework\n' +
      newEntries.join('\n') +
      '\n';
    fs.writeFileSync(gitignorePath, gitignore + addition, 'utf-8');
  }
}
```

- [ ] **Step 4: Write CLI entry point**

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';

const program = new Command();

program
  .name('swarm')
  .description('Adaptive Claude Code orchestration framework')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize swarm in the current project')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    initProject(dir);
    console.log('Swarm initialized in', dir);
  });

program.parse();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/init.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 6: Build both packages**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

Expected: Both core and cli build successfully.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/ packages/cli/tests/
git commit -m "feat(cli): add CLI entry point and swarm init command"
```

---

## Task 22: Dashboard Server (WebSocket + HTTP)

**Files:**
- Create: `packages/cli/src/dashboard/server.ts`
- Create: `packages/cli/src/dashboard/broadcaster.ts`
- Create: `packages/cli/tests/dashboard/server.test.ts`
- Create: `packages/cli/tests/dashboard/broadcaster.test.ts`

- [ ] **Step 1: Write the failing test for Broadcaster**

```typescript
// packages/cli/tests/dashboard/broadcaster.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Broadcaster } from '../../src/dashboard/broadcaster.js';
import { SignalBus, createSignal } from '@swarm/core';

describe('Broadcaster', () => {
  it('relays signals to registered listeners', () => {
    const bus = new SignalBus();
    const broadcaster = new Broadcaster(bus);

    const listener = vi.fn();
    broadcaster.addListener(listener);

    bus.emit(
      createSignal({
        type: 'progress',
        source: 'test',
        topic: 'test.event',
        severity: 'info',
        payload: {},
        missionId: 'm1',
      }),
    );

    expect(listener).toHaveBeenCalledOnce();
    const message = listener.mock.calls[0][0];
    expect(message.topic).toBe('test.event');
  });

  it('removes listeners', () => {
    const bus = new SignalBus();
    const broadcaster = new Broadcaster(bus);

    const listener = vi.fn();
    broadcaster.addListener(listener);
    broadcaster.removeListener(listener);

    bus.emit(
      createSignal({
        type: 'progress',
        source: 'test',
        topic: 'test.event',
        severity: 'info',
        payload: {},
        missionId: 'm1',
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/dashboard/broadcaster.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Broadcaster**

```typescript
// packages/cli/src/dashboard/broadcaster.ts
import type { SignalBus, Signal } from '@swarm/core';

type BroadcastListener = (signal: Signal) => void;

export class Broadcaster {
  private listeners = new Set<BroadcastListener>();

  constructor(bus: SignalBus) {
    bus.on('*', (signal) => {
      for (const listener of this.listeners) {
        listener(signal);
      }
    });
  }

  addListener(listener: BroadcastListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: BroadcastListener): void {
    this.listeners.delete(listener);
  }
}
```

- [ ] **Step 4: Write the failing test for DashboardServer**

```typescript
// packages/cli/tests/dashboard/server.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { DashboardServer } from '../../src/dashboard/server.js';
import { SignalBus } from '@swarm/core';

describe('DashboardServer', () => {
  let server: DashboardServer;

  afterEach(async () => {
    if (server) await server.stop();
  });

  it('starts and stops on a given port', async () => {
    const bus = new SignalBus();
    server = new DashboardServer(bus, { port: 0 }); // port 0 = random available port

    const address = await server.start();
    expect(address.port).toBeGreaterThan(0);

    await server.stop();
  });

  it('serves a health check endpoint', async () => {
    const bus = new SignalBus();
    server = new DashboardServer(bus, { port: 0 });

    const address = await server.start();
    const res = await fetch(`http://localhost:${address.port}/api/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
```

- [ ] **Step 5: Implement DashboardServer**

```typescript
// packages/cli/src/dashboard/server.ts
import http from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { SignalBus } from '@swarm/core';
import { Broadcaster } from './broadcaster.js';

export interface DashboardServerOptions {
  port: number;
}

export interface ServerAddress {
  port: number;
  host: string;
}

export class DashboardServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private broadcaster: Broadcaster;

  constructor(bus: SignalBus, private options: DashboardServerOptions) {
    this.broadcaster = new Broadcaster(bus);

    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }

      if (req.url === '/api/signals') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signals: bus.history() }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket) => {
      const listener = (signal: unknown) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(signal));
        }
      };

      this.broadcaster.addListener(listener);

      ws.on('close', () => {
        this.broadcaster.removeListener(listener);
      });
    });
  }

  start(): Promise<ServerAddress> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.options.port, () => {
        const addr = this.httpServer.address();
        if (typeof addr === 'object' && addr) {
          resolve({ port: addr.port, host: 'localhost' });
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => resolve());
      });
    });
  }
}
```

- [ ] **Step 6: Run all dashboard tests**

```bash
cd packages/cli && pnpm test -- tests/dashboard/
```

Expected: PASS — all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/dashboard/ packages/cli/tests/dashboard/
git commit -m "feat(cli): add DashboardServer with WebSocket broadcasting and health endpoint"
```

---

## Task 23: CLI Run Command (Ties Everything Together)

**Files:**
- Create: `packages/cli/src/commands/run.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Implement the run command**

```typescript
// packages/cli/src/commands/run.ts
import {
  createDatabase,
  createMissionId,
  SignalBus,
  SignalStore,
  MemoryManager,
  MissionStore,
  MissionPlanner,
  MissionRunner,
  CheckpointManager,
  ContextAnalyzer,
  DroneRegistry,
  type DroneManifest,
  type DroneExecutor,
} from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import path from 'path';
import fs from 'fs';

export interface RunOptions {
  noDashboard?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(
  description: string,
  projectDir: string,
  options: RunOptions = {},
): Promise<void> {
  const swarmDir = path.join(projectDir, '.swarm');
  if (!fs.existsSync(swarmDir)) {
    console.error('Project not initialized. Run `swarm init` first.');
    process.exit(1);
  }

  // Initialize infrastructure
  const dbPath = path.join(swarmDir, 'memory.db');
  const db = createDatabase(dbPath);
  const bus = new SignalBus();
  const signalStore = new SignalStore(db);
  const memory = new MemoryManager(db);
  const missionStore = new MissionStore(db);
  const checkpoints = new CheckpointManager(db);
  const registry = new DroneRegistry();
  const planner = new MissionPlanner();

  // Register built-in drones (placeholder executors for now)
  const builtinDrones = getBuiltinDrones();
  for (const drone of builtinDrones) {
    registry.register(drone);
  }

  // Analyze
  const analyzer = new ContextAnalyzer(registry, memory);
  const profile = analyzer.analyze(description, projectDir);

  console.log(`Mission: ${description}`);
  console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
  console.log(`Drones: ${profile.recommendedDrones.map((d) => d.manifest.name).join(', ')}`);
  console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);

  // Start dashboard
  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard) {
    const port = options.port ?? 3000;
    dashboard = new DashboardServer(bus, { port });
    const address = await dashboard.start();
    console.log(`Dashboard: http://localhost:${address.port}`);
  }

  // Persist signals to store
  bus.on('*', (signal) => {
    signalStore.save(signal);
  });

  // Run mission
  const missionId = createMissionId();
  const drones = profile.recommendedDrones.map((d) => d.manifest);

  const runner = new MissionRunner({
    bus,
    memory,
    missionStore,
    checkpoints,
    planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() {
        // Placeholder — real executors will be implemented in the drones package
        return { summary: `${_name} completed (placeholder)` };
      },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  console.log(`\nMission ${result.status}`);
  if (result.completedDrones.length) {
    console.log(`  Completed: ${result.completedDrones.join(', ')}`);
  }
  if (result.failedDrones.length) {
    console.log(`  Failed: ${result.failedDrones.join(', ')}`);
  }

  // Cleanup
  if (dashboard) await dashboard.stop();
  db.close();
}

function getBuiltinDrones(): DroneManifest[] {
  return [
    {
      name: 'scout',
      description: 'Explores codebase, maps context',
      triggers: {},
      opinions: { requires: [], suggests: [], blocks: [] },
      signals: { emits: ['scout.done'], listens: [] },
      priority: 100,
      escalation: 'user',
    },
    {
      name: 'architect',
      description: 'Designs system architecture',
      triggers: { taskSize: 'large' },
      opinions: { requires: ['spec before code'], suggests: [], blocks: [] },
      signals: { emits: ['architect.done'], listens: ['scout.done'] },
      priority: 90,
      escalation: 'user',
    },
    {
      name: 'coder',
      description: 'Implements code',
      triggers: {},
      opinions: { requires: [], suggests: [], blocks: [] },
      signals: { emits: ['coder.done'], listens: ['architect.done'] },
      priority: 50,
      escalation: 'user',
    },
    {
      name: 'tester',
      description: 'Writes and runs tests',
      triggers: {},
      opinions: { requires: ['test coverage'], suggests: [], blocks: [] },
      signals: { emits: ['tester.done'], listens: ['coder.done'] },
      priority: 40,
      escalation: 'user',
    },
    {
      name: 'debugger',
      description: 'Systematic root-cause analysis',
      triggers: { keywords: ['bug', 'error', 'debug', 'crash'] },
      opinions: { requires: [], suggests: [], blocks: [] },
      signals: { emits: ['debugger.done'], listens: [] },
      priority: 85,
      escalation: 'user',
    },
    {
      name: 'security',
      description: 'Flags vulnerabilities',
      triggers: { keywords: ['auth', 'payment', 'token', 'password', 'credential'] },
      opinions: { requires: [], suggests: [], blocks: ['insecure patterns'] },
      signals: { emits: ['security.done'], listens: ['scout.done'] },
      priority: 80,
      escalation: 'user',
    },
    {
      name: 'reviewer',
      description: 'Final quality check',
      triggers: {},
      opinions: { requires: [], suggests: [], blocks: [] },
      signals: { emits: ['reviewer.done'], listens: ['coder.done', 'tester.done'] },
      priority: 10,
      escalation: 'user',
    },
    {
      name: 'docs',
      description: 'Documentation generation',
      triggers: { taskSize: 'large' },
      opinions: { requires: [], suggests: ['document public APIs'], blocks: [] },
      signals: { emits: ['docs.done'], listens: ['coder.done'] },
      priority: 5,
      escalation: 'user',
    },
  ];
}
```

- [ ] **Step 2: Update CLI entry point to include run command**

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';
import { runMission } from './commands/run.js';

const program = new Command();

program
  .name('swarm')
  .description('Adaptive Claude Code orchestration framework')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize swarm in the current project')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    initProject(dir);
    console.log('Swarm initialized in', dir);
  });

program
  .command('run')
  .description('Start a new mission')
  .argument('<description>', 'What you want to accomplish')
  .option('--no-dashboard', 'Run without the browser dashboard')
  .option('--drones <names>', 'Comma-separated list of drones to activate')
  .option('--scope <scope>', 'Override scope detection (trivial|small|medium|large|epic)')
  .option('--no-analyze', 'Skip the context analyzer')
  .option('--port <port>', 'Dashboard port', '3000')
  .action(async (description: string, options) => {
    await runMission(description, process.cwd(), {
      noDashboard: !options.dashboard,
      drones: options.drones,
      scope: options.scope,
      noAnalyze: !options.analyze,
      port: parseInt(options.port, 10),
    });
  });

program.parse();
```

- [ ] **Step 3: Build and verify**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

Expected: Both packages compile with no errors.

- [ ] **Step 4: Run all tests across the monorepo**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm test
```

Expected: All tests pass across both packages.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/run.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm run command with full mission lifecycle"
```

---

## Task 24: End-to-End Integration Test

**Files:**
- Create: `packages/cli/tests/commands/run.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// packages/cli/tests/commands/run.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMission } from '../../src/commands/run.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('runMission (integration)', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-e2e-'));
    originalCwd = process.cwd();

    // Create a fake project
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      devDependencies: { typescript: '5.0.0', vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');

    initProject(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs a trivial mission end-to-end', async () => {
    await runMission('fix a typo', tmpDir, { noDashboard: true });

    // Verify mission was persisted
    const dbPath = path.join(tmpDir, '.swarm', 'memory.db');
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('runs a large mission with multiple drones', async () => {
    await runMission(
      'build a complete payment system with auth integration',
      tmpDir,
      { noDashboard: true },
    );

    const dbPath = path.join(tmpDir, '.swarm', 'memory.db');
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the integration test**

```bash
cd packages/cli && pnpm test -- tests/commands/run.test.ts
```

Expected: PASS — both integration tests green.

- [ ] **Step 3: Run full test suite one final time**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm test
```

Expected: All tests pass across both packages (approximately 70+ tests).

- [ ] **Step 4: Commit**

```bash
git add packages/cli/tests/commands/run.test.ts
git commit -m "test(cli): add end-to-end integration tests for mission lifecycle"
```

- [ ] **Step 5: Final build verification**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test && echo "BUILD AND TESTS PASS"
```

Expected: `BUILD AND TESTS PASS`

- [ ] **Step 6: Tag the milestone**

```bash
git tag v0.1.0-core -m "Core engine and CLI foundation"
```
