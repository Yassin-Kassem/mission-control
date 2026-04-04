import { type Mission } from '@missionctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { banner, colors, table, trunc } from '../ui/theme.js';

export function getHistory(projectDir: string, limit = 20): Mission[] {
  const ctx = loadProjectContext(projectDir);
  const missions = ctx.missionStore.list(limit);
  ctx.close();
  return missions;
}

export function printHistory(projectDir: string, limit = 20): void {
  const missions = getHistory(projectDir, limit);

  console.log('');
  console.log(banner('M I S S I O N   L O G'));
  console.log('');

  if (missions.length === 0) {
    console.log(`  ${colors.muted('No missions in the log. Deploy with')} ${colors.bright('mission run "task"')}`);
    console.log('');
    return;
  }

  const rows = missions.map((m) => {
    const icon = m.status === 'completed' ? colors.success('■')
      : m.status === 'failed' ? colors.danger('■')
      : colors.muted('○');
    return [
      colors.muted(m.id.slice(2, 16)),
      `${icon} ${m.status === 'completed' ? colors.success(m.status) : m.status === 'failed' ? colors.danger(m.status) : colors.text(m.status)}`,
      colors.text(trunc(m.description, 26)),
      colors.muted(formatTimestamp(m.createdAt)),
    ];
  });

  console.log(table(['ID', 'STATUS', 'MISSION', 'TIMESTAMP'], rows, [14, 14, 26, 19]));
  console.log('');
  console.log(`  ${colors.muted(`${missions.length} operations logged`)}`);
  console.log('');
}
