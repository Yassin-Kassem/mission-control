import { type Mission, type Signal } from '@swarm/core';
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
  if (!mission) {
    console.error(`Mission "${missionId}" not found.`);
    return;
  }
  console.log(`Replay: ${mission.description}`);
  console.log(`Status: ${mission.status} | Created: ${formatTimestamp(mission.createdAt)}`);
  console.log(`Signals: ${signals.length}\n`);
  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString();
    const prefix = signal.severity === 'critical' ? '!' : signal.severity === 'warning' ? '~' : ' ';
    console.log(`${prefix} ${time} [${signal.source}] ${signal.topic}`);
    if (Object.keys(signal.payload).length > 0) {
      console.log(`    ${JSON.stringify(signal.payload)}`);
    }
  }
}
