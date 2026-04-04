import { loadProjectContext } from '../context.js';
import { header, colors, table } from '../ui/theme.js';

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

  if (!process.stdout.isTTY) {
    console.log(JSON.stringify(budget, null, 2));
    return;
  }

  console.log('');
  console.log(header(`BUDGET (${budget.totalMissions} missions)`));
  console.log('');

  if (budget.recentMissions.length === 0) {
    console.log(`  ${colors.muted('No missions yet.')}`);
    console.log('');
    return;
  }

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  const rows = budget.recentMissions.map((m) => [
    m.id.slice(0, 14),
    trunc(m.description, 28),
    String(m.signalCount),
    m.status,
  ]);

  console.log(table(['ID', 'Description', 'Signals', 'Status'], rows, [14, 28, 7, 10]));
  console.log('');
  console.log(`  ${colors.muted('Total signals:')} ${colors.bright(String(budget.totalSignals))}`);
  console.log('');
}
