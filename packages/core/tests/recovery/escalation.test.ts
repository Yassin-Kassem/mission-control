import { describe, it, expect } from 'vitest';
import { EscalationHandler } from '../../src/recovery/escalation.js';

describe('EscalationHandler', () => {
  it('recommends retry for first failure', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({ droneName: 'coder', error: 'context limit exceeded', attemptCount: 1 });
    expect(action.type).toBe('retry');
  });

  it('recommends decompose after max retries', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({ droneName: 'coder', error: 'context limit exceeded', attemptCount: 3 });
    expect(action.type).toBe('decompose');
  });

  it('recommends skip for non-critical drones', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({ droneName: 'docs', error: 'failed to generate docs', attemptCount: 3, critical: false });
    expect(action.type).toBe('skip');
  });

  it('escalates to user for critical drones after exhausting options', () => {
    const handler = new EscalationHandler();
    const action = handler.handle({ droneName: 'security', error: 'cannot verify dependencies', attemptCount: 3, critical: true });
    expect(action.type).toBe('decompose');
  });
});
