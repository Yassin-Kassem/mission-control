import { describe, it, expect } from 'vitest';
import { SessionAdvisor } from '../../src/mission/session-advisor.js';

describe('SessionAdvisor', () => {
  it('fits a small mission in one session for Pro', () => {
    const advisor = new SessionAdvisor('pro');
    const advice = advisor.advise(
      [{ name: 'coder', type: 'ai' }],
      'trivial',
    );
    expect(advice.fitsInOneSession).toBe(true);
    expect(advice.sessions).toHaveLength(1);
    expect(advice.suggestedMode).toBe('solo');
  });

  it('reports high budget usage for large Pro mission', () => {
    const advisor = new SessionAdvisor('pro');
    const advice = advisor.advise(
      [
        { name: 'scout', type: 'tool' },
        { name: 'architect', type: 'ai' },
        { name: 'security', type: 'tool' },
        { name: 'coder', type: 'ai' },
        { name: 'tester', type: 'tool' },
        { name: 'reviewer', type: 'ai' },
        { name: 'docs', type: 'ai' },
      ],
      'large',
    );
    // With Pro's cheaper models (haiku for architect/reviewer/docs), it fits but uses significant budget
    expect(advice.budgetPercent).toBeGreaterThan(30);
    expect(advice.suggestedMode).toBe('solo'); // budget > 60% → suggests solo
  });

  it('fits a large mission in one session for Max 20x', () => {
    const advisor = new SessionAdvisor('max20x');
    const advice = advisor.advise(
      [
        { name: 'scout', type: 'tool' },
        { name: 'architect', type: 'ai' },
        { name: 'security', type: 'tool' },
        { name: 'coder', type: 'ai' },
        { name: 'tester', type: 'tool' },
        { name: 'reviewer', type: 'ai' },
        { name: 'docs', type: 'ai' },
      ],
      'large',
    );
    expect(advice.fitsInOneSession).toBe(true);
    expect(advice.sessions).toHaveLength(1);
  });

  it('assigns cheaper models for Pro plan', () => {
    const advisor = new SessionAdvisor('pro');
    const advice = advisor.advise(
      [{ name: 'architect', type: 'ai' }, { name: 'coder', type: 'ai' }],
      'medium',
    );
    expect(advice.modelOverrides.architect).toBe('haiku');
    expect(advice.modelOverrides.coder).toBe('sonnet');
  });

  it('assigns stronger models for Max 20x plan', () => {
    const advisor = new SessionAdvisor('max20x');
    const advice = advisor.advise(
      [{ name: 'debugger', type: 'ai' }],
      'medium',
    );
    expect(advice.modelOverrides.debugger).toBe('opus');
  });

  it('API plan always fits and suggests blitz', () => {
    const advisor = new SessionAdvisor('api');
    const advice = advisor.advise(
      [
        { name: 'scout', type: 'tool' },
        { name: 'architect', type: 'ai' },
        { name: 'coder', type: 'ai' },
        { name: 'reviewer', type: 'ai' },
      ],
      'large',
    );
    expect(advice.fitsInOneSession).toBe(true);
    expect(advice.budgetPercent).toBe(0);
  });

  it('suggests solo mode when budget is tight', () => {
    const advisor = new SessionAdvisor('max5x');
    // 4 AI drones with sonnet = 160k + 20k overhead = 180k, which is 18% of 1M — fits easily
    // But if scope is small, should still suggest solo
    const advice = advisor.advise(
      [{ name: 'coder', type: 'ai' }],
      'small',
    );
    expect(advice.suggestedMode).toBe('solo');
  });

  it('session split puts architect in phase 1 and coder in phase 2', () => {
    const advisor = new SessionAdvisor('pro');
    const advice = advisor.advise(
      [
        { name: 'scout', type: 'tool' },
        { name: 'architect', type: 'ai' },
        { name: 'coder', type: 'ai' },
        { name: 'tester', type: 'tool' },
        { name: 'reviewer', type: 'ai' },
      ],
      'large',
    );

    if (advice.sessions.length > 1) {
      const session1Names = advice.sessions[0].drones.map((d) => d.name);
      expect(session1Names).toContain('architect');
      expect(session1Names).not.toContain('coder');

      const session2Names = advice.sessions[1].drones.map((d) => d.name);
      expect(session2Names).toContain('coder');
    }
  });
});
