import { describe, it, expect, beforeEach } from 'vitest';
import { DroneRegistry } from '../../src/drones/drone-registry.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeManifest(overrides: Partial<DroneManifest> = {}): DroneManifest {
  return {
    name: 'test-drone',
    description: 'A test drone',
    triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [], listens: [] },
    priority: 0,
    escalation: 'user',
    ...overrides,
  };
}

describe('DroneRegistry', () => {
  let registry: DroneRegistry;

  beforeEach(() => {
    registry = new DroneRegistry();
  });

  it('registers and retrieves a drone', () => {
    const manifest = makeManifest({ name: 'scout' });
    registry.register(manifest);
    expect(registry.get('scout')).toEqual(manifest);
  });

  it('lists all registered drones', () => {
    registry.register(makeManifest({ name: 'scout', priority: 10 }));
    registry.register(makeManifest({ name: 'coder', priority: 5 }));
    const list = registry.list();
    expect(list).toHaveLength(2);
  });

  it('lists drones sorted by priority (descending)', () => {
    registry.register(makeManifest({ name: 'coder', priority: 5 }));
    registry.register(makeManifest({ name: 'scout', priority: 10 }));
    const list = registry.list();
    expect(list[0].name).toBe('scout');
    expect(list[1].name).toBe('coder');
  });

  it('enables and disables drones', () => {
    registry.register(makeManifest({ name: 'docs' }));
    expect(registry.isEnabled('docs')).toBe(true);
    registry.disable('docs');
    expect(registry.isEnabled('docs')).toBe(false);
    registry.enable('docs');
    expect(registry.isEnabled('docs')).toBe(true);
  });

  it('lists only enabled drones', () => {
    registry.register(makeManifest({ name: 'scout' }));
    registry.register(makeManifest({ name: 'docs' }));
    registry.disable('docs');
    const enabled = registry.listEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe('scout');
  });

  it('unregisters a drone', () => {
    registry.register(makeManifest({ name: 'scout' }));
    registry.unregister('scout');
    expect(registry.get('scout')).toBeUndefined();
  });

  it('throws on duplicate registration', () => {
    registry.register(makeManifest({ name: 'scout' }));
    expect(() => registry.register(makeManifest({ name: 'scout' }))).toThrow(
      'Drone "scout" is already registered',
    );
  });
});
