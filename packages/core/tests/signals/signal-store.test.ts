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
