import { type Mission } from '@mctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { LOGO_SMALL, header, kv, divider, statusBadge, colors } from '../ui/theme.js';

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

  console.log('');
  console.log(header('STATUS'));
  console.log('');

  console.log(kv('Missions', colors.bright(String(status.totalMissions))));

  if (status.latestMission) {
    console.log(kv('Latest', statusBadge(status.latestMission.status)));
    console.log(kv('', `"${status.latestMission.description}"`));
    console.log(kv('', colors.muted(formatTimestamp(status.latestMission.createdAt))));
  } else {
    console.log(kv('Latest', colors.muted('No missions yet')));
  }

  console.log('');
  console.log(header('MEMORY'));
  console.log('');
  console.log(kv('Short-term', String(status.memoryStats.short)));
  console.log(kv('Working', String(status.memoryStats.working)));
  console.log(kv('Long-term', String(status.memoryStats.long)));

  console.log('');
  console.log(kv('Drones', `${colors.bright(String(status.registeredDrones))} registered`));
  console.log('');
}
