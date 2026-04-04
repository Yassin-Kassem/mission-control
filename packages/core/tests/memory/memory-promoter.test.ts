import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryPromoter } from '../../src/memory/memory-promoter.js';
import { MemoryManager } from '../../src/memory/memory-manager.js';
import { createDatabase, type SwarmDatabase } from '../../src/db.js';

describe('MemoryPromoter', () => {
  let db: SwarmDatabase;
  let mm: MemoryManager;
  let promoter: MemoryPromoter;

  beforeEach(() => {
    db = createDatabase(':memory:');
    mm = new MemoryManager(db);
    promoter = new MemoryPromoter(mm);
  });

  afterEach(() => {
    db.close();
  });

  it('promotes project patterns to working memory', () => {
    mm.short.set('project.language', 'typescript');
    mm.short.set('project.framework', 'nextjs');

    const promoted = promoter.scanAndPromote();

    expect(mm.working.get('project.language')).toBe('typescript');
    expect(mm.working.get('project.framework')).toBe('nextjs');
    expect(mm.short.get('project.language')).toBeUndefined();
    expect(promoted).toHaveLength(2);
  });

  it('promotes user preferences to long-term memory', () => {
    mm.short.set('user.prefers-no-comments', 'true');

    const promoted = promoter.scanAndPromote();

    expect(mm.long.get('user.prefers-no-comments')).toBe('true');
    expect(mm.short.get('user.prefers-no-comments')).toBeUndefined();
    expect(promoted).toHaveLength(1);
  });

  it('does not promote entries with no recognized prefix', () => {
    mm.short.set('temp.scratchpad', 'some value');

    const promoted = promoter.scanAndPromote();

    expect(promoted).toHaveLength(0);
    expect(mm.short.get('temp.scratchpad')).toBe('some value');
  });

  it('does not overwrite existing working memory', () => {
    mm.working.set('project.language', 'python');
    mm.short.set('project.language', 'typescript');

    promoter.scanAndPromote();

    expect(mm.working.get('project.language')).toBe('python');
    expect(mm.short.get('project.language')).toBe('typescript');
  });
});
