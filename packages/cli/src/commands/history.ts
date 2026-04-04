import { type Mission } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);
  const w = Math.min(process.stdout.columns ?? 80, 90);
  const inner = w - 2;

  if (missions.length === 0) {
    console.log(box('MISSION HISTORY', [' No missions yet.'], w));
    return;
  }

  // Fixed columns: ID(18) + gap(2) + icon+status(11) + gap(2) + date(19) = 52
  // Remaining goes to description
  const descW = Math.max(10, inner - 54);

  const lines: string[] = [];
  lines.push(top(`MISSION HISTORY (${missions.length})`, inner));

  for (const m of missions) {
    const icon = m.status === 'completed' ? chalk.green('●') : m.status === 'failed' ? chalk.red('●') : chalk.gray('○');
    const id = fit(m.id, 18);
    const status = fit(m.status, 9);
    const desc = fit(m.description, descW);
    const date = formatTimestamp(m.createdAt);
    lines.push(ln(`  ${id}  ${icon} ${status}  ${desc}  ${chalk.gray(date)}`, inner));
  }

  lines.push(bot(inner));
  console.log(lines.join('\n'));
}

function fit(str: string, width: number): string {
  if (str.length <= width) return str + ' '.repeat(width - str.length);
  return str.slice(0, width - 1) + '…';
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[\d*(;\d+)*m/g, '');
}

function ln(content: string, inner: number): string {
  const visible = stripAnsi(content).length;
  const padding = Math.max(0, inner - visible);
  return `│${content}${' '.repeat(padding)}│`;
}

function top(title: string, inner: number): string {
  return `┌ ${title} ${'─'.repeat(Math.max(0, inner - title.length - 3))}┐`;
}

function bot(inner: number): string {
  return `└${'─'.repeat(inner)}┘`;
}

function box(title: string, contentLines: string[], w: number): string {
  const inner = w - 2;
  return [
    top(title, inner),
    ...contentLines.map((l) => ln(l, inner)),
    bot(inner),
  ].join('\n');
}
