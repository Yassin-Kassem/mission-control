import { type Mission } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { formatStatus, formatTimestamp } from '../format.js';
import { renderBox, renderDivider, padRight } from '../ui/layout.js';

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
  const w = 60;
  const inner = w - 2;

  const lines: string[] = [];

  if (status.latestMission) {
    lines.push(` Missions:  ${chalk.bold(String(status.totalMissions))} total`);
    lines.push(` Latest:    ${formatStatus(status.latestMission.status)}`);
    lines.push(`            "${status.latestMission.description}"`);
    lines.push(`            ${chalk.gray(formatTimestamp(status.latestMission.createdAt))}`);
  } else {
    lines.push(` Missions:  ${chalk.gray('none yet')}`);
  }

  lines.push('');
  lines.push(chalk.bold(' Memory'));
  lines.push(`  short-term  ${chalk.bold(String(status.memoryStats.short))} entries`);
  lines.push(`  working     ${chalk.bold(String(status.memoryStats.working))} entries`);
  lines.push(`  long-term   ${chalk.bold(String(status.memoryStats.long))} entries`);

  lines.push('');
  lines.push(` Drones:    ${chalk.bold(String(status.registeredDrones))} registered`);

  console.log(renderBox('SWARM STATUS', lines, w));
}
