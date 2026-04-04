import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../src/analyzer/intent-classifier.js';

describe('classifyIntent', () => {
  it('classifies bug fix requests', () => {
    expect(classifyIntent('fix the login bug')).toBe('fix');
    expect(classifyIntent('there is an error in the auth module')).toBe('fix');
    expect(classifyIntent('patch the null pointer issue')).toBe('fix');
  });

  it('classifies build/create requests', () => {
    expect(classifyIntent('build a payment system')).toBe('build');
    expect(classifyIntent('create a new user registration page')).toBe('build');
    expect(classifyIntent('add authentication to the app')).toBe('build');
    expect(classifyIntent('implement the checkout flow')).toBe('build');
  });

  it('classifies refactor requests', () => {
    expect(classifyIntent('refactor the database layer')).toBe('refactor');
    expect(classifyIntent('clean up the auth module')).toBe('refactor');
    expect(classifyIntent('restructure the API routes')).toBe('refactor');
  });

  it('classifies explore requests', () => {
    expect(classifyIntent('how does the auth system work')).toBe('explore');
    expect(classifyIntent('explain the payment flow')).toBe('explore');
    expect(classifyIntent('what does this function do')).toBe('explore');
  });

  it('classifies debug requests', () => {
    expect(classifyIntent('debug why the tests are failing')).toBe('debug');
    expect(classifyIntent('investigate the memory leak')).toBe('debug');
    expect(classifyIntent('why is the API returning 500')).toBe('debug');
  });

  it('classifies deploy requests', () => {
    expect(classifyIntent('deploy to production')).toBe('deploy');
    expect(classifyIntent('release version 2.0')).toBe('deploy');
    expect(classifyIntent('push this to staging')).toBe('deploy');
  });

  it('defaults to build for ambiguous requests', () => {
    expect(classifyIntent('make the app better')).toBe('build');
  });
});
