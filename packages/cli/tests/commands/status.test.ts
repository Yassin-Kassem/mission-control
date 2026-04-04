import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStatus } from '../../src/commands/status.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getStatus', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-status-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns status with no missions', () => {
    const status = getStatus(tmpDir);
    expect(status.totalMissions).toBe(0);
    expect(status.latestMission).toBeUndefined();
    expect(status.memoryStats.short).toBe(0);
    expect(status.memoryStats.working).toBe(0);
    expect(status.memoryStats.long).toBe(0);
    expect(status.registeredDrones).toBeGreaterThan(0);
  });

  it('returns status with missions', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test mission');
    ctx.missionStore.complete('m1', 'done');
    ctx.close();
    const status = getStatus(tmpDir);
    expect(status.totalMissions).toBe(1);
    expect(status.latestMission?.id).toBe('m1');
    expect(status.latestMission?.status).toBe('completed');
  });

  it('includes memory stats', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'ts');
    ctx.memory.long.set('user.pref', 'minimal');
    ctx.close();
    const status = getStatus(tmpDir);
    expect(status.memoryStats.working).toBe(1);
    expect(status.memoryStats.long).toBe(1);
  });
});
