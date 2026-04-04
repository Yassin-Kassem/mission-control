import { type Mission } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatStatus, formatTimestamp } from '../format.js';

export interface SwarmStatus {
  totalMissions: number;
  latestMission?: Mission;
  memoryStats: { short: number; working: number; long: number };
  registeredDrones: number;
}

export function getStatus(projectDir: string): SwarmStatus {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(1);
  const allMissions = ctx.missionStore.list(9999);
  const status: SwarmStatus = {
    totalMissions: allMissions.length,
    latestMission: missions[0],
    memoryStats: {
      short: ctx.memory.short.list().length,
      working: ctx.memory.working.list().length,
      long: ctx.memory.long.list().length,
    },
    registeredDrones: ctx.registry.list().length,
  };
  ctx.close();
  return status;
}

export function printStatus(projectDir: string): void {
  const status = getStatus(projectDir);
  const w = 52;
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  const lines: string[] = [];
  lines.push(`┌ SWARM STATUS ${'─'.repeat(inner - 15)}┐`);

  if (status.latestMission) {
    lines.push(ln(` Missions:   ${chalk.bold(String(status.totalMissions))} total`));
    lines.push(ln(` Latest:     ${formatStatus(status.latestMission.status)}`));
    lines.push(ln(`             "${status.latestMission.description}"`));
    lines.push(ln(`             ${chalk.gray(formatTimestamp(status.latestMission.createdAt))}`));
  } else {
    lines.push(ln(` Missions:   ${chalk.gray('none yet')}`));
  }

  lines.push(ln(''));
  lines.push(ln(chalk.bold(' Memory')));
  lines.push(ln(`   short-term  ${String(status.memoryStats.short)} entries`));
  lines.push(ln(`   working     ${String(status.memoryStats.working)} entries`));
  lines.push(ln(`   long-term   ${String(status.memoryStats.long)} entries`));
  lines.push(ln(''));
  lines.push(ln(` Drones:     ${chalk.bold(String(status.registeredDrones))} registered`));

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
