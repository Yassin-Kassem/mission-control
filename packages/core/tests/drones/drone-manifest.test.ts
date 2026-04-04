import { describe, it, expect } from 'vitest';
import { parseDroneManifest, validateManifest, type DroneManifest } from '../../src/drones/drone-manifest.js';

const VALID_YAML = `
name: architect
description: Designs system architecture before implementation
triggers:
  taskSize: large
  keywords:
    - build
    - create
    - design
  fileCount: ">5"
opinions:
  requires:
    - "spec before code"
  suggests:
    - "consider edge cases"
  blocks:
    - "implementation without design approval"
signals:
  emits:
    - design.proposed
    - design.approved
  listens:
    - mission.started
    - user.override
priority: 10
escalation: user
`;

describe('parseDroneManifest', () => {
  it('parses valid YAML manifest', () => {
    const manifest = parseDroneManifest(VALID_YAML);
    expect(manifest.name).toBe('architect');
    expect(manifest.description).toBe('Designs system architecture before implementation');
    expect(manifest.triggers.taskSize).toBe('large');
    expect(manifest.triggers.keywords).toEqual(['build', 'create', 'design']);
    expect(manifest.opinions.requires).toEqual(['spec before code']);
    expect(manifest.signals.emits).toEqual(['design.proposed', 'design.approved']);
    expect(manifest.priority).toBe(10);
    expect(manifest.escalation).toBe('user');
  });

  it('applies defaults for optional fields', () => {
    const minimal = `
name: simple
description: A simple drone
`;
    const manifest = parseDroneManifest(minimal);
    expect(manifest.triggers).toEqual({});
    expect(manifest.opinions).toEqual({ requires: [], suggests: [], blocks: [] });
    expect(manifest.signals).toEqual({ emits: [], listens: [] });
    expect(manifest.priority).toBe(0);
    expect(manifest.escalation).toBe('user');
  });
});

describe('validateManifest', () => {
  it('returns no errors for valid manifest', () => {
    const manifest = parseDroneManifest(VALID_YAML);
    const errors = validateManifest(manifest);
    expect(errors).toHaveLength(0);
  });

  it('returns error for missing name', () => {
    const manifest = { description: 'test' } as DroneManifest;
    const errors = validateManifest(manifest);
    expect(errors).toContain('name is required');
  });

  it('returns error for missing description', () => {
    const manifest = { name: 'test' } as DroneManifest;
    const errors = validateManifest(manifest);
    expect(errors).toContain('description is required');
  });
});
