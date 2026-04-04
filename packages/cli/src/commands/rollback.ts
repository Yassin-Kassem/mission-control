import { MissionRollback } from '@swarm/core';

export function createSnapshot(missionId: string, projectDir: string): string {
  const rb = new MissionRollback(projectDir);
  return rb.snapshot(missionId);
}

export function rollbackMission(missionId: string, projectDir: string): void {
  const rb = new MissionRollback(projectDir);
  rb.rollback(missionId);
}

export function listSnapshots(projectDir: string): string[] {
  const rb = new MissionRollback(projectDir);
  return rb.listSnapshots();
}

export function printSnapshots(projectDir: string): void {
  const snaps = listSnapshots(projectDir);
  if (snaps.length === 0) {
    console.log('No mission snapshots found.');
    return;
  }
  console.log(`Mission Snapshots (${snaps.length}):\n`);
  for (const s of snaps) {
    console.log(`  ${s}`);
  }
}
