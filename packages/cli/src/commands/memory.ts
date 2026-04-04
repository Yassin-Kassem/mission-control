import { type MemoryEntry, type MemoryLayerName } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { renderBox, renderDivider, padRight } from '../ui/layout.js';

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
  const w = 70;

  if (total === 0) {
    console.log(renderBox('MEMORY', [chalk.gray(' No memory entries. Memory is populated as missions run.')], w));
    return;
  }

  const inner = w - 2;
  const allLines: string[] = [];

  const top = `┌ MEMORY ${'─'.repeat(inner - 8)}┐`;
  allLines.push(top);

  const layerData: [string, MemoryEntry[]][] = [
    ['Short-term', listing.short],
    ['Working', listing.working],
    ['Long-term', listing.long],
  ];

  let first = true;
  for (const [name, entries] of layerData) {
    if (entries.length === 0) continue;

    if (!first) allLines.push(renderDivider(w));
    first = false;

    allLines.push(`│${padRight(chalk.bold(` ${name} (${entries.length})`), inner)}│`);

    for (const e of entries) {
      const val = e.value.length > 30 ? e.value.slice(0, 27) + '...' : e.value;
      const line = ` ${padRight(e.key, 25)}  ${padRight(val, 30)}`;
      allLines.push(`│${padRight(line, inner)}│`);
    }
  }

  allLines.push(`└${'─'.repeat(inner)}┘`);
  console.log(allLines.join('\n'));
}
