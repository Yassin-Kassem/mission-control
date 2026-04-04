import { type DroneManifest } from '@swarm/core';
import chalk from 'chalk';
import { loadProjectContext } from '../context.js';

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

  // Calculate width from content: name(12) + gap(2) + pri(4) + gap(3) + longest desc
  const maxDesc = Math.max(...drones.map((d) => d.description.length), 11);
  const w = Math.min(12 + 2 + 4 + 3 + maxDesc + 4, 80); // +4 for borders+margin
  const inner = w - 2;
  const descW = inner - 23; // 23 = margin(2) + name(12) + gap(2) + pri(4) + gap(3)

  const lines: string[] = [];
  lines.push(top(`DRONES (${drones.length})`, inner));
  lines.push(ln(`  ${chalk.gray(fit('Name', 12))}  ${chalk.gray(fit('Pri', 4))}   ${chalk.gray('Description')}`, inner));

  for (const d of drones) {
    lines.push(ln(`  ${fit(d.name, 12)}  ${fit(String(d.priority), 4)}   ${chalk.gray(fit(d.description, descW))}`, inner));
  }

  lines.push(bot(inner));
  console.log(lines.join('\n'));
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);

  if (!drone) {
    console.log([
      `┌ DRONE ────────────────────────────┐`,
      ln(chalk.red(`  Drone "${name}" not found.`), 34),
      `└──────────────────────────────────┘`,
    ].join('\n'));
    return;
  }

  // Build plain lines to measure
  const rows: string[] = [];
  rows.push(` ${drone.name}`);
  rows.push(` ${drone.description}`);
  rows.push(``);
  rows.push(` Priority:    ${drone.priority}`);
  rows.push(` Escalation:  ${drone.escalation}`);
  if (drone.triggers.keywords) rows.push(` Keywords:    ${(drone.triggers.keywords as string[]).join(', ')}`);
  if (drone.opinions.requires.length) rows.push(` Requires:    ${drone.opinions.requires.join(', ')}`);
  if (drone.opinions.blocks.length) rows.push(` Blocks:      ${drone.opinions.blocks.join(', ')}`);
  if (drone.signals.emits.length) rows.push(` Emits:       ${drone.signals.emits.join(', ')}`);
  if (drone.signals.listens.length) rows.push(` Listens:     ${drone.signals.listens.join(', ')}`);

  const maxRow = Math.max(...rows.map((r) => r.length));
  const w = Math.min(maxRow + 4, 80);
  const inner = w - 2;

  // Now build colored output
  const lines: string[] = [];
  lines.push(top('DRONE', inner));
  lines.push(ln(` ${chalk.bold(drone.name)}`, inner));
  lines.push(ln(` ${chalk.gray(drone.description)}`, inner));
  lines.push(ln('', inner));
  lines.push(ln(` Priority:    ${drone.priority}`, inner));
  lines.push(ln(` Escalation:  ${drone.escalation}`, inner));
  if (drone.triggers.keywords) lines.push(ln(` Keywords:    ${chalk.cyan((drone.triggers.keywords as string[]).join(', '))}`, inner));
  if (drone.opinions.requires.length) lines.push(ln(` Requires:    ${drone.opinions.requires.join(', ')}`, inner));
  if (drone.opinions.blocks.length) lines.push(ln(` Blocks:      ${chalk.red(drone.opinions.blocks.join(', '))}`, inner));
  if (drone.signals.emits.length) lines.push(ln(` Emits:       ${chalk.green(drone.signals.emits.join(', '))}`, inner));
  if (drone.signals.listens.length) lines.push(ln(` Listens:     ${chalk.yellow(drone.signals.listens.join(', '))}`, inner));

  lines.push(bot(inner));
  console.log(lines.join('\n'));
}

function fit(str: string, width: number): string {
  if (str.length <= width) return str + ' '.repeat(width - str.length);
  return str.slice(0, width - 1) + '…';
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[\d*(;\d+)*m/g, '');
}

function ln(content: string, inner: number): string {
  const visible = stripAnsi(content).length;
  const padding = Math.max(0, inner - visible);
  return `│${content}${' '.repeat(padding)}│`;
}

function top(title: string, inner: number): string {
  return `┌ ${title} ${'─'.repeat(Math.max(0, inner - title.length - 3))}┐`;
}

function bot(inner: number): string {
  return `└${'─'.repeat(inner)}┘`;
}
