import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listMemory, promoteMemory, forgetMemory } from '../../src/commands/memory.js';
import { initProject } from '../../src/commands/init.js';
import { loadProjectContext } from '../../src/context.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('listMemory', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-mem-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns all memory entries grouped by layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.memory.long.set('user.pref', 'minimal');
    ctx.close();
    const result = listMemory(tmpDir);
    expect(result.working).toHaveLength(1);
    expect(result.long).toHaveLength(1);
    expect(result.short).toHaveLength(0);
  });

  it('filters by layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('a', '1');
    ctx.memory.long.set('b', '2');
    ctx.close();
    const result = listMemory(tmpDir, 'working');
    expect(result.working).toHaveLength(1);
    expect(result.long).toHaveLength(0);
  });
});

describe('promoteMemory', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-mem-promote-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('promotes a key from one layer to another', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.close();
    promoteMemory(tmpDir, 'project.lang', 'working', 'long');
    const ctx2 = loadProjectContext(tmpDir);
    expect(ctx2.memory.long.get('project.lang')).toBe('typescript');
    expect(ctx2.memory.working.get('project.lang')).toBeUndefined();
    ctx2.close();
  });
});

describe('forgetMemory', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-mem-forget-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('deletes a key from a layer', () => {
    const ctx = loadProjectContext(tmpDir);
    ctx.memory.working.set('project.lang', 'typescript');
    ctx.close();
    forgetMemory(tmpDir, 'project.lang', 'working');
    const ctx2 = loadProjectContext(tmpDir);
    expect(ctx2.memory.working.get('project.lang')).toBeUndefined();
    ctx2.close();
  });
});
