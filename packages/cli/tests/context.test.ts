import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadProjectContext } from '../src/context.js';
import { initProject } from '../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('loadProjectContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-ctx-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads all stores from project directory', () => {
    const ctx = loadProjectContext(tmpDir);
    expect(ctx.db).toBeDefined();
    expect(ctx.missionStore).toBeDefined();
    expect(ctx.signalStore).toBeDefined();
    expect(ctx.memory).toBeDefined();
    expect(ctx.checkpoints).toBeDefined();
    expect(ctx.registry).toBeDefined();
    ctx.close();
  });

  it('throws if project not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-empty-'));
    expect(() => loadProjectContext(emptyDir)).toThrow('not initialized');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('registers builtin drones', () => {
    const ctx = loadProjectContext(tmpDir);
    const drones = ctx.registry.list();
    expect(drones.length).toBeGreaterThan(0);
    expect(drones.map((d) => d.name)).toContain('scout');
    expect(drones.map((d) => d.name)).toContain('coder');
    ctx.close();
  });
});
