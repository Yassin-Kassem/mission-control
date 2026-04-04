import {
  createDatabase, type SwarmDatabase, SignalBus, SignalStore, MemoryManager,
  MissionStore, MissionPlanner, CheckpointManager, ContextAnalyzer,
  DroneRegistry, type DroneManifest,
} from '@swarm/core';
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
  close(): void;
}

export function loadProjectContext(projectDir: string): ProjectContext {
  const swarmDir = path.join(projectDir, '.swarm');
  if (!fs.existsSync(swarmDir)) {
    throw new Error(`Project not initialized. Run \`swarm init\` first.`);
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

  for (const drone of getBuiltinDrones()) {
    registry.register(drone);
  }

  const analyzer = new ContextAnalyzer(registry, memory);

  return {
    projectDir,
    db, bus, signalStore, memory, missionStore, checkpoints,
    registry, planner, analyzer,
    close() { db.close(); },
  };
}

function getBuiltinDrones(): DroneManifest[] {
  return [
    { name: 'scout', description: 'Explores codebase, maps context', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['scout.done'], listens: [] }, priority: 100, escalation: 'user' },
    { name: 'architect', description: 'Designs system architecture', triggers: { taskSize: 'large' }, opinions: { requires: ['spec before code'], suggests: [], blocks: [] }, signals: { emits: ['architect.done'], listens: ['scout.done'] }, priority: 90, escalation: 'user' },
    { name: 'coder', description: 'Implements code', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['coder.done'], listens: ['architect.done'] }, priority: 50, escalation: 'user' },
    { name: 'tester', description: 'Writes and runs tests', triggers: {}, opinions: { requires: ['test coverage'], suggests: [], blocks: [] }, signals: { emits: ['tester.done'], listens: ['coder.done'] }, priority: 40, escalation: 'user' },
    { name: 'debugger', description: 'Systematic root-cause analysis', triggers: { keywords: ['bug', 'error', 'debug', 'crash'] }, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['debugger.done'], listens: [] }, priority: 85, escalation: 'user' },
    { name: 'security', description: 'Flags vulnerabilities', triggers: { keywords: ['auth', 'payment', 'token', 'password', 'credential'] }, opinions: { requires: [], suggests: [], blocks: ['insecure patterns'] }, signals: { emits: ['security.done'], listens: ['scout.done'] }, priority: 80, escalation: 'user' },
    { name: 'reviewer', description: 'Final quality check', triggers: {}, opinions: { requires: [], suggests: [], blocks: [] }, signals: { emits: ['reviewer.done'], listens: ['coder.done', 'tester.done'] }, priority: 10, escalation: 'user' },
    { name: 'docs', description: 'Documentation generation', triggers: { taskSize: 'large' }, opinions: { requires: [], suggests: ['document public APIs'], blocks: [] }, signals: { emits: ['docs.done'], listens: ['coder.done'] }, priority: 5, escalation: 'user' },
  ];
}
