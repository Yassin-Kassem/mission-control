import {
  createDatabase, createMissionId, SignalBus, SignalStore, MemoryManager,
  MissionStore, MissionPlanner, MissionRunner, CheckpointManager,
  ContextAnalyzer, DroneRegistry, type DroneManifest, type DroneExecutor,
} from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import path from 'path';
import fs from 'fs';

export interface RunOptions {
  noDashboard?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(description: string, projectDir: string, options: RunOptions = {}): Promise<void> {
  const swarmDir = path.join(projectDir, '.swarm');
  if (!fs.existsSync(swarmDir)) {
    console.error('Project not initialized. Run `swarm init` first.');
    process.exit(1);
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

  const builtinDrones = getBuiltinDrones();
  for (const drone of builtinDrones) registry.register(drone);

  const analyzer = new ContextAnalyzer(registry, memory);
  const profile = analyzer.analyze(description, projectDir);

  console.log(`Mission: ${description}`);
  console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
  console.log(`Drones: ${profile.recommendedDrones.map((d) => d.manifest.name).join(', ')}`);
  console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);

  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard) {
    const port = options.port ?? 3000;
    dashboard = new DashboardServer(bus, { port });
    const address = await dashboard.start();
    console.log(`Dashboard: http://localhost:${address.port}`);
  }

  bus.on('*', (signal) => { signalStore.save(signal); });

  const missionId = createMissionId();
  const drones = profile.recommendedDrones.map((d) => d.manifest);

  const runner = new MissionRunner({
    bus, memory, missionStore, checkpoints, planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() { return { summary: `${_name} completed (placeholder)` }; },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  console.log(`\nMission ${result.status}`);
  if (result.completedDrones.length) console.log(`  Completed: ${result.completedDrones.join(', ')}`);
  if (result.failedDrones.length) console.log(`  Failed: ${result.failedDrones.join(', ')}`);

  if (dashboard) await dashboard.stop();
  db.close();
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
