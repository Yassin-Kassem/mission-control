import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..');

describe('plugin manifest', () => {
  it('has a valid .claude-plugin/plugin.json', () => {
    const manifestPath = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('mission-control');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description).toBeTruthy();
    expect(manifest.author).toBeTruthy();
    expect(manifest.license).toBe('MIT');
    expect(manifest.repository).toContain('github.com');
    expect(manifest.homepage).toContain('github.com');
  });

  it('declares skills directory', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'),
    );
    expect(manifest.skills).toBeTruthy();
  });

  it('declares hooks', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf-8'),
    );
    expect(manifest.hooks).toBeTruthy();
  });
});

describe('skills', () => {
  const skillsDir = path.join(PLUGIN_ROOT, 'skills');

  it('mission-run skill exists with valid frontmatter', () => {
    const skillPath = path.join(skillsDir, 'mission-run', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/^---\nname: mission-run\n/);
    expect(content).toContain('description:');
  });

  it('drone-create skill exists with valid frontmatter', () => {
    const skillPath = path.join(skillsDir, 'drone-create', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/^---\nname: drone-create\n/);
    expect(content).toContain('description:');
  });

  it('skills reference npx @mctl/cli (not bash binary)', () => {
    const runSkill = fs.readFileSync(path.join(skillsDir, 'mission-run', 'SKILL.md'), 'utf-8');
    const createSkill = fs.readFileSync(path.join(skillsDir, 'drone-create', 'SKILL.md'), 'utf-8');

    // Should use npx, not the old bash binary
    expect(runSkill).toContain('npx @mctl/cli');
    expect(createSkill).toContain('npx @mctl/cli');
    expect(runSkill).not.toContain('${CLAUDE_PLUGIN_ROOT}/bin/mission');
    expect(createSkill).not.toContain('${CLAUDE_PLUGIN_ROOT}/bin/mission');
  });
});

describe('hooks', () => {
  it('hooks.json is valid', () => {
    const hooksPath = path.join(PLUGIN_ROOT, 'hooks', 'hooks.json');
    expect(fs.existsSync(hooksPath)).toBe(true);

    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
    expect(hooks.hooks).toBeTruthy();
    expect(hooks.hooks.SessionStart).toBeTruthy();
    expect(hooks.hooks.SessionStart).toHaveLength(1);
  });
});

describe('bin script', () => {
  it('bin/mission exists', () => {
    const binPath = path.join(PLUGIN_ROOT, 'bin', 'mission');
    expect(fs.existsSync(binPath)).toBe(true);
  });
});
