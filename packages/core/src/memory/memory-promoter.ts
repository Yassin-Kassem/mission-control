import type { MemoryManager } from './memory-manager.js';
import type { MemoryLayerName } from './memory-entry.js';

interface Promotion {
  key: string;
  from: MemoryLayerName;
  to: MemoryLayerName;
}

const PROMOTION_RULES: { prefix: string; target: MemoryLayerName }[] = [
  { prefix: 'project.', target: 'working' },
  { prefix: 'user.', target: 'long' },
  { prefix: 'pattern.', target: 'working' },
  { prefix: 'correction.', target: 'long' },
];

export class MemoryPromoter {
  constructor(private memory: MemoryManager) {}

  scanAndPromote(): Promotion[] {
    const promoted: Promotion[] = [];
    const shortEntries = this.memory.short.list();

    for (const entry of shortEntries) {
      const rule = PROMOTION_RULES.find((r) => entry.key.startsWith(r.prefix));
      if (!rule) continue;

      const targetLayer =
        rule.target === 'working' ? this.memory.working : this.memory.long;

      if (targetLayer.get(entry.key) !== undefined) continue;

      targetLayer.set(entry.key, entry.value);
      this.memory.short.delete(entry.key);
      promoted.push({ key: entry.key, from: 'short', to: rule.target });
    }

    return promoted;
  }
}
