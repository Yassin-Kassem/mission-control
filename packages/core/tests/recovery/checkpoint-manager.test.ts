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
    db.raw.prepare("INSERT INTO missions (id, description, status, phase, created_at, updated_at) VALUES (?, ?, 'pending', 'analyze', ?, ?)").run('m1', 'test', Date.now(), Date.now());
    db.raw.prepare("INSERT INTO missions (id, description, status, phase, created_at, updated_at) VALUES (?, ?, 'pending', 'analyze', ?, ?)").run('m2', 'test2', Date.now(), Date.now());
  });
  afterEach(() => { db.close(); });

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
