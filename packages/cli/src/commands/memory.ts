import { type MemoryEntry, type MemoryLayerName } from '@mctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { header, colors, table } from '../ui/theme.js';

export interface MemoryListing {
  short: MemoryEntry[];
  working: MemoryEntry[];
  long: MemoryEntry[];
}

export function listMemory(projectDir: string, layer?: MemoryLayerName): MemoryListing {
  const ctx = loadProjectContext(projectDir);
  const result: MemoryListing = {
    short: (!layer || layer === 'short') ? ctx.memory.short.list() : [],
    working: (!layer || layer === 'working') ? ctx.memory.working.list() : [],
    long: (!layer || layer === 'long') ? ctx.memory.long.list() : [],
  };
  ctx.close();
  return result;
}

export function promoteMemory(projectDir: string, key: string, from: MemoryLayerName, to: MemoryLayerName): void {
  const ctx = loadProjectContext(projectDir);
  ctx.memory.promote(key, from, to);
  ctx.close();
}

export function forgetMemory(projectDir: string, key: string, layer: MemoryLayerName): void {
  const ctx = loadProjectContext(projectDir);
  const memLayer = layer === 'short' ? ctx.memory.short : layer === 'working' ? ctx.memory.working : ctx.memory.long;
  memLayer.delete(key);
  ctx.close();
}

export function printMemory(projectDir: string, layer?: MemoryLayerName): void {
  const listing = listMemory(projectDir, layer);
  const total = listing.short.length + listing.working.length + listing.long.length;

  console.log('');
  console.log(header('MEMORY'));
  console.log('');

  if (total === 0) {
    console.log(`  ${colors.muted('No memory entries. Memory is populated as missions run.')}`);
    console.log('');
    return;
  }

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  const layerData: [string, MemoryEntry[]][] = [
    ['SHORT-TERM', listing.short],
    ['WORKING', listing.working],
    ['LONG-TERM', listing.long],
  ];

  for (const [name, entries] of layerData) {
    if (entries.length === 0) continue;

    console.log(`  ${colors.secondary(`▸ ${name}`)} ${colors.muted(`(${entries.length})`)}`);
    console.log('');

    const rows = entries.map((e) => [e.key, trunc(e.value, 30)]);
    console.log(table(['Key', 'Value'], rows, [24, 30]));
    console.log('');
  }
}
