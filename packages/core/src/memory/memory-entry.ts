export type MemoryLayerName = 'short' | 'working' | 'long';

export interface MemoryEntry {
  id?: number;
  layer: MemoryLayerName;
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
  missionId?: string;
}

export function createMemoryEntry(
  partial: Omit<MemoryEntry, 'createdAt' | 'updatedAt' | 'id'> & {
    createdAt?: number;
    updatedAt?: number;
  },
): MemoryEntry {
  const now = Date.now();
  return {
    ...partial,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}
