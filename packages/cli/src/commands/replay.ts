import { type Mission, type Signal } from '@mctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { header, kv, colors, statusBadge, error as themeError } from '../ui/theme.js';

export interface ReplayData {
  mission: Mission | undefined;
  signals: Signal[];
}

export function getReplay(projectDir: string, missionId: string): ReplayData {
  const ctx = loadProjectContext(projectDir);
  const mission = ctx.missionStore.get(missionId);
  const signals = ctx.signalStore.getByMission(missionId);
  ctx.close();
  return { mission, signals };
}

export function printReplay(projectDir: string, missionId: string): void {
  const { mission, signals } = getReplay(projectDir, missionId);

  if (!mission) {
    console.log('');
    console.log(themeError(`Mission "${missionId}" not found.`));
    console.log('');
    return;
  }

  console.log('');
  console.log(header('REPLAY'));
  console.log('');
  console.log(kv('Mission', mission.description));
  console.log(kv('Status', statusBadge(mission.status)));
  console.log(kv('Created', formatTimestamp(mission.createdAt)));
  console.log(kv('Signals', String(signals.length)));
  console.log('');

  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const prefix = signal.severity === 'critical' ? colors.danger('!')
      : signal.severity === 'warning' ? colors.warning('~')
      : colors.muted('·');

    console.log(`  ${prefix} ${colors.muted(time)} ${colors.secondary(`[${signal.source}]`)} ${colors.text(signal.topic)}`);
  }
  console.log('');
}
