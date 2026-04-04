import { createMissionId } from '@mctl/core';
import { loadProjectContext } from '../context.js';

export interface DispatchOptions {
  task: string;
  mode?: string;
  missionId?: string;
}

/**
 * Generate the full dispatch plan for a mission.
 * Each step contains either a tool command or a complete AI prompt.
 * Output is JSON for Claude Code to consume.
 */
export function generateDispatchPlan(projectDir: string, options: DispatchOptions): string {
  const ctx = loadProjectContext(projectDir);
  const { task, mode } = options;

  const profile = ctx.analyzer.analyze(task, projectDir);
  const missionId = options.missionId ?? createMissionId();

  // Load memory context for AI drones
  const memoryEntries = ctx.memory.searchAll(task);
  if (memoryEntries.length > 0) {
    const memCtx = memoryEntries
      .slice(0, 5)
      .map((e) => `- ${e.key}: ${e.value}`)
      .join('\n');
    ctx.promptBuilder.setMemoryContext(memCtx);
  }

  const drones = profile.recommendedDrones.map((d) => d.manifest);
  const plan = ctx.promptBuilder.buildPlan(missionId, task, drones);

  const output = {
    missionId,
    description: task,
    intent: profile.intent,
    scope: profile.scope,
    mode: mode ?? (profile.scope === 'trivial' || profile.scope === 'small' ? 'solo' : 'copilot'),
    estimatedTokens: profile.estimatedTokens,
    steps: plan.steps,
  };

  ctx.close();
  return JSON.stringify(output, null, 2);
}

/**
 * Generate the prompt for a single drone.
 * Used when re-dispatching a specific drone (e.g., after failure).
 */
export function generateDronePrompt(projectDir: string, droneName: string, task: string): string {
  const ctx = loadProjectContext(projectDir);

  const manifest = ctx.registry.get(droneName);
  if (!manifest) {
    ctx.close();
    throw new Error(`Drone "${droneName}" not found in fleet.`);
  }

  if (manifest.type === 'tool') {
    ctx.close();
    return JSON.stringify({
      drone: droneName,
      type: 'tool',
      command: `npx @mctl/cli drone exec ${droneName}`,
    });
  }

  const prompt = ctx.promptBuilder.buildPrompt(manifest, task);
  ctx.close();
  return JSON.stringify(prompt, null, 2);
}
