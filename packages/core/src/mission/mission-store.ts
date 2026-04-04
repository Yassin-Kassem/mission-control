import type { SwarmDatabase } from '../db.js';
import type { Mission, MissionPhase, MissionStatus } from './mission.js';

export class MissionStore {
  constructor(private db: SwarmDatabase) {}

  create(id: string, description: string): Mission {
    const now = Date.now();
    this.db.raw.prepare(`INSERT INTO missions (id, description, status, phase, created_at, updated_at) VALUES (?, ?, 'pending', 'analyze', ?, ?)`).run(id, description, now, now);
    return { id, description, status: 'pending', phase: 'analyze', createdAt: now, updatedAt: now };
  }

  get(id: string): Mission | undefined {
    const row = this.db.raw.prepare('SELECT * FROM missions WHERE id = ?').get(id) as MissionRow | undefined;
    return row ? rowToMission(row) : undefined;
  }

  update(id: string, changes: { status?: MissionStatus; phase?: MissionPhase }): void {
    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [Date.now()];
    if (changes.status) { sets.push('status = ?'); values.push(changes.status); }
    if (changes.phase) { sets.push('phase = ?'); values.push(changes.phase); }
    values.push(id);
    this.db.raw.prepare(`UPDATE missions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  complete(id: string, result: string): void {
    const now = Date.now();
    this.db.raw.prepare(`UPDATE missions SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`).run(result, now, now, id);
  }

  list(limit = 50): Mission[] {
    const rows = this.db.raw.prepare('SELECT * FROM missions ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as MissionRow[];
    return rows.map(rowToMission);
  }
}

interface MissionRow {
  id: string; description: string; status: string; phase: string;
  created_at: number; updated_at: number; completed_at: number | null; result: string | null;
}

function rowToMission(row: MissionRow): Mission {
  return {
    id: row.id, description: row.description,
    status: row.status as MissionStatus, phase: row.phase as MissionPhase,
    createdAt: row.created_at, updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined, result: row.result ?? undefined,
  };
}
