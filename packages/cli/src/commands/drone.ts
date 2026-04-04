import { type DroneManifest, parseDroneManifest, validateManifest } from '@mctl/core';
import { scaffoldDrone as doScaffold } from '@mctl/sdk';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
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

export function scaffoldNewDrone(name: string, targetDir: string): void {
  const files = doScaffold(name, targetDir);
  console.log(`Drone "${name}" created with ${files.length} files:`);
  for (const f of files) {
    console.log(`  ${name}/${f}`);
  }
  console.log(`\nNext steps:`);
  console.log(`  1. Edit ${name}/drone.yaml to configure triggers and signals`);
  console.log(`  2. Edit ${name}/skills/main.md to define drone behavior`);
  console.log(`  3. Run tests: cd ${name} && npx vitest run`);
}

export function addDrone(source: string, projectDir: string): string {
  const dronesDir = path.join(projectDir, '.mctl', 'drones');
  fs.mkdirSync(dronesDir, { recursive: true });

  // Resolve source path
  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source not found: ${source}`);
  }

  // Verify it has a drone.yaml
  const manifestPath = path.join(sourcePath, 'drone.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No drone.yaml found in ${source}. Not a valid drone.`);
  }

  // Parse and validate
  const content = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = parseDroneManifest(content);
  const errors = validateManifest(manifest);
  if (errors.length > 0) {
    throw new Error(`Invalid drone manifest: ${errors.join(', ')}`);
  }

  // Copy to .mctl/drones/
  const targetDir = path.join(dronesDir, manifest.name);
  if (fs.existsSync(targetDir)) {
    throw new Error(`Drone "${manifest.name}" is already installed. Remove it first.`);
  }

  copyDirSync(sourcePath, targetDir);
  return manifest.name;
}

export function removeDrone(name: string, projectDir: string): void {
  const droneDir = path.join(projectDir, '.mctl', 'drones', name);
  if (!fs.existsSync(droneDir)) {
    throw new Error(`Drone "${name}" is not installed.`);
  }
  fs.rmSync(droneDir, { recursive: true, force: true });
}

export function listInstalledDrones(projectDir: string): string[] {
  const dronesDir = path.join(projectDir, '.mctl', 'drones');
  if (!fs.existsSync(dronesDir)) return [];
  return fs.readdirSync(dronesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dronesDir, e.name, 'drone.yaml')))
    .map((e) => e.name);
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
