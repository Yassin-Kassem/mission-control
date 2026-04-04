import { type Mission, type Signal } from '@missionctl/core';
import { loadProjectContext } from '../context.js';
import { formatTimestamp } from '../format.js';
import { banner, sectionStart, sectionEnd, kv, separator, statusBadge, colors, error as themeError } from '../ui/theme.js';

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

  console.log('');

  if (!mission) {
    console.log(themeError(`Mission "${missionId}" not found in logs.`));
    console.log('');
    return;
  }

  console.log(banner('S I G N A L   R E P L A Y'));
  console.log('');

  console.log(sectionStart('MISSION BRIEF'));
  console.log(kv('Target', colors.text(mission.description)));
  console.log(kv('Status', statusBadge(mission.status)));
  console.log(kv('Deployed', colors.muted(formatTimestamp(mission.createdAt))));
  console.log(kv('Signals', colors.bright(String(signals.length)) + colors.muted(' intercepted')));
  console.log(sectionEnd());

  console.log('');
  console.log(sectionStart('SIGNAL FEED'));

  for (const signal of signals) {
    const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const prefix = signal.severity === 'critical' ? colors.danger('!')
      : signal.severity === 'warning' ? colors.warning('~')
      : colors.dim('·');

    console.log(`  ${colors.secondary('│')} ${prefix} ${colors.muted(time)} ${colors.secondary(signal.source.padEnd(14))} ${colors.text(signal.topic)}`);
  }

  console.log(sectionEnd());
  console.log('');
}
