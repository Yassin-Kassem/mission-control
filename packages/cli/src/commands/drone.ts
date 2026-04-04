import { type DroneManifest } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { renderBox, renderDivider, padRight } from '../ui/layout.js';

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
  const w = 60;
  const lines: string[] = [];

  lines.push(` ${chalk.gray(padRight('Name', 12))}  ${chalk.gray(padRight('Priority', 8))}  ${chalk.gray('Description')}`);

  for (const d of drones) {
    const prio = d.priority >= 80 ? chalk.green(String(d.priority))
      : d.priority >= 40 ? chalk.yellow(String(d.priority))
      : chalk.gray(String(d.priority));

    lines.push(` ${padRight(d.name, 12)}  ${padRight(String(d.priority), 8)}  ${chalk.gray(d.description)}`);
  }

  console.log(renderBox(`DRONES (${drones.length})`, lines, w));
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);
  const w = 50;

  if (!drone) {
    console.log(renderBox('DRONE', [chalk.red(` Drone "${name}" not found.`)], w));
    return;
  }

  const lines: string[] = [
    ` ${chalk.bold(drone.name)}`,
    ` ${chalk.gray(drone.description)}`,
    '',
    ` Priority:    ${chalk.bold(String(drone.priority))}`,
    ` Escalation:  ${drone.escalation}`,
  ];

  if (drone.triggers.keywords) {
    lines.push(` Keywords:    ${chalk.cyan((drone.triggers.keywords as string[]).join(', '))}`);
  }
  if (drone.opinions.requires.length) {
    lines.push(` Requires:    ${drone.opinions.requires.join(', ')}`);
  }
  if (drone.opinions.blocks.length) {
    lines.push(` Blocks:      ${chalk.red(drone.opinions.blocks.join(', '))}`);
  }
  if (drone.signals.emits.length) {
    lines.push(` Emits:       ${chalk.green(drone.signals.emits.join(', '))}`);
  }
  if (drone.signals.listens.length) {
    lines.push(` Listens:     ${chalk.yellow(drone.signals.listens.join(', '))}`);
  }

  console.log(renderBox('DRONE', lines, w));
}
