import { describe, it, expect } from 'vitest';
import { detectScope } from '../../src/analyzer/scope-detector.js';

describe('detectScope', () => {
  it('detects trivial scope for tiny requests', () => {
    expect(detectScope('fix typo in readme', 'fix', 1)).toBe('trivial');
  });
  it('detects small scope for single-file changes', () => {
    expect(detectScope('add a loading spinner to the button', 'build', 2)).toBe('small');
  });
  it('detects medium scope for multi-file features', () => {
    expect(detectScope('add a settings toggle and update the config', 'build', 5)).toBe('medium');
  });
  it('detects large scope for system-level features', () => {
    expect(detectScope('build a complete payment system with Stripe integration', 'build', 20)).toBe('large');
  });
  it('detects epic scope for massive rewrites', () => {
    expect(detectScope('rewrite the entire authentication system and migrate all users', 'refactor', 50)).toBe('epic');
  });
  it('explore intent always has trivial scope', () => {
    expect(detectScope('how does the auth system work', 'explore', 100)).toBe('trivial');
  });
  it('uses word count as a complexity signal', () => {
    const short = 'fix login';
    const long = 'build a comprehensive user management system with role-based access control, admin dashboard, audit logging, and integration with our existing SSO provider';
    expect(detectScope(short, 'fix', 0)).toBe('trivial');
    expect(detectScope(long, 'build', 0)).toBe('large');
  });
});
