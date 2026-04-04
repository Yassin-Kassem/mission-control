import { describe, it, expect, vi } from 'vitest';
import { Broadcaster } from '../../src/dashboard/broadcaster.js';
import { SignalBus, createSignal } from '@swarm/core';

describe('Broadcaster', () => {
  it('relays signals to registered listeners', () => {
    const bus = new SignalBus();
    const broadcaster = new Broadcaster(bus);
    const listener = vi.fn();
    broadcaster.addListener(listener);
    bus.emit(createSignal({
      type: 'progress', source: 'test', topic: 'test.event',
      severity: 'info', payload: {}, missionId: 'm1',
    }));
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
    bus.emit(createSignal({
      type: 'progress', source: 'test', topic: 'test.event',
      severity: 'info', payload: {}, missionId: 'm1',
    }));
    expect(listener).not.toHaveBeenCalled();
  });
});
