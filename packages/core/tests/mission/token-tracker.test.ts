import { describe, it, expect } from 'vitest';
import { TokenTracker } from '../../src/mission/token-tracker.js';

describe('TokenTracker', () => {
  it('estimates cost for a mission plan', () => {
    const tracker = new TokenTracker();
    const estimate = tracker.estimate([
      { name: 'scout', type: 'tool' },
      { name: 'architect', type: 'ai', model: 'sonnet' },
      { name: 'coder', type: 'ai', model: 'sonnet' },
      { name: 'reviewer', type: 'ai', model: 'haiku' },
    ]);
    expect(estimate.totalTokens).toBeGreaterThan(0);
    expect(estimate.estimatedCost).toBeGreaterThan(0);
    expect(estimate.perDrone).toHaveLength(4);
    expect(estimate.perDrone[0].tokens).toBe(0);
    expect(estimate.perDrone[1].tokens).toBeGreaterThan(0);
  });

  it('tracks actual usage', () => {
    const tracker = new TokenTracker();
    tracker.recordDrone('scout', 0);
    tracker.recordDrone('architect', 25000);
    tracker.recordDrone('coder', 40000);
    const usage = tracker.getUsage();
    expect(usage.totalTokens).toBe(65000);
    expect(usage.perDrone).toHaveLength(3);
    expect(usage.perDrone[1].name).toBe('architect');
    expect(usage.perDrone[1].tokens).toBe(25000);
  });

  it('warns when budget threshold is reached', () => {
    const tracker = new TokenTracker(100000);
    tracker.recordDrone('architect', 55000);
    expect(tracker.isOverBudget()).toBe(false);
    expect(tracker.isWarning()).toBe(true);
    tracker.recordDrone('coder', 50000);
    expect(tracker.isOverBudget()).toBe(true);
  });

  it('formats cost as readable string', () => {
    const tracker = new TokenTracker();
    tracker.recordDrone('coder', 50000);
    const formatted = tracker.formatCost();
    expect(formatted).toContain('$');
  });
});
