import { createMissionId, MissionRunner, type DroneExecutor } from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import { loadProjectContext } from '../context.js';

export interface RunOptions {
  noDashboard?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(description: string, projectDir: string, options: RunOptions = {}): Promise<void> {
  const ctx = loadProjectContext(projectDir);

  const profile = ctx.analyzer.analyze(description, projectDir);

  console.log(`Mission: ${description}`);
  console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
  console.log(`Drones: ${profile.recommendedDrones.map((d) => d.manifest.name).join(', ')}`);
  console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);

  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard) {
    const port = options.port ?? 3000;
    dashboard = new DashboardServer(ctx.bus, { port });
    const address = await dashboard.start();
    console.log(`Dashboard: http://localhost:${address.port}`);
  }

  ctx.bus.on('*', (signal) => { ctx.signalStore.save(signal); });

  const missionId = createMissionId();
  const drones = profile.recommendedDrones.map((d) => d.manifest);

  const runner = new MissionRunner({
    bus: ctx.bus, memory: ctx.memory, missionStore: ctx.missionStore,
    checkpoints: ctx.checkpoints, planner: ctx.planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() { return { summary: `${_name} completed (placeholder)` }; },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  console.log(`\nMission ${result.status}`);
  if (result.completedDrones.length) console.log(`  Completed: ${result.completedDrones.join(', ')}`);
  if (result.failedDrones.length) console.log(`  Failed: ${result.failedDrones.join(', ')}`);

  if (dashboard) await dashboard.stop();
  ctx.close();
}
