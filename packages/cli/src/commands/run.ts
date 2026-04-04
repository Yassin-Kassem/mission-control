import { createMissionId, MissionRunner, type DroneExecutor } from '@swarm/core';
import { DashboardServer } from '../dashboard/server.js';
import { loadProjectContext } from '../context.js';
import { TerminalUI } from '../ui/terminal-ui.js';

export interface RunOptions {
  noDashboard?: boolean;
  noUi?: boolean;
  drones?: string;
  scope?: string;
  noAnalyze?: boolean;
  port?: number;
}

export async function runMission(description: string, projectDir: string, options: RunOptions = {}): Promise<void> {
  const ctx = loadProjectContext(projectDir);

  const profile = ctx.analyzer.analyze(description, projectDir);
  const droneNames = profile.recommendedDrones.map((d) => d.manifest.name);
  const missionId = createMissionId();

  const isTTY = process.stdout.isTTY ?? false;
  const useTerminalUI = isTTY && !options.noUi;

  if (!useTerminalUI) {
    console.log(`Mission: ${description}`);
    console.log(`Intent: ${profile.intent} | Scope: ${profile.scope}`);
    console.log(`Drones: ${droneNames.join(', ')}`);
    console.log(`Estimated tokens: ~${profile.estimatedTokens.toLocaleString()}`);
  }

  let dashboard: DashboardServer | undefined;
  if (!options.noDashboard && options.port) {
    dashboard = new DashboardServer(ctx.bus, { port: options.port });
    const address = await dashboard.start();
    if (!useTerminalUI) {
      console.log(`Dashboard: http://localhost:${address.port}`);
    }
  }

  ctx.bus.on('*', (signal) => { ctx.signalStore.save(signal); });

  let terminalUI: TerminalUI | undefined;
  if (useTerminalUI) {
    const width = Math.min(process.stdout.columns ?? 80, 80);
    terminalUI = new TerminalUI({
      bus: ctx.bus,
      droneNames,
      missionDescription: description,
      missionId,
      width,
    });
    terminalUI.start();
  }

  const drones = profile.recommendedDrones.map((d) => d.manifest);
  const runner = new MissionRunner({
    bus: ctx.bus, memory: ctx.memory, missionStore: ctx.missionStore,
    checkpoints: ctx.checkpoints, planner: ctx.planner,
    resolveExecutor: (_name: string): DroneExecutor => ({
      async execute() { return { summary: `${_name} completed (placeholder)` }; },
    }),
  });

  const result = await runner.run(missionId, description, drones);

  if (terminalUI) {
    terminalUI.stop();
  }

  if (!useTerminalUI) {
    console.log(`\nMission ${result.status}`);
    if (result.completedDrones.length) console.log(`  Completed: ${result.completedDrones.join(', ')}`);
    if (result.failedDrones.length) console.log(`  Failed: ${result.failedDrones.join(', ')}`);
  } else {
    console.log(`\nMission ${result.status} — ${result.completedDrones.length} drones completed${result.failedDrones.length ? `, ${result.failedDrones.length} failed` : ''}`);
  }

  if (dashboard) await dashboard.stop();
  ctx.close();
}
