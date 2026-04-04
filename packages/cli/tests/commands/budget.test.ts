import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getMissionBudget } from '../../src/commands/budget.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import { createSignal } from '@missionctl/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getMissionBudget', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-budget-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns token summary for past missions', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.missionStore.create('m1', 'test');
    ctx.signalStore.save(createSignal({
      type: 'progress', source: 'coder', topic: 'drone.done',
      severity: 'info', payload: { drone: 'coder' }, missionId: 'm1',
    }));
    ctx.missionStore.complete('m1', 'done');
    ctx.close();
    const budget = getMissionBudget(tmpDir);
    expect(budget.totalMissions).toBe(1);
    expect(budget.totalSignals).toBeGreaterThan(0);
  });
});
