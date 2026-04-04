import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityExecutor } from '../../../src/drones/executors/security-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SecurityExecutor', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-sec-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('detects audit command for Node projects', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    expect(sec.getAuditCommand()).toBe('npm audit --json');
  });

  it('returns no-audit when no lock file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    expect(sec.getAuditCommand()).toBeNull();
  });

  it('execute returns result with audit info', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    const result = await sec.execute();
    expect(result.summary).toBeDefined();
    expect(result.auditAvailable).toBeDefined();
  });
});
