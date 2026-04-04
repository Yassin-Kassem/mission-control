import { type Mission } from '@mctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { header, colors, table } from '../ui/theme.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);

  console.log('');
  console.log(header(`MISSION HISTORY (${missions.length})`));
  console.log('');

  if (missions.length === 0) {
    console.log(`  ${colors.muted('No missions yet. Run')} ${colors.bright('mission run "task"')} ${colors.muted('to start one.')}`);
    console.log('');
    return;
  }

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  const rows = missions.map((m) => {
    const icon = m.status === 'completed' ? colors.success('●')
      : m.status === 'failed' ? colors.danger('●')
      : colors.muted('○');
    return [
      m.id.slice(0, 16),
      `${icon} ${m.status}`,
      trunc(m.description, 28),
      colors.muted(formatTimestamp(m.createdAt)),
    ];
  });

  console.log(table(
    ['ID', 'Status', 'Description', 'Date'],
    rows,
    [16, 14, 28, 19],
  ));
  console.log('');
}
