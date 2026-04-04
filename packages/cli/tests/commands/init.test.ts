import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('initProject', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-init-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates .mctl directory with config.yaml', () => {
    initProject(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.mctl'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.mctl', 'config.yaml'))).toBe(true);
    const config = fs.readFileSync(path.join(tmpDir, '.mctl', 'config.yaml'), 'utf-8');
    expect(config).toContain('drones:');
  });

  it('creates checkpoints directory', () => {
    initProject(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.mctl', 'checkpoints'))).toBe(true);
  });

  it('appends to existing .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.mctl/memory.db');
    expect(gitignore).toContain('.mctl/checkpoints/');
  });

  it('creates .gitignore if it does not exist', () => {
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.mctl/memory.db');
  });

  it('does not duplicate gitignore entries on re-init', () => {
    initProject(tmpDir);
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const matches = gitignore.match(/\.mctl\/memory\.db/g);
    expect(matches).toHaveLength(1);
  });
});
