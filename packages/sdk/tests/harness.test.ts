import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DroneTestHarness } from '../src/harness.js';
import { scaffoldDrone } from '../src/scaffold.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DroneTestHarness', () => {
  it('creates harness from YAML', () => {
    const yaml = `
name: test-drone
description: A test drone
triggers:
  keywords: [testing]
signals:
  emits: [test.done]
  listens: []
priority: 50
escalation: user
`;
    const harness = DroneTestHarness.fromYaml(yaml);
    expect(harness.manifest.name).toBe('test-drone');
    expect(harness.manifest.description).toBe('A test drone');
  });

  it('validates manifest', () => {
    const harness = DroneTestHarness.fromYaml('name: test\ndescription: test');
    expect(harness.validate()).toHaveLength(0);
  });

  it('validates manifest errors', () => {
    const harness = DroneTestHarness.fromYaml('name: ""');
    const errors = harness.validate();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('checks keyword activation', () => {
    const harness = DroneTestHarness.fromYaml('name: lint\ndescription: Lints code\ntriggers:\n  keywords: [lint, eslint]');
    expect(harness.shouldActivate('please lint this file')).toBe(true);
    expect(harness.shouldActivate('run eslint on the project')).toBe(true);
    expect(harness.shouldActivate('fix a bug')).toBe(false);
  });

  it('tracks emitted signals', () => {
    const harness = DroneTestHarness.fromYaml('name: test\ndescription: test');
    harness.emitSignal('test.started', { file: 'app.ts' });
    harness.emitSignal('test.done');

    const signals = harness.getEmittedSignals();
    expect(signals).toHaveLength(2);
    expect(signals[0].topic).toBe('test.started');
    expect(signals[0].payload.file).toBe('app.ts');
    expect(signals[1].topic).toBe('test.done');
  });

  it('clears signals', () => {
    const harness = DroneTestHarness.fromYaml('name: test\ndescription: test');
    harness.emitSignal('test.done');
    harness.clearSignals();
    expect(harness.getEmittedSignals()).toHaveLength(0);
  });
});

describe('DroneTestHarness.fromDirectory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-harness-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads from a scaffolded drone directory', () => {
    scaffoldDrone('my-lint', tmpDir);
    const harness = DroneTestHarness.fromDirectory(path.join(tmpDir, 'my-lint'));
    expect(harness.manifest.name).toBe('my-lint');
    expect(harness.hasSkillFile()).toBe(true);
    expect(harness.getSkillContent()).toContain('my-lint');
  });
});
