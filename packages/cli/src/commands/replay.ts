import { type Mission, type Signal } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { renderBox, renderDivider, padRight } from '../ui/layout.js';

export interface ReplayData {
  mission: Mission | undefined;
  signals: Signal[];
}

export function getReplay(projectDir: string, missionId: string): ReplayData {
  const ctx = loadProjectContext(projectDir);
  const mission = ctx.missionStore.get(missionId);
  const signals = ctx.signalStore.getByMission(missionId);
  ctx.close();
  return { mission, signals };
}

export function printReplay(projectDir: string, missionId: string): void {
  const { mission, signals } = getReplay(projectDir, missionId);

  const w = 72;

  if (!mission) {
    console.log(renderBox('REPLAY', [chalk.red(` Mission "${missionId}" not found.`)], w));
    return;
  }

  const statusIcon = mission.status === 'completed' ? chalk.green('●')
    : mission.status === 'failed' ? chalk.red('●')
    : chalk.gray('○');

  const headerLines: string[] = [
    ` ${mission.description}`,
    ` ${statusIcon} ${mission.status}  ${chalk.gray(formatTimestamp(mission.createdAt))}  ${chalk.gray(`${signals.length} signals`)}`,
  ];

  const signalLines: string[] = [];
  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const prefix = signal.severity === 'critical' ? chalk.red('!')
      : signal.severity === 'warning' ? chalk.yellow('~')
      : chalk.gray('·');

    signalLines.push(` ${prefix} ${chalk.gray(time)} ${chalk.cyan(`[${signal.source}]`)} ${signal.topic}`);
  }

  // Build the full output manually for the divider
  const inner = w - 2;
  const top = `┌ REPLAY ${'─'.repeat(inner - 8)}┐`;
  const divider = renderDivider(w);
  const bottom = `└${'─'.repeat(inner)}┘`;

  const allLines = [
    top,
    ...headerLines.map((l) => `│${padRight(l, inner)}│`),
    divider,
    ...signalLines.map((l) => `│${padRight(l, inner)}│`),
    bottom,
  ];

  console.log(allLines.join('\n'));
}
