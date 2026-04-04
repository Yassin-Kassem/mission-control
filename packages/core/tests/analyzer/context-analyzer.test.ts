import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextAnalyzer } from '../../src/analyzer/context-analyzer.js';
import { DroneRegistry } from '../../src/drones/drone-registry.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeDrone(name: string, triggers: Record<string, unknown> = {}, priority = 0): DroneManifest {
  return {
    name, description: `${name} drone`, triggers,
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [], listens: [] }, priority, escalation: 'user',
  };
}

describe('ContextAnalyzer', () => {
  let db: SwarmDatabase;
  let registry: DroneRegistry;
  let memory: MemoryManager;
  let analyzer: ContextAnalyzer;

  beforeEach(() => {
    db = createDatabase(':memory:');
    registry = new DroneRegistry();
    memory = new MemoryManager(db);
    registry.register(makeDrone('scout', {}, 100));
    registry.register(makeDrone('architect', { taskSize: 'large' }, 90));
    registry.register(makeDrone('coder', {}, 50));
    registry.register(makeDrone('tester', {}, 40));
    registry.register(makeDrone('security', { keywords: ['auth', 'payment'] }, 80));
    registry.register(makeDrone('reviewer', {}, 10));
    registry.register(makeDrone('docs', { taskSize: 'large' }, 5));
    analyzer = new ContextAnalyzer(registry, memory);
  });

  afterEach(() => { db.close(); });

  it('activates minimal drones for trivial scope', () => {
    const profile = analyzer.analyze('fix typo', '/tmp/fake');
    expect(profile.intent).toBe('fix');
    expect(profile.scope).toBe('trivial');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('coder');
    expect(droneNames).not.toContain('architect');
    expect(droneNames).not.toContain('docs');
  });

  it('activates full suite for large scope', () => {
    const profile = analyzer.analyze('build a complete payment system with Stripe integration', '/tmp/fake');
    expect(profile.scope).toBe('large');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('scout');
    expect(droneNames).toContain('architect');
    expect(droneNames).toContain('coder');
    expect(droneNames).toContain('security');
    expect(droneNames).toContain('reviewer');
  });

  it('activates security drone when keywords match', () => {
    const profile = analyzer.analyze('add auth to the login page', '/tmp/fake');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).toContain('security');
  });

  it('respects user override from long-term memory', () => {
    memory.long.set('user.override.skip.docs', 'true');
    const profile = analyzer.analyze('build a complete payment system with Stripe integration', '/tmp/fake');
    const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
    expect(droneNames).not.toContain('docs');
  });
});
