import { type MemoryEntry, type MemoryLayerName } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { padRight } from '../ui/layout.js';

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
  const w = 64;
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  if (total === 0) {
    const lines = [
      `┌ MEMORY ${'─'.repeat(inner - 8)}┐`,
      ln(chalk.gray(' No memory entries. Memory is populated as missions run.')),
      `└${'─'.repeat(inner)}┘`,
    ];
    console.log(lines.join('\n'));
    return;
  }

  const lines: string[] = [];
  lines.push(`┌ MEMORY ${'─'.repeat(inner - 8)}┐`);

  const layerData: [string, MemoryEntry[]][] = [
    ['Short-term', listing.short],
    ['Working', listing.working],
    ['Long-term', listing.long],
  ];

  let first = true;
  for (const [name, entries] of layerData) {
    if (entries.length === 0) continue;
    if (!first) lines.push(`├${'─'.repeat(inner)}┤`);
    first = false;

    lines.push(ln(chalk.bold(` ${name} (${entries.length})`)));
    for (const e of entries) {
      const val = padRight(e.value, 28);
      lines.push(ln(` ${padRight(e.key, 22)}  ${val}`));
    }
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
