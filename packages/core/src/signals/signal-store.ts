import type { SwarmDatabase } from '../db.js';
import type { Signal } from './signal.js';

export class SignalStore {
  constructor(private db: SwarmDatabase) {}

  save(signal: Signal): void {
    this.db.raw
      .prepare(
        `INSERT INTO signals (type, source, topic, severity, payload, mission_id, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        signal.type,
        signal.source,
        signal.topic,
        signal.severity,
        JSON.stringify(signal.payload),
        signal.missionId,
        signal.timestamp,
      );
  }

  saveBatch(signals: Signal[]): void {
    const insert = this.db.raw.prepare(
      `INSERT INTO signals (type, source, topic, severity, payload, mission_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    const tx = this.db.raw.transaction((items: Signal[]) => {
      for (const s of items) {
        insert.run(s.type, s.source, s.topic, s.severity, JSON.stringify(s.payload), s.missionId, s.timestamp);
      }
    });

    tx(signals);
  }

  getByMission(missionId: string): Signal[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM signals WHERE mission_id = ? ORDER BY timestamp ASC')
      .all(missionId) as SignalRow[];

    return rows.map(rowToSignal);
  }

  getByTopic(topic: string): Signal[] {
    const rows = this.db.raw
      .prepare('SELECT * FROM signals WHERE topic = ? ORDER BY timestamp ASC')
      .all(topic) as SignalRow[];

    return rows.map(rowToSignal);
  }

  deleteByMission(missionId: string): void {
    this.db.raw.prepare('DELETE FROM signals WHERE mission_id = ?').run(missionId);
  }
}

interface SignalRow {
  id: number;
  type: string;
  source: string;
  topic: string;
  severity: string;
  payload: string;
  mission_id: string;
  timestamp: number;
}

function rowToSignal(row: SignalRow): Signal {
  return {
    type: row.type as Signal['type'],
    source: row.source,
    topic: row.topic,
    severity: row.severity as Signal['severity'],
    payload: JSON.parse(row.payload),
    missionId: row.mission_id,
    timestamp: row.timestamp,
  };
}
