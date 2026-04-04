import type { SignalBus } from '../signals/signal-bus.js';
import type { MemoryManager } from '../memory/memory-manager.js';
import type { MissionStore } from './mission-store.js';
import type { CheckpointManager } from '../recovery/checkpoint-manager.js';
import type { MissionPlanner } from './mission-planner.js';
import type { DroneManifest } from '../drones/drone-manifest.js';
import { DroneRunner, type DroneExecutor } from '../drones/drone-runner.js';
import { createSignal } from '../signals/signal.js';
import { MemoryPromoter } from '../memory/memory-promoter.js';

export interface MissionRunnerConfig {
  bus: SignalBus;
  memory: MemoryManager;
  missionStore: MissionStore;
  checkpoints: CheckpointManager;
  planner: MissionPlanner;
  resolveExecutor: (droneName: string) => DroneExecutor;
}

export interface MissionResult {
  status: 'completed' | 'failed';
  failedDrones: string[];
  completedDrones: string[];
}

export class MissionRunner {
  constructor(private config: MissionRunnerConfig) {}

  async run(missionId: string, description: string, drones: DroneManifest[]): Promise<MissionResult> {
    const { bus, memory, missionStore, checkpoints, planner } = this.config;

    missionStore.create(missionId, description);
    missionStore.update(missionId, { status: 'running', phase: 'plan' });

    bus.emit(createSignal({
      type: 'progress', source: 'mission-runner', topic: 'mission.started',
      severity: 'info', payload: { missionId, description, droneCount: drones.length }, missionId,
    }));

    const plan = planner.plan(drones);

    checkpoints.create(missionId, 'after-planning', {
      missionState: { phase: 'plan', droneCount: drones.length },
      signalHistory: bus.history(missionId),
      memorySnapshot: { short: {}, working: {} },
      droneStates: Object.fromEntries(drones.map((d) => [d.name, 'idle'])),
    });

    missionStore.update(missionId, { phase: 'execute' });

    const completedDrones: string[] = [];
    const failedDrones: string[] = [];

    const groups = new Map<number, typeof plan.steps>();
    for (const step of plan.steps) {
      if (!groups.has(step.parallelGroup)) groups.set(step.parallelGroup, []);
      groups.get(step.parallelGroup)!.push(step);
    }

    const sortedGroupKeys = [...groups.keys()].sort((a, b) => a - b);

    for (const groupKey of sortedGroupKeys) {
      const groupSteps = groups.get(groupKey)!;
      const results = await Promise.all(
        groupSteps.map(async (step) => {
          const manifest = drones.find((d) => d.name === step.droneName);
          if (!manifest) return { name: step.droneName, success: false };
          const executor = this.config.resolveExecutor(manifest.name);
          const droneRunner = new DroneRunner(manifest, executor, bus, missionId);
          droneRunner.activate();
          await droneRunner.run();
          return { name: manifest.name, success: droneRunner.state === 'done' };
        }),
      );
      for (const r of results) {
        if (r.success) completedDrones.push(r.name);
        else failedDrones.push(r.name);
      }
    }

    missionStore.update(missionId, { phase: 'report' });

    const promoter = new MemoryPromoter(memory);
    promoter.scanAndPromote();
    memory.clearShortTerm();

    const resultSummary = failedDrones.length
      ? `Completed with failures: ${failedDrones.join(', ')}`
      : `All ${completedDrones.length} drones completed successfully`;

    missionStore.complete(missionId, resultSummary);

    bus.emit(createSignal({
      type: 'progress', source: 'mission-runner', topic: 'mission.completed',
      severity: failedDrones.length ? 'warning' : 'info',
      payload: { missionId, completedDrones, failedDrones }, missionId,
    }));

    return { status: 'completed', failedDrones, completedDrones };
  }
}
