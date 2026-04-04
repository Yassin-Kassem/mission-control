import { type Mission } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp, formatTable } from '../format.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);
  if (missions.length === 0) {
    console.log('No missions yet. Run `swarm run "task"` to start one.');
    return;
  }
  console.log(`Mission History (${missions.length} shown)\n`);
  const rows: string[][] = [['ID', 'Status', 'Description', 'Date']];
  for (const m of missions) {
    rows.push([
      m.id,
      m.status,
      m.description.length > 40 ? m.description.slice(0, 37) + '...' : m.description,
      formatTimestamp(m.createdAt),
    ]);
  }
  console.log(formatTable(rows));
}
