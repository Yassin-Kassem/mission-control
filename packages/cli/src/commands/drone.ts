import { type DroneManifest, parseDroneManifest, validateManifest } from '@mctl/core';
import { scaffoldDrone as doScaffold } from '@mctl/sdk';
import fs from 'fs';
import path from 'path';
import { header, kv, colors, table, success, info, error as themeError } from '../ui/theme.js';
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

  console.log('');
  console.log(header(`DRONES (${drones.length})`));
  console.log('');

  const rows = drones.map((d) => [
    d.name,
    String(d.priority),
    d.description,
  ]);

  console.log(table(['Name', 'Pri', 'Description'], rows, [14, 4, 34]));
  console.log('');
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);

  if (!drone) {
    console.log('');
    console.log(themeError(`Drone "${name}" not found.`));
    console.log('');
    return;
  }

  console.log('');
  console.log(header(`DRONE: ${drone.name.toUpperCase()}`));
  console.log('');
  console.log(kv('Description', drone.description));
  console.log(kv('Priority', String(drone.priority)));
  console.log(kv('Escalation', drone.escalation));

  if (drone.triggers.keywords) {
    console.log(kv('Keywords', colors.secondary((drone.triggers.keywords as string[]).join(', '))));
  }
  if (drone.opinions.requires.length) {
    console.log(kv('Requires', drone.opinions.requires.join(', ')));
  }
  if (drone.opinions.blocks.length) {
    console.log(kv('Blocks', colors.danger(drone.opinions.blocks.join(', '))));
  }
  if (drone.signals.emits.length) {
    console.log(kv('Emits', colors.success(drone.signals.emits.join(', '))));
  }
  if (drone.signals.listens.length) {
    console.log(kv('Listens', colors.warning(drone.signals.listens.join(', '))));
  }
  console.log('');
}

export function scaffoldNewDrone(name: string, targetDir: string): void {
  const files = doScaffold(name, targetDir);

  console.log('');
  console.log(header(`DRONE CREATED: ${name}`));
  console.log('');
  for (const f of files) {
    console.log(success(`${name}/${f}`));
  }
  console.log('');
  console.log(info(`Edit ${colors.bright(`${name}/drone.yaml`)} to configure triggers`));
  console.log(info(`Edit ${colors.bright(`${name}/skills/main.md`)} to define behavior`));
  console.log(info(`Install: ${colors.bright(`mission drone add ${name}`)}`));
  console.log('');
}

export function addDrone(source: string, projectDir: string): string {
  const dronesDir = path.join(projectDir, '.mctl', 'drones');
  fs.mkdirSync(dronesDir, { recursive: true });

  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source not found: ${source}`);
  }

  const manifestPath = path.join(sourcePath, 'drone.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No drone.yaml found in ${source}. Not a valid drone.`);
  }

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = parseDroneManifest(content);
  const errors = validateManifest(manifest);
  if (errors.length > 0) {
    throw new Error(`Invalid drone manifest: ${errors.join(', ')}`);
  }

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
