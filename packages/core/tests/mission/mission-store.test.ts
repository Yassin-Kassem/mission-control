import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionStore } from '../../src/mission/mission-store.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MissionStore', () => {
  let db: SwarmDatabase;
  let store: MissionStore;

  beforeEach(() => { db = createDatabase(':memory:'); store = new MissionStore(db); });
  afterEach(() => { db.close(); });

  it('creates and retrieves a mission', () => {
    const mission = store.create('m1', 'Build payment system');
    expect(mission.id).toBe('m1');
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
