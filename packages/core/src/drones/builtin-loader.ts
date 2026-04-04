import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDroneManifest, type DroneManifest } from './drone-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = path.join(__dirname, 'builtin');

export interface BuiltinDrone {
  manifest: DroneManifest;
  skill?: string;  // markdown skill content for AI drones
}

export function loadBuiltinDrones(): BuiltinDrone[] {
  // In dist/, builtin/ is copied alongside the JS files
  // In dev, it's in src/drones/builtin/
  const dir = fs.existsSync(BUILTIN_DIR) ? BUILTIN_DIR : path.join(__dirname, '..', 'src', 'drones', 'builtin');

  if (!fs.existsSync(dir)) return [];

  const drones: BuiltinDrone[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const droneDir = path.join(dir, entry.name);
    const yamlPath = path.join(droneDir, 'drone.yaml');
    if (!fs.existsSync(yamlPath)) continue;

    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const manifest = parseDroneManifest(yamlContent);

    let skill: string | undefined;
    const skillPath = path.join(droneDir, 'skill.md');
    if (fs.existsSync(skillPath)) {
      skill = fs.readFileSync(skillPath, 'utf-8');
    }

    drones.push({ manifest, skill });
  }

  return drones;
}

export function loadBuiltinSkill(droneName: string): string | undefined {
  const dir = fs.existsSync(BUILTIN_DIR) ? BUILTIN_DIR : path.join(__dirname, '..', 'src', 'drones', 'builtin');
  const skillPath = path.join(dir, droneName, 'skill.md');
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, 'utf-8');
  }
  return undefined;
}
