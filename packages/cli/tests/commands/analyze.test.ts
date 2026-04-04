import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeMission } from '../../src/commands/analyze.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('analyzeMission', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-analyze-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '5.0.0', vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns structured analysis for a build task', () => {
    const result = analyzeMission('build a payment system', tmpDir);
    expect(result.intent).toBe('build');
    expect(result.scope).toBeDefined();
    expect(result.drones).toBeInstanceOf(Array);
    expect(result.drones.length).toBeGreaterThan(0);
    expect(result.plan).toBeInstanceOf(Array);
    expect(result.missionId).toBeDefined();
  });

  it('returns correct drone list for trivial task', () => {
    const result = analyzeMission('fix typo', tmpDir);
    expect(result.intent).toBe('fix');
    expect(result.scope).toBe('trivial');
    expect(result.drones.map((d) => d.name)).toContain('coder');
    expect(result.drones.map((d) => d.name)).not.toContain('architect');
  });

  it('includes parallel groups in plan', () => {
    const result = analyzeMission('build a complete auth system', tmpDir);
    expect(result.plan.length).toBeGreaterThan(0);
    for (const step of result.plan) {
      expect(step.droneName).toBeDefined();
      expect(step.parallelGroup).toBeDefined();
      expect(step.type).toMatch(/^(ai|tool)$/);
    }
  });
});
