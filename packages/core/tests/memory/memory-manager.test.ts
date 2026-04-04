import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryManager', () => {
  let db: SwarmDatabase;
  let mm: MemoryManager;

  beforeEach(() => {
    db = createDatabase(':memory:');
    mm = new MemoryManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('exposes short, working, and long layers', () => {
    mm.short.set('a', '1');
    mm.working.set('b', '2');
    mm.long.set('c', '3');

    expect(mm.short.get('a')).toBe('1');
    expect(mm.working.get('b')).toBe('2');
    expect(mm.long.get('c')).toBe('3');
  });

  it('layers are isolated from each other', () => {
    mm.short.set('key', 'short-val');
    mm.working.set('key', 'working-val');

    expect(mm.short.get('key')).toBe('short-val');
    expect(mm.working.get('key')).toBe('working-val');
  });

  it('promotes entry from short to working', () => {
    mm.short.set('project.lang', 'python');
    mm.promote('project.lang', 'short', 'working');

    expect(mm.working.get('project.lang')).toBe('python');
    expect(mm.short.get('project.lang')).toBeUndefined();
  });

  it('promotes entry from working to long', () => {
    mm.working.set('user.pref', 'no-semicolons');
    mm.promote('user.pref', 'working', 'long');

    expect(mm.long.get('user.pref')).toBe('no-semicolons');
    expect(mm.working.get('user.pref')).toBeUndefined();
  });

  it('clears short-term memory only', () => {
    mm.short.set('a', '1');
    mm.working.set('b', '2');
    mm.long.set('c', '3');

    mm.clearShortTerm();

    expect(mm.short.list()).toHaveLength(0);
    expect(mm.working.list()).toHaveLength(1);
    expect(mm.long.list()).toHaveLength(1);
  });

  it('searches across all layers', () => {
    mm.short.set('project.lang', 'ts');
    mm.working.set('project.framework', 'next');
    mm.long.set('user.name', 'yassin');

    const results = mm.searchAll('project.');
    expect(results).toHaveLength(2);
  });
});
