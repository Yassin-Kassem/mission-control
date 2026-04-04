import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig } from '../../src/commands/config.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('getConfig', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-config-'));
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('reads the config file', () => {
    const config = getConfig(tmpDir);
    expect(config).toContain('drones:');
    expect(config).toContain('dashboard:');
  });

  it('throws if not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-empty-'));
    expect(() => getConfig(emptyDir)).toThrow();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
