import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getReplay } from '../../src/commands/replay.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import { createSignal } from '@mctl/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getReplay', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-replay-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns signals for a mission', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test');
    ctx.signalStore.save(createSignal({ type: 'progress', source: 'scout', topic: 'drone.activated', severity: 'info', payload: { drone: 'scout' }, missionId: 'm1' }));
    ctx.signalStore.save(createSignal({ type: 'finding', source: 'scout', topic: 'file.found', severity: 'info', payload: { path: 'src/app.ts' }, missionId: 'm1' }));
    ctx.close();
    const replay = getReplay(tmpDir, 'm1');
    expect(replay.mission?.id).toBe('m1');
    expect(replay.signals).toHaveLength(2);
    expect(replay.signals[0].topic).toBe('drone.activated');
  });

  it('returns undefined mission for unknown id', () => {
    const replay = getReplay(tmpDir, 'nonexistent');
    expect(replay.mission).toBeUndefined();
    expect(replay.signals).toHaveLength(0);
  });
});
