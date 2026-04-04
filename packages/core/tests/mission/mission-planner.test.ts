import { describe, it, expect } from 'vitest';
import { MissionPlanner } from '../../src/mission/mission-planner.js';
import type { DroneManifest } from '../../src/drones/drone-manifest.js';

function makeDrone(name: string, priority: number, listens: string[] = []): DroneManifest {
  return {
    name, description: `${name} drone`, triggers: {},
    opinions: { requires: [], suggests: [], blocks: [] },
    signals: { emits: [`${name}.done`], listens }, priority, escalation: 'user',
  };
}

describe('MissionPlanner', () => {
  it('orders drones by priority', () => {
    const planner = new MissionPlanner();
    const drones = [makeDrone('coder', 50), makeDrone('scout', 100), makeDrone('reviewer', 10)];
    const plan = planner.plan(drones);
    expect(plan.steps.map((s) => s.droneName)).toEqual(['scout', 'coder', 'reviewer']);
  });

  it('identifies parallel opportunities', () => {
    const planner = new MissionPlanner();
    const drones = [
      makeDrone('scout', 100),
      makeDrone('architect', 90),
      makeDrone('security', 80),
      makeDrone('coder', 50, ['architect.done']),
    ];
    const plan = planner.plan(drones);
    expect(plan.steps[0].droneName).toBe('scout');
    const architectStep = plan.steps.find((s) => s.droneName === 'architect')!;
    const securityStep = plan.steps.find((s) => s.droneName === 'security')!;
    expect(architectStep.parallelGroup).toBe(securityStep.parallelGroup);
    const coderStep = plan.steps.find((s) => s.droneName === 'coder')!;
    expect(coderStep.parallelGroup).toBeGreaterThan(architectStep.parallelGroup);
  });

  it('assigns sequential groups when all drones have dependencies', () => {
    const planner = new MissionPlanner();
    const drones = [
      makeDrone('scout', 100),
      makeDrone('coder', 50, ['scout.done']),
      makeDrone('tester', 40, ['coder.done']),
    ];
    const plan = planner.plan(drones);
    const groups = plan.steps.map((s) => s.parallelGroup);
    expect(new Set(groups).size).toBe(3);
  });
});
