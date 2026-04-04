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
