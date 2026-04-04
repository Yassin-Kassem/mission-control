import { type Mission } from '@mctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { banner, sectionStart, sectionEnd, kv, separator, statusBadge, colors, readout } from '../ui/theme.js';

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
  const s = getStatus(projectDir);

  console.log('');
  console.log(banner('T A C T I C A L   O V E R V I E W'));
  console.log('');

  console.log(sectionStart('OPERATIONS'));
  console.log(kv('Missions', colors.bright(String(s.totalMissions)) + colors.muted(' total')));
  if (s.latestMission) {
    console.log(kv('Last mission', statusBadge(s.latestMission.status)));
    console.log(kv('', colors.text(`"${s.latestMission.description}"`)));
    console.log(kv('', colors.muted(formatTimestamp(s.latestMission.createdAt))));
  } else {
    console.log(kv('Last mission', colors.muted('No missions deployed')));
  }
  console.log(sectionEnd());

  console.log('');

  console.log(sectionStart('INTEL'));
  console.log(kv('Short-term', colors.text(String(s.memoryStats.short)) + colors.muted(' entries')));
  console.log(kv('Working', colors.text(String(s.memoryStats.working)) + colors.muted(' entries')));
  console.log(kv('Long-term', colors.text(String(s.memoryStats.long)) + colors.muted(' entries')));
  console.log(sectionEnd());

  console.log('');

  console.log(sectionStart('FLEET'));
  console.log(kv('Drones', colors.bright(String(s.registeredDrones)) + colors.muted(' operational')));
  console.log(sectionEnd());
  console.log('');
}
