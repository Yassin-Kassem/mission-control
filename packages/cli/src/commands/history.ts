import { type Mission } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { padRight } from '../ui/layout.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);
  const w = 80;
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  const lines: string[] = [];
  lines.push(`┌ MISSION HISTORY ${'─'.repeat(inner - 18)}┐`);

  if (missions.length === 0) {
    lines.push(ln(chalk.gray(' No missions yet. Run `swarm run "task"` to start one.')));
    lines.push(`└${'─'.repeat(inner)}┘`);
    console.log(lines.join('\n'));
    return;
  }

  // Header
  lines.push(ln(
    ` ${chalk.gray(padRight('ID', 20))}  ${chalk.gray(padRight('Status', 10))}  ${chalk.gray(padRight('Description', 26))}  ${chalk.gray('Date')}`
  ));

  for (const m of missions) {
    const icon = m.status === 'completed' ? chalk.green('●')
      : m.status === 'failed' ? chalk.red('●')
      : chalk.gray('○');
    const desc = padRight(m.description, 26);
    const row = ` ${padRight(m.id, 20)}  ${icon} ${padRight(m.status, 8)}  ${desc}  ${chalk.gray(formatTimestamp(m.createdAt))}`;
    lines.push(ln(row));
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
