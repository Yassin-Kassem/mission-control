import type { SwarmDatabase } from '../db.js';
import type { MemoryEntry, MemoryLayerName } from './memory-entry.js';

export class MemoryLayer {
  constructor(
    private db: SwarmDatabase,
    private layer: MemoryLayerName,
  ) {}

  get(key: string): string | undefined {
    const row = this.db.raw
      .prepare('SELECT value FROM memory WHERE layer = ? AND key = ?')
      .get(this.layer, key) as { value: string } | undefined;

    return row?.value;
  }

  set(key: string, value: string, missionId?: string): void {
    const now = Date.now();
    this.db.raw
      .prepare(
        `INSERT INTO memory (layer, key, value, created_at, updated_at, mission_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(layer, key) DO UPDATE SET value = ?, updated_at = ?`,
      )
      .run(this.layer, key, value, now, now, missionId ?? null, value, now);
  }

  delete(key: string): void {
    this.db.raw.prepare('DELETE FROM memory WHERE layer = ? AND key = ?').run(this.layer, key);
  }

  list(): MemoryEntry[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM memory WHERE layer = ? ORDER BY key ASC')
      .all(this.layer) as MemoryRow[];

    return rows.map(rowToEntry);
  }

  search(keyPrefix: string): MemoryEntry[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM memory WHERE layer = ? AND key LIKE ? ORDER BY key ASC')
      .all(this.layer, keyPrefix + '%') as MemoryRow[];

    return rows.map(rowToEntry);
  }

  clear(): void {
    this.db.raw.prepare('DELETE FROM memory WHERE layer = ?').run(this.layer);
  }
}

interface MemoryRow {
  id: number;
  layer: string;
  key: string;
  value: string;
  created_at: number;
  updated_at: number;
  mission_id: string | null;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    layer: row.layer as MemoryLayerName,
    key: row.key,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    missionId: row.mission_id ?? undefined,
  };
}
