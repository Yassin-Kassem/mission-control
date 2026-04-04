import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryLayer } from '../../src/memory/memory-layer.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryLayer', () => {
  let db: SwarmDatabase;
  let layer: MemoryLayer;

  beforeEach(() => {
    db = createDatabase(':memory:');
    layer = new MemoryLayer(db, 'working');
  });

  afterEach(() => {
    db.close();
  });

  it('sets and gets a value', () => {
    layer.set('project.language', 'typescript');
    expect(layer.get('project.language')).toBe('typescript');
  });

  it('returns undefined for missing keys', () => {
    expect(layer.get('nonexistent')).toBeUndefined();
  });

  it('overwrites existing values', () => {
    layer.set('project.language', 'typescript');
    layer.set('project.language', 'python');
    expect(layer.get('project.language')).toBe('python');
  });

  it('deletes a value', () => {
    layer.set('key', 'value');
    layer.delete('key');
    expect(layer.get('key')).toBeUndefined();
  });

  it('lists all entries', () => {
    layer.set('a', '1');
    layer.set('b', '2');
    const entries = layer.list();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.key).sort()).toEqual(['a', 'b']);
  });

  it('searches entries by key prefix', () => {
    layer.set('project.language', 'ts');
    layer.set('project.framework', 'next');
    layer.set('user.name', 'yassin');

    const results = layer.search('project.');
    expect(results).toHaveLength(2);
  });

  it('clears all entries', () => {
    layer.set('a', '1');
    layer.set('b', '2');
    layer.clear();
    expect(layer.list()).toHaveLength(0);
  });
});
