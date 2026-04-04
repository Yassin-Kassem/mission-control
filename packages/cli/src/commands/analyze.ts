import { createMissionId, SessionAdvisor, type ClaudePlan, type SessionAdvice } from '@missionctl/core';
import { loadProjectContext } from '../context.js';
import fs from 'fs';
import path from 'path';

const AI_DRONES = new Set(['architect', 'coder', 'reviewer', 'debugger', 'docs']);

export interface AnalysisResult {
  missionId: string;
  mode: string;
  intent: string;
  scope: string;
  drones: { name: string; type: 'ai' | 'tool'; priority: number; reason: string }[];
  plan: { droneName: string; parallelGroup: number; type: 'ai' | 'tool'; dependsOn: string[] }[];
  estimatedTokens: number;
  sessionAdvice: SessionAdvice;
  project: {
    languages: string[];
    frameworks: string[];
    hasTests: boolean;
    testRunner: string | null;
  };
}

function readPlanFromConfig(projectDir: string): ClaudePlan {
  const configPath = path.join(projectDir, '.mctl', 'config.yaml');
  if (!fs.existsSync(configPath)) return 'pro';
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/^plan:\s*(.+)$/m);
    if (match) {
      const plan = match[1].trim();
      if (['pro', 'max5x', 'max20x', 'api'].includes(plan)) return plan as ClaudePlan;
    }
  } catch { /* ignore */ }
  return 'pro';
}

export function analyzeMission(description: string, projectDir: string, mode = 'copilot'): AnalysisResult {
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

  // Session advice based on user's Claude plan
  const claudePlan = readPlanFromConfig(projectDir);
  const advisor = new SessionAdvisor(claudePlan);
  const sessionAdvice = advisor.advise(drones, profile.scope);

  // Use advisor's suggested mode if user didn't override
  const effectiveMode = mode === 'copilot' ? sessionAdvice.suggestedMode : mode;

  ctx.close();

  return {
    missionId,
    mode: effectiveMode,
    intent: profile.intent,
    scope: profile.scope,
    drones,
    plan,
    estimatedTokens: sessionAdvice.totalEstimatedTokens,
    sessionAdvice,
    project: {
      languages: profile.project.languages,
      frameworks: profile.project.frameworks,
      hasTests: profile.project.hasTests,
      testRunner: profile.project.testRunner,
    },
  };
}

export function printAnalysis(description: string, projectDir: string, mode = 'copilot'): void {
  const result = analyzeMission(description, projectDir, mode);

  // Piped (Claude calling) → JSON
  if (!process.stdout.isTTY) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human in terminal → pretty output
  const { header, kv, colors, table, info } = require('../ui/theme.js');
  console.log('');
  console.log(header('MISSION ANALYSIS'));
  console.log('');
  console.log(kv('Intent', result.intent));
  console.log(kv('Scope', result.scope));
  console.log(kv('Mode', result.mode));
  console.log(kv('Est. tokens', `~${result.estimatedTokens.toLocaleString()}`));
  console.log(kv('Budget usage', `${result.sessionAdvice.budgetPercent}% of ${result.sessionAdvice.plan.name} window`));
  console.log('');

  console.log(header('EXECUTION PLAN'));
  console.log('');

  const rows = result.plan.map((s: { droneName: string; parallelGroup: number; type: string }) => [
    s.droneName,
    s.type === 'ai' ? colors.secondary('AI') : colors.success('tool'),
    String(s.parallelGroup),
  ]);
  console.log(table(['Drone', 'Type', 'Group'], rows, [14, 6, 5]));
  console.log('');

  console.log(info(result.sessionAdvice.recommendation));
  console.log('');
}
