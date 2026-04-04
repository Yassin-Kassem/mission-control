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
    name, description: `${name} drone`, triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [`${name}.done`], listens: [] }, priority, escalation: 'user',
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
    executors.set('scout', { execute: vi.fn().mockResolvedValue({ summary: 'scanned 10 files' }) });
    executors.set('coder', { execute: vi.fn().mockResolvedValue({ summary: 'implemented feature' }) });
    runner = new MissionRunner({
      bus, memory, missionStore, checkpoints, planner: new MissionPlanner(),
      resolveExecutor: (name: string) => executors.get(name)!,
    });
  });

  afterEach(() => { db.close(); });

  it('runs a complete mission lifecycle', async () => {
    const result = await runner.run('m1', 'test task', [registry.get('scout')!, registry.get('coder')!]);
    expect(result.status).toBe('completed');
    const mission = missionStore.get('m1');
    expect(mission?.status).toBe('completed');
  });

  it('creates checkpoints during mission', async () => {
    await runner.run('m1', 'test task', [registry.get('scout')!, registry.get('coder')!]);
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
    executors.set('scout', { execute: vi.fn().mockRejectedValue(new Error('crash')) });
    const result = await runner.run('m1', 'test task', [registry.get('scout')!]);
    expect(result.status).toBe('completed');
    expect(result.failedDrones).toContain('scout');
  });
});
