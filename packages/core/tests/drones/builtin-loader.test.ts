import { describe, it, expect } from 'vitest';
import { loadBuiltinDrones, loadBuiltinSkill } from '../../src/drones/builtin-loader.js';

describe('loadBuiltinDrones', () => {
  it('loads all 8 built-in drones', () => {
    const drones = loadBuiltinDrones();
    expect(drones.length).toBe(8);
    const names = drones.map((d) => d.manifest.name).sort();
    expect(names).toEqual(['architect', 'coder', 'debugger', 'docs', 'reviewer', 'scout', 'security', 'tester']);
  });

  it('tool drones have type "tool" and no skill', () => {
    const drones = loadBuiltinDrones();
    const scout = drones.find((d) => d.manifest.name === 'scout')!;
    expect(scout.manifest.type).toBe('tool');
    expect(scout.skill).toBeUndefined();
  });

  it('AI drones have type "ai" and a skill file', () => {
    const drones = loadBuiltinDrones();
    const architect = drones.find((d) => d.manifest.name === 'architect')!;
    expect(architect.manifest.type).toBe('ai');
    expect(architect.manifest.model).toBe('sonnet');
    expect(architect.skill).toBeTruthy();
    expect(architect.skill).toContain('Architect');
  });

  it('all AI drones have inputs and outputs defined', () => {
    const drones = loadBuiltinDrones();
    const aiDrones = drones.filter((d) => d.manifest.type === 'ai');
    for (const drone of aiDrones) {
      expect(drone.manifest.outputs!.length, `${drone.manifest.name} should have outputs`).toBeGreaterThan(0);
    }
  });
});

describe('loadBuiltinSkill', () => {
  it('returns skill content for AI drones', () => {
    const skill = loadBuiltinSkill('architect');
    expect(skill).toBeTruthy();
    expect(skill).toContain('Architect');
  });

  it('returns undefined for tool drones', () => {
    const skill = loadBuiltinSkill('scout');
    expect(skill).toBeUndefined();
  });

  it('returns undefined for nonexistent drones', () => {
    const skill = loadBuiltinSkill('nonexistent');
    expect(skill).toBeUndefined();
  });
});
