import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase, type SwarmDatabase } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SwarmDatabase', () => {
  const testDbPath = path.join(os.tmpdir(), `swarm-test-${Date.now()}.db`);
  let db: SwarmDatabase;

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('creates database with all tables', () => {
    db = createDatabase(testDbPath);

    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('signals');
    expect(tableNames).toContain('memory');
    expect(tableNames).toContain('missions');
    expect(tableNames).toContain('checkpoints');
  });

  it('creates in-memory database when no path given', () => {
    db = createDatabase(':memory:');

    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    expect(tables.length).toBeGreaterThan(0);
  });
});
