import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMission } from '../../src/commands/run.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('runMission (integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-e2e-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      devDependencies: { typescript: '5.0.0', vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');
    initProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs a trivial mission end-to-end', async () => {
    await runMission('fix a typo', tmpDir, { noDashboard: true });
    const dbPath = path.join(tmpDir, '.swarm', 'memory.db');
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('runs a large mission with multiple drones', async () => {
    await runMission(
      'build a complete payment system with auth integration',
      tmpDir,
      { noDashboard: true },
    );
    const dbPath = path.join(tmpDir, '.swarm', 'memory.db');
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
