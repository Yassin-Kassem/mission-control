import type { DroneManifest } from '../drones/drone-manifest.js';

export interface PlanStep {
  droneName: string;
  parallelGroup: number;
  dependsOn: string[];
}

export interface MissionPlan {
  steps: PlanStep[];
}

export class MissionPlanner {
  plan(drones: DroneManifest[]): MissionPlan {
    const sorted = [...drones].sort((a, b) => b.priority - a.priority);
    const emittedSignals = new Map<string, string>();
    for (const drone of sorted) {
      for (const signal of drone.signals.emits) {
        emittedSignals.set(signal, drone.name);
      }
    }
    const deps = new Map<string, string[]>();
    for (const drone of sorted) {
      const droneDeps: string[] = [];
      for (const listen of drone.signals.listens) {
        const emitter = emittedSignals.get(listen);
        if (emitter && emitter !== drone.name) droneDeps.push(emitter);
      }
      deps.set(drone.name, droneDeps);
    }
    const assigned = new Map<string, number>();
    const steps: PlanStep[] = [];
    for (const drone of sorted) {
      const droneDeps = deps.get(drone.name) ?? [];
      let group = 0;
      for (const dep of droneDeps) {
        const depGroup = assigned.get(dep) ?? 0;
        group = Math.max(group, depGroup + 1);
      }
      assigned.set(drone.name, group);
      steps.push({ droneName: drone.name, parallelGroup: group, dependsOn: droneDeps });
    }
    return { steps };
  }
}
