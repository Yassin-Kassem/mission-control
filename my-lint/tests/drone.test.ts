import { describe, it, expect } from 'vitest';
import { DroneTestHarness } from '@mctl/sdk';

describe('my-lint drone', () => {
  it('has a valid manifest', () => {
    const harness = DroneTestHarness.fromDirectory('C:/Users/Yassin/Downloads/claude-orchestrator/my-lint');
    expect(harness.manifest.name).toBe('my-lint');
    expect(harness.manifest.description).toBeTruthy();
  });

  it('activates on keyword "my-lint"', () => {
    const harness = DroneTestHarness.fromDirectory('C:/Users/Yassin/Downloads/claude-orchestrator/my-lint');
    expect(harness.shouldActivate('I need help with my-lint')).toBe(true);
    expect(harness.shouldActivate('fix a random typo')).toBe(false);
  });

  it('emits my-lint.done signal', () => {
    const harness = DroneTestHarness.fromDirectory('C:/Users/Yassin/Downloads/claude-orchestrator/my-lint');
    expect(harness.manifest.signals.emits).toContain('my-lint.done');
  });
});
