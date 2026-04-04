import type { SignalBus, Signal } from '@mctl/core';

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
