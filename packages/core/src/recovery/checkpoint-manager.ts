import type { SwarmDatabase } from '../db.js';
import type { Checkpoint, CheckpointData } from './checkpoint.js';

export class CheckpointManager {
  constructor(private db: SwarmDatabase) {}

  create(missionId: string, label: string, data: CheckpointData): Checkpoint {
    const now = Date.now();
    const serialized = JSON.stringify(data);
    this.db.raw.prepare('INSERT INTO checkpoints (mission_id, label, data, created_at) VALUES (?, ?, ?, ?)').run(missionId, label, serialized, now);
    return { missionId, label, data, createdAt: now };
  }

  getLatest(missionId: string): Checkpoint | undefined {
    const row = this.db.raw.prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(missionId) as CheckpointRow | undefined;
    return row ? rowToCheckpoint(row) : undefined;
  }

  listByMission(missionId: string): Checkpoint[] {
    const rows = this.db.raw.prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY created_at ASC').all(missionId) as CheckpointRow[];
    return rows.map(rowToCheckpoint);
  }

  deleteByMission(missionId: string): void {
    this.db.raw.prepare('DELETE FROM checkpoints WHERE mission_id = ?').run(missionId);
  }
}

interface CheckpointRow {
  id: number;
  mission_id: string;
  label: string;
  data: string;
  created_at: number;
}

function rowToCheckpoint(row: CheckpointRow): Checkpoint {
  return { id: row.id, missionId: row.mission_id, label: row.label, data: JSON.parse(row.data), createdAt: row.created_at };
}
