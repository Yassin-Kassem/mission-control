import { type MemoryEntry, type MemoryLayerName } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTable, formatTimestamp } from '../format.js';

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
  const layers: [string, MemoryEntry[]][] = [
    ['Short-term', listing.short],
    ['Working', listing.working],
    ['Long-term', listing.long],
  ];
  for (const [name, entries] of layers) {
    if (entries.length === 0) continue;
    console.log(`\n${name} Memory (${entries.length} entries)\n`);
    const rows: string[][] = [['Key', 'Value', 'Updated']];
    for (const e of entries) {
      const val = e.value.length > 50 ? e.value.slice(0, 47) + '...' : e.value;
      rows.push([e.key, val, formatTimestamp(e.updatedAt)]);
    }
    console.log(formatTable(rows));
  }
  const total = listing.short.length + listing.working.length + listing.long.length;
  if (total === 0) {
    console.log('No memory entries. Memory is populated as missions run.');
  }
}
