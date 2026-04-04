import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scaffoldDrone } from '../src/scaffold.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('scaffoldDrone', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-scaffold-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates drone directory with all files', () => {
    const files = scaffoldDrone('my-drone', tmpDir);
    expect(files).toContain('drone.yaml');
    expect(files).toContain('package.json');
    expect(files).toContain('skills/main.md');
    expect(files).toContain('tests/drone.test.ts');
    expect(files).toContain('README.md');

    expect(fs.existsSync(path.join(tmpDir, 'my-drone', 'drone.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my-drone', 'skills', 'main.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my-drone', 'tests', 'drone.test.ts'))).toBe(true);
  });

  it('generates valid manifest', () => {
    scaffoldDrone('my-lint', tmpDir);
    const yaml = fs.readFileSync(path.join(tmpDir, 'my-lint', 'drone.yaml'), 'utf-8');
    expect(yaml).toContain('name: my-lint');
    expect(yaml).toContain('my-lint.done');
  });

  it('throws if directory exists', () => {
    scaffoldDrone('my-drone', tmpDir);
    expect(() => scaffoldDrone('my-drone', tmpDir)).toThrow('already exists');
  });

  it('generates package.json with correct name', () => {
    scaffoldDrone('security-check', tmpDir);
    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'security-check', 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('@mctl/drone-security-check');
    expect(pkg.keywords).toContain('mission-control');
    expect(pkg.keywords).toContain('drone');
  });
});
