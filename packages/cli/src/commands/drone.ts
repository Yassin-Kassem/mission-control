import { type DroneManifest } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';
import { padRight } from '../ui/layout.js';

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
  const w = 64;
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  const lines: string[] = [];
  lines.push(`┌ DRONES (${drones.length}) ${'─'.repeat(Math.max(0, inner - 12 - String(drones.length).length))}┐`);
  lines.push(ln(` ${chalk.gray(padRight('Name', 12))}  ${chalk.gray(padRight('Pri', 4))}  ${chalk.gray('Description')}`));

  for (const d of drones) {
    lines.push(ln(` ${padRight(d.name, 12)}  ${padRight(String(d.priority), 4)}  ${chalk.gray(d.description)}`));
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);

  if (!drone) {
    const lines = [
      `┌ DRONE ────────────────────────────────┐`,
      `│${pad(chalk.red(` Drone "${name}" not found.`), 38)}│`,
      `└──────────────────────────────────────┘`,
    ];
    console.log(lines.join('\n'));
    return;
  }

  // Calculate width based on content
  let maxPlain = 30;
  const infoLines: string[] = [];
  infoLines.push(` ${drone.name}`);
  infoLines.push(` ${drone.description}`);
  infoLines.push(` Priority:    ${String(drone.priority)}`);
  infoLines.push(` Escalation:  ${drone.escalation}`);
  if (drone.triggers.keywords) {
    infoLines.push(` Keywords:    ${(drone.triggers.keywords as string[]).join(', ')}`);
  }
  if (drone.opinions.requires.length) infoLines.push(` Requires:    ${drone.opinions.requires.join(', ')}`);
  if (drone.opinions.blocks.length) infoLines.push(` Blocks:      ${drone.opinions.blocks.join(', ')}`);
  if (drone.signals.emits.length) infoLines.push(` Emits:       ${drone.signals.emits.join(', ')}`);
  if (drone.signals.listens.length) infoLines.push(` Listens:     ${drone.signals.listens.join(', ')}`);
  for (const l of infoLines) maxPlain = Math.max(maxPlain, l.length);

  const w = Math.min(maxPlain + 4, 80);
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  const lines: string[] = [];
  lines.push(`┌ DRONE ${'─'.repeat(inner - 7)}┐`);
  lines.push(ln(` ${chalk.bold(drone.name)}`));
  lines.push(ln(` ${chalk.gray(drone.description)}`));
  lines.push(ln(''));
  lines.push(ln(` Priority:    ${String(drone.priority)}`));
  lines.push(ln(` Escalation:  ${drone.escalation}`));

  if (drone.triggers.keywords) {
    lines.push(ln(` Keywords:    ${chalk.cyan((drone.triggers.keywords as string[]).join(', '))}`));
  }
  if (drone.opinions.requires.length) {
    lines.push(ln(` Requires:    ${drone.opinions.requires.join(', ')}`));
  }
  if (drone.opinions.blocks.length) {
    lines.push(ln(` Blocks:      ${chalk.red(drone.opinions.blocks.join(', '))}`));
  }
  if (drone.signals.emits.length) {
    lines.push(ln(` Emits:       ${chalk.green(drone.signals.emits.join(', '))}`));
  }
  if (drone.signals.listens.length) {
    lines.push(ln(` Listens:     ${chalk.yellow(drone.signals.listens.join(', '))}`));
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
