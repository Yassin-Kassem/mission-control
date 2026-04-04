import { ScoutExecutor, TesterExecutor, SecurityExecutor, type DroneResult } from '@mctl/core';

const AI_DRONES = new Set(['architect', 'coder', 'reviewer', 'debugger', 'docs']);
const TOOL_DRONES = new Set(['scout', 'tester', 'security']);

export async function execDrone(name: string, projectDir: string): Promise<DroneResult> {
  if (AI_DRONES.has(name)) {
    throw new Error(`Drone "${name}" requires Claude Code — it cannot run standalone.`);
  }
  if (!TOOL_DRONES.has(name)) {
    throw new Error(`Unknown tool drone "${name}". Available: ${[...TOOL_DRONES].join(', ')}`);
  }

  switch (name) {
    case 'scout':
      return new ScoutExecutor(projectDir).execute();
    case 'tester':
      return new TesterExecutor(projectDir).execute();
    case 'security':
      return new SecurityExecutor(projectDir).execute();
    default:
      throw new Error(`Unknown tool drone "${name}"`);
  }
}

export async function printDroneExec(name: string, projectDir: string): Promise<void> {
  const result = await execDrone(name, projectDir);
  console.log(JSON.stringify(result, null, 2));
}
