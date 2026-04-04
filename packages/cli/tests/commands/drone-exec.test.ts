import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execDrone } from '../../src/commands/drone-exec.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('execDrone', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-exec-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '1.0.0' },
    }));
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');
    initProject(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('executes scout drone and returns result', async () => {
    const result = await execDrone('scout', tmpDir);
    expect(result.summary).toContain('files');
  });

  it('executes tester drone', async () => {
    const result = await execDrone('tester', tmpDir);
    expect(result.summary).toBeDefined();
  });

  it('executes security drone', async () => {
    const result = await execDrone('security', tmpDir);
    expect(result.summary).toBeDefined();
  });

  it('throws for unknown drone', async () => {
    await expect(execDrone('nonexistent', tmpDir)).rejects.toThrow('Unknown tool drone');
  });

  it('throws for AI-only drone', async () => {
    await expect(execDrone('architect', tmpDir)).rejects.toThrow('requires Claude Code');
  });
});
