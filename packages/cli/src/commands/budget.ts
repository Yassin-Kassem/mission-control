import { loadProjectContext } from '../context.js';

export interface BudgetSummary {
  totalMissions: number;
  totalSignals: number;
  recentMissions: { id: string; description: string; signalCount: number; status: string }[];
}

export function getMissionBudget(projectDir: string): BudgetSummary {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(10);
  const recentMissions = missions.map((m) => {
    const signals = ctx.signalStore.getByMission(m.id);
    return { id: m.id, description: m.description, signalCount: signals.length, status: m.status };
  });
  const totalSignals = recentMissions.reduce((sum, m) => sum + m.signalCount, 0);
  ctx.close();
  return { totalMissions: missions.length, totalSignals, recentMissions };
}

export function printBudget(projectDir: string): void {
  const budget = getMissionBudget(projectDir);
  console.log(JSON.stringify(budget, null, 2));
}
