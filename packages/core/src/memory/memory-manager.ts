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
