import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScoutExecutor } from '../../../src/drones/executors/scout-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ScoutExecutor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-scout-'));
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { express: '4.0.0' },
      devDependencies: { vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');
    fs.writeFileSync(path.join(tmpDir, 'src', 'utils.ts'), 'export const y = 2;');
    fs.mkdirSync(path.join(tmpDir, 'tests'));
    fs.writeFileSync(path.join(tmpDir, 'tests', 'app.test.ts'), 'test("x", () => {})');
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns file count and list', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.summary).toContain('files');
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
  });

  it('detects source and test files', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.files.some((f) => f.includes('app.ts'))).toBe(true);
    expect(result.files.some((f) => f.includes('app.test.ts'))).toBe(true);
  });

  it('detects project languages and frameworks', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.languages).toContain('typescript');
    expect(result.frameworks).toContain('express');
  });

  it('reports directory structure', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.directories).toBeInstanceOf(Array);
    expect(result.directories).toContain('src');
    expect(result.directories).toContain('tests');
  });
});
