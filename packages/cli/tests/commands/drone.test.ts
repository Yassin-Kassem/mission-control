import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listDrones, getDroneInfo } from '../../src/commands/drone.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('listDrones', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-drone-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('lists all registered drones', () => {
    const drones = listDrones(tmpDir);
    expect(drones.length).toBeGreaterThan(0);
    const names = drones.map((d) => d.name);
    expect(names).toContain('scout');
    expect(names).toContain('architect');
    expect(names).toContain('coder');
    expect(names).toContain('tester');
    expect(names).toContain('security');
    expect(names).toContain('reviewer');
  });

  it('returns drones sorted by priority', () => {
    const drones = listDrones(tmpDir);
    expect(drones[0].name).toBe('scout');
  });
});

describe('getDroneInfo', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-drone-info-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns info for a known drone', () => {
    const info = getDroneInfo(tmpDir, 'scout');
    expect(info).toBeDefined();
    expect(info!.name).toBe('scout');
    expect(info!.description).toBeDefined();
  });

  it('returns undefined for unknown drone', () => {
    const info = getDroneInfo(tmpDir, 'nonexistent');
    expect(info).toBeUndefined();
  });
});
