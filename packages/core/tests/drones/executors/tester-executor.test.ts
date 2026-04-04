import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TesterExecutor } from '../../../src/drones/executors/tester-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('TesterExecutor', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-tester-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('detects test command from package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest run' } }));
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBe('npm test');
  });

  it('uses pnpm when pnpm-lock.yaml exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest run' } }));
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBe('pnpm test');
  });

  it('returns not-found when no test command exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBeNull();
  });

  it('detects pytest for Python projects', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'pytest==7.0\n');
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBe('pytest');
  });

  it('execute returns result with command info', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'echo "1 passed"' } }));
    const tester = new TesterExecutor(tmpDir);
    const result = await tester.execute();
    expect(result.summary).toBeDefined();
    expect(result.command).toBeDefined();
    expect(result.exitCode).toBeDefined();
  });
});
