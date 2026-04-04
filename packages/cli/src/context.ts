import {
  createDatabase, type SwarmDatabase, SignalBus, SignalStore, MemoryManager,
  MissionStore, MissionPlanner, CheckpointManager, ContextAnalyzer,
  DroneRegistry, type DroneManifest, parseDroneManifest,
  DronePromptBuilder, loadBuiltinDrones,
} from '@mctl/core';
import path from 'path';
import fs from 'fs';

export interface ProjectContext {
  projectDir: string;
  db: SwarmDatabase;
  bus: SignalBus;
  signalStore: SignalStore;
  memory: MemoryManager;
  missionStore: MissionStore;
  checkpoints: CheckpointManager;
  registry: DroneRegistry;
  planner: MissionPlanner;
  analyzer: ContextAnalyzer;
  promptBuilder: DronePromptBuilder;
  close(): void;
}

export function loadProjectContext(projectDir: string): ProjectContext {
  const swarmDir = path.join(projectDir, '.mctl');
  if (!fs.existsSync(swarmDir)) {
    throw new Error(`Project not initialized. Run \`mission init\` first.`);
  }

  const dbPath = path.join(swarmDir, 'memory.db');
  const db = createDatabase(dbPath);
  const bus = new SignalBus();
  const signalStore = new SignalStore(db);
  const memory = new MemoryManager(db);
  const missionStore = new MissionStore(db);
  const checkpoints = new CheckpointManager(db);
  const registry = new DroneRegistry();
  const planner = new MissionPlanner();
  const promptBuilder = new DronePromptBuilder();

  // Load built-in drones from YAML manifests + skill files
  const builtins = loadBuiltinDrones();
  for (const drone of builtins) {
    registry.register(drone.manifest);
    if (drone.skill) {
      promptBuilder.registerSkill(drone.manifest.name, drone.skill);
    }
  }

  // Load community drones
  for (const drone of loadCommunityDrones(projectDir)) {
    if (!registry.get(drone.manifest.name)) {
      registry.register(drone.manifest);
      if (drone.skill) {
        promptBuilder.registerSkill(drone.manifest.name, drone.skill);
      }
    }
  }

  const analyzer = new ContextAnalyzer(registry, memory);

  return {
    projectDir,
    db, bus, signalStore, memory, missionStore, checkpoints,
    registry, planner, analyzer, promptBuilder,
    close() { db.close(); },
  };
}

interface LoadedDrone {
  manifest: DroneManifest;
  skill?: string;
}

function loadCommunityDrones(projectDir: string): LoadedDrone[] {
  const dronesDir = path.join(projectDir, '.mctl', 'drones');
  if (!fs.existsSync(dronesDir)) return [];

  const drones: LoadedDrone[] = [];
  const entries = fs.readdirSync(dronesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(dronesDir, entry.name, 'drone.yaml');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = parseDroneManifest(content);
      if (!manifest.name) continue;

      let skill: string | undefined;
      const skillPath = path.join(dronesDir, entry.name, 'skills', 'main.md');
      if (fs.existsSync(skillPath)) {
        skill = fs.readFileSync(skillPath, 'utf-8');
      }

      drones.push({ manifest, skill });
    } catch {
      // Skip invalid drones
    }
  }

  return drones;
}
