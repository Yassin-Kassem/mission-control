import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('initProject', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-init-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates .swarm directory with config.yaml', () => {
    initProject(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.swarm'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.swarm', 'config.yaml'))).toBe(true);
    const config = fs.readFileSync(path.join(tmpDir, '.swarm', 'config.yaml'), 'utf-8');
    expect(config).toContain('drones:');
  });

  it('creates checkpoints directory', () => {
    initProject(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.swarm', 'checkpoints'))).toBe(true);
  });

  it('appends to existing .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.swarm/memory.db');
    expect(gitignore).toContain('.swarm/checkpoints/');
  });

  it('creates .gitignore if it does not exist', () => {
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.swarm/memory.db');
  });

  it('does not duplicate gitignore entries on re-init', () => {
    initProject(tmpDir);
    initProject(tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const matches = gitignore.match(/\.swarm\/memory\.db/g);
    expect(matches).toHaveLength(1);
  });
});
