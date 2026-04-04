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
