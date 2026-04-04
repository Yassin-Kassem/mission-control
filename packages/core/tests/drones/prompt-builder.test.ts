import { describe, it, expect } from 'vitest';
import { DronePromptBuilder } from '../../src/drones/prompt-builder.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeManifest(overrides: Partial<DroneManifest>): DroneManifest {
  return {
    name: 'test-drone',
    description: 'A test drone',
    type: 'ai',
    priority: 50,
    escalation: 'user',
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [], listens: [] },
    inputs: [],
    outputs: [],
    ...overrides,
  };
}

describe('DronePromptBuilder', () => {
  it('builds tool drone dispatch (command, no prompt)', () => {
    const builder = new DronePromptBuilder();
    const manifest = makeManifest({ name: 'scout', type: 'tool' });
    const result = builder.buildPrompt(manifest, 'test task');
    expect(result.type).toBe('tool');
    expect(result.command).toContain('npx @mctl/cli drone exec scout');
    expect(result.prompt).toBeUndefined();
  });

  it('builds AI drone dispatch with full prompt', () => {
    const builder = new DronePromptBuilder();
    builder.registerSkill('architect', '# Architect\nDesign the solution.');
    const manifest = makeManifest({
      name: 'architect',
      type: 'ai',
      model: 'sonnet',
      inputs: ['scout.json'],
      outputs: ['plan.md'],
    });
    const result = builder.buildPrompt(manifest, 'add auth');
    expect(result.type).toBe('ai');
    expect(result.model).toBe('sonnet');
    expect(result.prompt).toContain('add auth');
    expect(result.prompt).toContain('Architect');
    expect(result.prompt).toContain('Design the solution');
    expect(result.prompt).toContain('scout.json');
    expect(result.prompt).toContain('plan.md');
  });

  it('throws if AI drone has no skill registered', () => {
    const builder = new DronePromptBuilder();
    const manifest = makeManifest({ name: 'unknown', type: 'ai' });
    expect(() => builder.buildPrompt(manifest, 'task')).toThrow('No skill registered');
  });

  it('includes memory context when set', () => {
    const builder = new DronePromptBuilder();
    builder.registerSkill('coder', '# Coder\nWrite code.');
    builder.setMemoryContext('- project uses TypeScript\n- prefer functional style');
    const manifest = makeManifest({ name: 'coder', type: 'ai' });
    const result = builder.buildPrompt(manifest, 'task');
    expect(result.prompt).toContain('project uses TypeScript');
    expect(result.prompt).toContain('prefer functional style');
  });

  it('builds a full mission dispatch plan', () => {
    const builder = new DronePromptBuilder();
    builder.registerSkill('architect', '# Architect\nPlan.');
    builder.registerSkill('coder', '# Coder\nCode.');

    const drones: DroneManifest[] = [
      makeManifest({ name: 'scout', type: 'tool', outputs: ['scout.json'] }),
      makeManifest({ name: 'architect', type: 'ai', model: 'sonnet', inputs: ['scout.json'], outputs: ['plan.md'] }),
      makeManifest({ name: 'coder', type: 'ai', model: 'sonnet', inputs: ['plan.md'], outputs: ['coder.md'] }),
    ];

    const plan = builder.buildPlan('m_test', 'add feature', drones);
    expect(plan.missionId).toBe('m_test');
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0].type).toBe('tool');
    expect(plan.steps[1].type).toBe('ai');
    expect(plan.steps[1].model).toBe('sonnet');
    expect(plan.steps[2].inputs).toContain('plan.md');
  });
});
