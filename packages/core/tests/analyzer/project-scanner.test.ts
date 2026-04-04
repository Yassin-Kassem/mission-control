import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanProject } from '../../src/analyzer/project-scanner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('scanProject', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-scan-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('detects TypeScript project with package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { next: '14.0.0' },
      devDependencies: { typescript: '5.0.0', jest: '29.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'console.log("hello")');
    const info = scanProject(tmpDir);
    expect(info.languages).toContain('typescript');
    expect(info.frameworks).toContain('next.js');
    expect(info.hasTests).toBe(true);
    expect(info.testRunner).toBe('jest');
    expect(info.packageManager).toBe('npm');
  });

  it('detects Python project with requirements.txt', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django==4.0\npytest==7.0\n');
    fs.writeFileSync(path.join(tmpDir, 'app.py'), 'print("hello")');
    const info = scanProject(tmpDir);
    expect(info.languages).toContain('python');
    expect(info.frameworks).toContain('django');
    expect(info.testRunner).toBe('pytest');
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const info = scanProject(tmpDir);
    expect(info.packageManager).toBe('pnpm');
  });

  it('detects CI from .github/workflows', () => {
    const workflowDir = path.join(tmpDir, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(path.join(workflowDir, 'ci.yml'), 'name: CI');
    const info = scanProject(tmpDir);
    expect(info.hasCI).toBe(true);
  });

  it('estimates repo size', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const info = scanProject(tmpDir);
    expect(info.repoSize).toBe('small');
  });
});
