import { createMissionId } from '@swarm/core';
import { loadProjectContext } from '../context.js';

const AI_DRONES = new Set(['architect', 'coder', 'reviewer', 'debugger', 'docs']);

export interface AnalysisResult {
  missionId: string;
  intent: string;
  scope: string;
  drones: { name: string; type: 'ai' | 'tool'; priority: number; reason: string }[];
  plan: { droneName: string; parallelGroup: number; type: 'ai' | 'tool'; dependsOn: string[] }[];
  estimatedTokens: number;
  project: {
    languages: string[];
    frameworks: string[];
    hasTests: boolean;
    testRunner: string | null;
  };
}

export function analyzeMission(description: string, projectDir: string): AnalysisResult {
  const ctx = loadProjectContext(projectDir);
  const profile = ctx.analyzer.analyze(description, projectDir);
  const missionId = createMissionId();

  const drones = profile.recommendedDrones.map((d) => ({
    name: d.manifest.name,
    type: (AI_DRONES.has(d.manifest.name) ? 'ai' : 'tool') as 'ai' | 'tool',
    priority: d.manifest.priority,
    reason: d.reason,
  }));

  const missionPlan = ctx.planner.plan(profile.recommendedDrones.map((d) => d.manifest));
  const plan = missionPlan.steps.map((step) => ({
    droneName: step.droneName,
    parallelGroup: step.parallelGroup,
    type: (AI_DRONES.has(step.droneName) ? 'ai' : 'tool') as 'ai' | 'tool',
    dependsOn: step.dependsOn,
  }));

  ctx.close();

  return {
    missionId,
    intent: profile.intent,
    scope: profile.scope,
    drones,
    plan,
    estimatedTokens: profile.estimatedTokens,
    project: {
      languages: profile.project.languages,
      frameworks: profile.project.frameworks,
      hasTests: profile.project.hasTests,
      testRunner: profile.project.testRunner,
    },
  };
}

export function printAnalysis(description: string, projectDir: string): void {
  const result = analyzeMission(description, projectDir);
  console.log(JSON.stringify(result, null, 2));
}
