import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHistory } from '../../src/commands/history.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getHistory', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-hist-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns empty list when no missions', () => {
    const history = getHistory(tmpDir);
    expect(history).toHaveLength(0);
  });

  it('returns missions in reverse chronological order', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'first');
    ctx.missionStore.create('m2', 'second');
    ctx.close();
    const history = getHistory(tmpDir);
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('m2');
    expect(history[1].id).toBe('m1');
  });

  it('respects limit parameter', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'first');
    ctx.missionStore.create('m2', 'second');
    ctx.missionStore.create('m3', 'third');
    ctx.close();
    const history = getHistory(tmpDir, 2);
    expect(history).toHaveLength(2);
  });
});
