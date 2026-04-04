import { type DroneManifest, parseDroneManifest, validateManifest } from '@missionctl/core';
import { scaffoldDrone as doScaffold } from '@missionctl/sdk';
import fs from 'fs';
import path from 'path';
import { banner, sectionStart, sectionEnd, kv, separator, colors, table, success, info, error as themeError } from '../ui/theme.js';
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
  console.log(banner('D R O N E   F L E E T'));
  console.log('');

  const rows = drones.map((d) => [
    colors.text(d.name),
    d.priority >= 80 ? colors.success(String(d.priority)) : d.priority >= 40 ? colors.warning(String(d.priority)) : colors.muted(String(d.priority)),
    colors.muted(d.description),
  ]);

  console.log(table(['CALLSIGN', 'PRI', 'ROLE'], rows, [14, 4, 36]));
  console.log('');
  console.log(`  ${colors.muted(`${drones.length} drones in fleet`)}`);
  console.log('');
}

export function printDroneInfo(projectDir: string, name: string): void {
  const drone = getDroneInfo(projectDir, name);

  if (!drone) {
    console.log('');
    console.log(themeError(`Drone "${name}" not found in fleet.`));
    console.log('');
    return;
  }

  console.log('');
  console.log(banner(`D R O N E :  ${drone.name.toUpperCase()}`));
  console.log('');

  console.log(sectionStart('SPECS'));
  console.log(kv('Role', colors.text(drone.description)));
  console.log(kv('Priority', colors.bright(String(drone.priority))));
  console.log(kv('Escalation', colors.text(drone.escalation)));
  console.log(sectionEnd());

  const hasTriggers = drone.triggers.keywords || drone.opinions.requires.length || drone.opinions.blocks.length;
  const hasSignals = drone.signals.emits.length || drone.signals.listens.length;

  if (hasTriggers) {
    console.log('');
    console.log(sectionStart('ENGAGEMENT RULES'));
    if (drone.triggers.keywords) {
      console.log(kv('Activates on', colors.secondary((drone.triggers.keywords as string[]).join(', '))));
    }
    if (drone.opinions.requires.length) {
      console.log(kv('Requires', colors.text(drone.opinions.requires.join(', '))));
    }
    if (drone.opinions.blocks.length) {
      console.log(kv('Blocks', colors.danger(drone.opinions.blocks.join(', '))));
    }
    console.log(sectionEnd());
  }

  if (hasSignals) {
    console.log('');
    console.log(sectionStart('COMMS'));
    if (drone.signals.emits.length) {
      console.log(kv('Transmits', colors.success(drone.signals.emits.join(', '))));
    }
    if (drone.signals.listens.length) {
      console.log(kv('Receives', colors.warning(drone.signals.listens.join(', '))));
    }
    console.log(sectionEnd());
  }
  console.log('');
}

export function scaffoldNewDrone(name: string, targetDir: string): void {
  const files = doScaffold(name, targetDir);

  console.log('');
  console.log(banner(`N E W   D R O N E :  ${name.toUpperCase()}`));
  console.log('');

  console.log(sectionStart('DEPLOYED FILES'));
  for (const f of files) {
    console.log(success(`${name}/${f}`));
  }
  console.log(sectionEnd());

  console.log('');
  console.log(separator());
  console.log('');
  console.log(info(`Edit ${colors.bright(`${name}/drone.yaml`)} ${colors.muted('— configure triggers & signals')}`));
  console.log(info(`Edit ${colors.bright(`${name}/skills/main.md`)} ${colors.muted('— define behavior')}`));
  console.log(info(`Run  ${colors.bright(`mission drone add ${name}`)} ${colors.muted('— deploy to fleet')}`));
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
    throw new Error(`Drone "${manifest.name}" is already in fleet. Remove it first.`);
  }

  copyDirSync(sourcePath, targetDir);
  return manifest.name;
}

export function removeDrone(name: string, projectDir: string): void {
  const droneDir = path.join(projectDir, '.mctl', 'drones', name);
  if (!fs.existsSync(droneDir)) {
    throw new Error(`Drone "${name}" is not in fleet.`);
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
