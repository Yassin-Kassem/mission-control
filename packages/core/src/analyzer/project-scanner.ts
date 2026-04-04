import fs from 'fs';
import path from 'path';
import type { ProjectInfo } from './situation-profile.js';

export function scanProject(projectDir: string): ProjectInfo {
  const languages = detectLanguages(projectDir);
  const frameworks = detectFrameworks(projectDir);
  const testInfo = detectTestRunner(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const hasCI = detectCI(projectDir);
  const repoSize = estimateRepoSize(projectDir);

  return { languages, frameworks, hasTests: testInfo.hasTests, testRunner: testInfo.runner, hasCI, packageManager, repoSize };
}

function detectLanguages(dir: string): string[] {
  const langs: string[] = [];
  if (fileExists(dir, 'tsconfig.json') || hasExtension(dir, '.ts')) langs.push('typescript');
  if (hasExtension(dir, '.js') && !langs.includes('typescript')) langs.push('javascript');
  if (hasExtension(dir, '.py') || fileExists(dir, 'requirements.txt') || fileExists(dir, 'pyproject.toml')) langs.push('python');
  if (fileExists(dir, 'go.mod')) langs.push('go');
  if (fileExists(dir, 'Cargo.toml')) langs.push('rust');
  if (fileExists(dir, 'Gemfile')) langs.push('ruby');
  return langs;
}

function detectFrameworks(dir: string): string[] {
  const frameworks: string[] = [];
  const pkg = readPackageJson(dir);
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.next) frameworks.push('next.js');
    if (allDeps.react && !allDeps.next) frameworks.push('react');
    if (allDeps.vue) frameworks.push('vue');
    if (allDeps.svelte) frameworks.push('svelte');
    if (allDeps.express) frameworks.push('express');
    if (allDeps.fastify) frameworks.push('fastify');
    if (allDeps.hono) frameworks.push('hono');
  }
  const reqTxt = readFile(dir, 'requirements.txt');
  if (reqTxt) {
    if (/django/i.test(reqTxt)) frameworks.push('django');
    if (/flask/i.test(reqTxt)) frameworks.push('flask');
    if (/fastapi/i.test(reqTxt)) frameworks.push('fastapi');
  }
  return frameworks;
}

function detectTestRunner(dir: string): { hasTests: boolean; runner: string | null } {
  const pkg = readPackageJson(dir);
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.vitest) return { hasTests: true, runner: 'vitest' };
    if (allDeps.jest) return { hasTests: true, runner: 'jest' };
    if (allDeps.mocha) return { hasTests: true, runner: 'mocha' };
  }
  const reqTxt = readFile(dir, 'requirements.txt');
  if (reqTxt && /pytest/i.test(reqTxt)) return { hasTests: true, runner: 'pytest' };
  if (fileExists(dir, 'pytest.ini') || fileExists(dir, 'setup.cfg')) return { hasTests: true, runner: 'pytest' };
  return { hasTests: false, runner: null };
}

function detectPackageManager(dir: string): string {
  if (fileExists(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(dir, 'yarn.lock')) return 'yarn';
  if (fileExists(dir, 'bun.lockb')) return 'bun';
  if (fileExists(dir, 'package-lock.json') || fileExists(dir, 'package.json')) return 'npm';
  if (fileExists(dir, 'requirements.txt') || fileExists(dir, 'pyproject.toml')) return 'pip';
  return 'unknown';
}

function detectCI(dir: string): boolean {
  return dirExists(dir, '.github/workflows') || fileExists(dir, '.gitlab-ci.yml') || fileExists(dir, 'Jenkinsfile') || fileExists(dir, '.circleci/config.yml');
}

function estimateRepoSize(dir: string): 'small' | 'medium' | 'large' {
  let count = 0;
  function walk(current: string, depth: number): void {
    if (depth > 4 || count > 500) return;
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        count++;
        if (entry.isDirectory()) walk(path.join(current, entry.name), depth + 1);
      }
    } catch { /* skip */ }
  }
  walk(dir, 0);
  if (count < 50) return 'small';
  if (count < 300) return 'medium';
  return 'large';
}

function fileExists(dir: string, file: string): boolean {
  return fs.existsSync(path.join(dir, file));
}

function dirExists(dir: string, subdir: string): boolean {
  const full = path.join(dir, subdir);
  return fs.existsSync(full) && fs.statSync(full).isDirectory();
}

function hasExtension(dir: string, ext: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
    return (entries as fs.Dirent[]).some((e) => e.isFile() && e.name.endsWith(ext));
  } catch { return false; }
}

function readFile(dir: string, file: string): string | null {
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

function readPackageJson(dir: string): Record<string, Record<string, string>> | null {
  const content = readFile(dir, 'package.json');
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}
