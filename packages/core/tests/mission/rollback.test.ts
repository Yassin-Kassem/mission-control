import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionRollback } from '../../src/mission/rollback.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('MissionRollback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-rollback-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'original');
    execSync('git add -A && git commit -m "initial"', { cwd: tmpDir });
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates a snapshot before mission', () => {
    const rb = new MissionRollback(tmpDir);
    const tag = rb.snapshot('m1');
    expect(tag).toBe('mission-pre-m1');
    const tags = execSync('git tag', { cwd: tmpDir, encoding: 'utf-8' });
    expect(tags).toContain('mission-pre-m1');
  });

  it('rolls back to pre-mission state', () => {
    const rb = new MissionRollback(tmpDir);
    rb.snapshot('m1');
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed by mission');
    execSync('git add -A && git commit -m "mission change"', { cwd: tmpDir });
    rb.rollback('m1');
    const content = fs.readFileSync(path.join(tmpDir, 'file.txt'), 'utf-8');
    expect(content).toBe('original');
  });

  it('throws if no snapshot exists for mission', () => {
    const rb = new MissionRollback(tmpDir);
    expect(() => rb.rollback('nonexistent')).toThrow('No snapshot');
  });

  it('lists available snapshots', () => {
    const rb = new MissionRollback(tmpDir);
    rb.snapshot('m1');
    rb.snapshot('m2');
    const snapshots = rb.listSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots).toContain('mission-pre-m1');
    expect(snapshots).toContain('mission-pre-m2');
  });
});
