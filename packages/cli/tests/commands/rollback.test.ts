import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSnapshot, rollbackMission, listSnapshots } from '../../src/commands/rollback.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('rollback commands', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-rb-cmd-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'original');
    execSync('git add -A && git commit -m "initial"', { cwd: tmpDir });
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates and lists snapshots', () => {
    createSnapshot('m1', tmpDir);
    const snaps = listSnapshots(tmpDir);
    expect(snaps).toContain('swarm-pre-m1');
  });

  it('rolls back changes', () => {
    createSnapshot('m1', tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
    execSync('git add -A && git commit -m "change"', { cwd: tmpDir });
    rollbackMission('m1', tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'file.txt'), 'utf-8');
    expect(content).toBe('original');
  });
});
