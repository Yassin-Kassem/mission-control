import { type Mission, type Signal } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';

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
  const w = 64;
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  if (!mission) {
    const lines = [
      `┌ REPLAY ${'─'.repeat(inner - 8)}┐`,
      ln(chalk.red(` Mission "${missionId}" not found.`)),
      `└${'─'.repeat(inner)}┘`,
    ];
    console.log(lines.join('\n'));
    return;
  }

  const icon = mission.status === 'completed' ? chalk.green('●')
    : mission.status === 'failed' ? chalk.red('●')
    : chalk.gray('○');

  const lines: string[] = [];
  lines.push(`┌ REPLAY ${'─'.repeat(inner - 8)}┐`);
  lines.push(ln(` ${mission.description}`));
  lines.push(ln(` ${icon} ${mission.status}  ${chalk.gray(formatTimestamp(mission.createdAt))}  ${chalk.gray(`${signals.length} signals`)}`));
  lines.push(`├${'─'.repeat(inner)}┤`);

  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const prefix = signal.severity === 'critical' ? chalk.red('!')
      : signal.severity === 'warning' ? chalk.yellow('~')
      : chalk.gray('·');
    lines.push(ln(` ${prefix} ${chalk.gray(time)} ${chalk.cyan(`[${signal.source}]`)} ${signal.topic}`));
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
