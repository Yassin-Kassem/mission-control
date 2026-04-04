import { describe, it, expect } from 'vitest';
import { formatTimestamp, formatDuration, formatStatus, formatTable } from '../src/format.js';

describe('formatTimestamp', () => {
  it('formats a timestamp as readable date', () => {
    const ts = new Date('2026-04-04T10:30:00Z').getTime();
    const result = formatTimestamp(ts);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/04/);
  });
});

describe('formatDuration', () => {
  it('formats milliseconds as human-readable', () => {
    expect(formatDuration(500)).toBe('0.5s');
    expect(formatDuration(65000)).toBe('1m 5s');
    expect(formatDuration(3661000)).toBe('1h 1m');
  });
});

describe('formatStatus', () => {
  it('returns status with indicator', () => {
    expect(formatStatus('completed')).toContain('completed');
    expect(formatStatus('running')).toContain('running');
    expect(formatStatus('failed')).toContain('failed');
    expect(formatStatus('pending')).toContain('pending');
  });
});

describe('formatTable', () => {
  it('formats rows into aligned columns', () => {
    const rows = [
      ['Name', 'Status'],
      ['scout', 'done'],
      ['coder', 'running'],
    ];
    const result = formatTable(rows);
    expect(result).toContain('Name');
    expect(result).toContain('scout');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
  });
});
