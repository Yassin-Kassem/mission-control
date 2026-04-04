import { type DroneManifest } from '@swarm/core';
import { loadProjectContext } from '../context.js';
import { formatTable } from '../format.js';

export function listDrones(projectDir: string): DroneManifest[] {
  const ctx = loadProjectContext(projectDir);
  const drones = ctx.registry.list();
  ctx.close();
  return drones;
}

export function getDroneInfo(projectDir: string, name: string): DroneManifest | undefined {
  const ctx = loadProjectContext(projectDir);
  const drone = ctx.registry.get(name);
  ctx.close();
  return drone;
}

export function printDroneList(projectDir: string): void {
  const drones = listDrones(projectDir);
  console.log(`Registered Drones (${drones.length})\n`);
  const rows: string[][] = [['Name', 'Priority', 'Description']];
  for (const d of drones) {
    rows.push([d.name, String(d.priority), d.description]);
  }
  console.log(formatTable(rows));
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);
  if (!drone) {
    console.error(`Drone "${name}" not found.`);
    return;
  }
  console.log(`Drone: ${drone.name}`);
  console.log(`Description: ${drone.description}`);
  console.log(`Priority: ${drone.priority}`);
  console.log(`Escalation: ${drone.escalation}`);
  if (drone.triggers.keywords) {
    console.log(`Keywords: ${(drone.triggers.keywords as string[]).join(', ')}`);
  }
  if (drone.opinions.requires.length) {
    console.log(`Requires: ${drone.opinions.requires.join(', ')}`);
  }
  if (drone.signals.emits.length) {
    console.log(`Emits: ${drone.signals.emits.join(', ')}`);
  }
  if (drone.signals.listens.length) {
    console.log(`Listens: ${drone.signals.listens.join(', ')}`);
  }
}
