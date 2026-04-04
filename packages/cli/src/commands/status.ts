import { type Mission } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatStatus, formatTimestamp, formatTable } from '../format.js';

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
  console.log('Swarm Status');
  console.log('============\n');
  console.log(`Missions: ${status.totalMissions} total`);
  if (status.latestMission) {
    console.log(`Latest:   ${formatStatus(status.latestMission.status)} — "${status.latestMission.description}"`);
    console.log(`          ${formatTimestamp(status.latestMission.createdAt)}`);
  } else {
    console.log('Latest:   No missions yet');
  }
  console.log(`\nMemory:`);
  console.log(formatTable([
    ['Layer', 'Entries'],
    ['short-term', String(status.memoryStats.short)],
    ['working', String(status.memoryStats.working)],
    ['long-term', String(status.memoryStats.long)],
  ]));
  console.log(`\nDrones: ${status.registeredDrones} registered`);
}
