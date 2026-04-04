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

  it('tracks drone count', () => {
    missions.create('m1', 'small fix');
    signals.save(createSignal({ type: 'progress', source: 'scout', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'scout' } }));
    signals.save(createSignal({ type: 'progress', source: 'architect', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'architect' } }));
    signals.save(createSignal({ type: 'progress', source: 'coder', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'coder' } }));
    signals.save(createSignal({ type: 'progress', source: 'tester', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'tester' } }));
    signals.save(createSignal({ type: 'progress', source: 'reviewer', topic: 'drone.done', severity: 'info', missionId: 'm1', payload: { drone: 'reviewer' } }));
    missions.complete('m1', 'done');
    learner.learnFromMission('m1');
    expect(memory.working.get('pattern.last-drone-count')).toBe('5');
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
