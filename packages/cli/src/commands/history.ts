import { type Mission } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { renderBox, padRight } from '../ui/layout.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);

  if (missions.length === 0) {
    console.log(renderBox('MISSION HISTORY', [chalk.gray(' No missions yet. Run `swarm run "task"` to start one.')], 60));
    return;
  }

  const w = 78;
  const lines: string[] = [];

  // Header row
  lines.push(` ${chalk.gray(padRight('ID', 20))}  ${chalk.gray(padRight('Status', 11))}  ${chalk.gray(padRight('Description', 25))}  ${chalk.gray('Date')}`);

  for (const m of missions) {
    const statusIcon = m.status === 'completed' ? chalk.green('●')
      : m.status === 'failed' ? chalk.red('●')
      : chalk.gray('○');

    const desc = m.description.length > 25 ? m.description.slice(0, 22) + '...' : m.description;

    lines.push(` ${padRight(m.id, 20)}  ${statusIcon} ${padRight(m.status, 9)}  ${padRight(desc, 25)}  ${chalk.gray(formatTimestamp(m.createdAt))}`);
  }

  console.log(renderBox(`MISSION HISTORY (${missions.length})`, lines, w));
}
