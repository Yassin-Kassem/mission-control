import Database from 'better-sqlite3';

export interface SwarmDatabase {
  raw: Database.Database;
  close(): void;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    topic TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    payload TEXT NOT NULL DEFAULT '{}',
    mission_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer TEXT NOT NULL CHECK(layer IN ('short', 'working', 'long')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    mission_id TEXT,
    UNIQUE(layer, key)
  );

  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    phase TEXT NOT NULL DEFAULT 'analyze',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER,
    result TEXT
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    label TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_signals_mission ON signals(mission_id);
  CREATE INDEX IF NOT EXISTS idx_signals_topic ON signals(topic);
  CREATE INDEX IF NOT EXISTS idx_memory_layer ON memory(layer);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_mission ON checkpoints(mission_id);
`;

export function createDatabase(dbPath: string): SwarmDatabase {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  return {
    raw: db,
    close() {
      db.close();
    },
  };
}
