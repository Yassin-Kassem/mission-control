import { describe, it, expect } from 'vitest';
import { renderBox, renderDivider, padRight, truncate } from '../../src/ui/layout.js';

describe('renderBox', () => {
  it('wraps content in a box with title', () => {
    const result = renderBox('SWARM', ['Hello world'], 30);
    expect(result).toContain('SWARM');
    expect(result).toContain('Hello world');
    expect(result).toContain('┌');
    expect(result).toContain('┘');
  });

  it('pads lines to consistent width', () => {
    const result = renderBox('', ['short', 'a longer line'], 30);
    const lines = result.split('\n');
    for (const line of lines) {
      expect(line.length).toBe(30);
    }
  });
});

describe('renderDivider', () => {
  it('renders a horizontal divider', () => {
    const result = renderDivider(20);
    expect(result).toContain('├');
    expect(result).toContain('┤');
    expect(result.length).toBe(20);
  });
});

describe('padRight', () => {
  it('pads string to given width', () => {
    expect(padRight('hi', 10)).toBe('hi        ');
    expect(padRight('hi', 10).length).toBe(10);
  });

  it('truncates if string exceeds width', () => {
    expect(padRight('hello world', 5)).toBe('hell…');
  });
});

describe('truncate', () => {
  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('returns original if within limit', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
});
