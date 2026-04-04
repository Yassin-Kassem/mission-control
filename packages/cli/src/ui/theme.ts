import chalk from 'chalk';

// ═══════════════════════════════════════════════════════════
// MISSION CONTROL — TACTICAL HUD THEME
// ═══════════════════════════════════════════════════════════

export const colors = {
  primary: chalk.hex('#00FF9F'),      // Neon green — HUD primary
  secondary: chalk.hex('#00B8FF'),    // Tactical cyan
  warning: chalk.hex('#FFB800'),      // Amber alert
  danger: chalk.hex('#FF3366'),       // Red alert
  muted: chalk.hex('#5C6370'),        // Comm static
  dim: chalk.hex('#3E4451'),          // Background noise
  text: chalk.hex('#ABB2BF'),         // Standard readout
  bright: chalk.hex('#E5E9F0'),       // High intensity
  success: chalk.hex('#00FF9F'),      // Mission success
};

// ── INIT BANNER ──────────────────────────────────────────

export const DRONE_ASCII = `
${colors.primary('  ███╗   ███╗ ██╗ ███████╗ ███████╗ ██╗  ██████╗  ███╗   ██╗')}
${colors.primary('  ████╗ ████║ ██║ ██╔════╝ ██╔════╝ ██║ ██╔═══██╗ ████╗  ██║')}
${colors.primary('  ██╔████╔██║ ██║ ███████╗ ███████╗ ██║ ██║   ██║ ██╔██╗ ██║')}
${colors.primary('  ██║╚██╔╝██║ ██║ ╚════██║ ╚════██║ ██║ ██║   ██║ ██║╚██╗██║')}
${colors.primary('  ██║ ╚═╝ ██║ ██║ ███████║ ███████║ ██║ ╚██████╔╝ ██║ ╚████║')}
${colors.primary('  ╚═╝     ╚═╝ ╚═╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═════╝  ╚═╝  ╚═══╝')}

${colors.secondary('   ██████╗  ██████╗  ███╗   ██╗ ████████╗ ██████╗   ██████╗  ██╗')}
${colors.secondary('  ██╔════╝ ██╔═══██╗ ████╗  ██║ ╚══██╔══╝ ██╔══██╗ ██╔═══██╗ ██║')}
${colors.secondary('  ██║      ██║   ██║ ██╔██╗ ██║    ██║    ██████╔╝ ██║   ██║ ██║')}
${colors.secondary('  ██║      ██║   ██║ ██║╚██╗██║    ██║    ██╔══██╗ ██║   ██║ ██║')}
${colors.secondary('  ╚██████╗ ╚██████╔╝ ██║ ╚████║    ██║    ██║  ██║ ╚██████╔╝ ███████╗')}
${colors.secondary('   ╚═════╝  ╚═════╝  ╚═╝  ╚═══╝   ╚═╝    ╚═╝  ╚═╝  ╚═════╝  ╚══════╝')}

${colors.primary('                    ****+=      +####')}
${colors.primary('                ##***#             ######')}
${colors.primary('             ##**#                     ######')}
${colors.primary('        ***#%@                             %%%%##')}
${colors.primary('    #**##@%%%#                             ##%@@%#####')}
${colors.secondary('  ******## ###++                             ==*%%  #######')}
${colors.secondary(' ****##      **+====     =#==---==#=     ====*#%      ####%%')}
${colors.secondary('+*##              **++===-=%+--=====*%===++*#%%           ##*+')}
${colors.secondary('                      **##+==---====++#%%%%')}
${colors.secondary('                        =====----====--=*')}
${colors.muted(' +**                        =-===-----==---=+*                      %#+')}
${colors.muted('  #****                    +#*===*#****===+*%#                   %#%#%%')}
${colors.muted('   #*****                   #%#%%@@@@@@@%%*%%%                  ####%')}
${colors.muted('    %#****              ===+++#%%%%%%%%@%%%###*++              ####%')}
${colors.muted('      %#*#          ===+**#++#%@@##%%%%%@@%%#%%#*+===         ##%')}
${colors.muted('       %#**+   ====**##%%  *###@%#%%#%@%@@%%%%  ##*++====  *##%%')}
${colors.muted('       +#%%#*++**#%%        %%%@@%%%%%#%@@%%        ##*++=+*#%@@#')}
${colors.dim('       +*%@%###               # %%%%%%%%% #%             ###%%@@%*')}
${colors.dim('      =+*##%%###*                 %%%%@                  #%%%%%#**#')}
${colors.dim('       +#% %%%%##*                                       #%%%%%  ##')}
${colors.dim('       =*#   %%%####                                    #%%%%%  *##')}
${colors.dim('                %%#+                                   *%%%')}
`;

// ── LAYOUT COMPONENTS ────────────────────────────────────

export function banner(title: string): string {
  const w = 56;
  const pad = Math.max(0, w - title.length - 4);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return [
    colors.dim('  ╔' + '═'.repeat(w) + '╗'),
    colors.dim('  ║') + ' '.repeat(left + 1) + colors.bright(title) + ' '.repeat(right + 1) + colors.dim('║'),
    colors.dim('  ╚' + '═'.repeat(w) + '╝'),
  ].join('\n');
}

export function header(title: string): string {
  return `  ${colors.primary('▎')} ${colors.bright(title)}`;
}

export function separator(width = 54): string {
  return `  ${colors.dim('─'.repeat(width))}`;
}

export function sectionStart(title: string, width = 54): string {
  const line = colors.dim('─'.repeat(Math.max(0, width - title.length - 3)));
  return `  ${colors.secondary('┌')} ${colors.secondary(title)} ${line}`;
}

export function sectionEnd(width = 54): string {
  return `  ${colors.secondary('└' + '─'.repeat(width - 1))}`;
}

export function kv(key: string, value: string, keyWidth = 16): string {
  const paddedKey = key.padEnd(keyWidth);
  return `  ${colors.secondary('│')} ${colors.muted(paddedKey)} ${value}`;
}

export function kvPlain(key: string, value: string, keyWidth = 16): string {
  const paddedKey = key.padEnd(keyWidth);
  return `  ${colors.muted(paddedKey)} ${colors.text(value)}`;
}

export function success(msg: string): string {
  return `  ${colors.success('■')} ${colors.text(msg)}`;
}

export function error(msg: string): string {
  return `  ${colors.danger('■')} ${msg}`;
}

export function warn(msg: string): string {
  return `  ${colors.warning('■')} ${colors.text(msg)}`;
}

export function info(msg: string): string {
  return `  ${colors.secondary('▸')} ${colors.text(msg)}`;
}

export function bullet(msg: string): string {
  return `  ${colors.dim('·')} ${colors.text(msg)}`;
}

// ── STATUS INDICATORS ────────────────────────────────────

export function statusBadge(status: string): string {
  switch (status) {
    case 'completed': return `${colors.success('■')} ${colors.success('COMPLETE')}`;
    case 'running':   return `${colors.secondary('▶')} ${colors.secondary('ACTIVE')}`;
    case 'failed':    return `${colors.danger('■')} ${colors.danger('FAILED')}`;
    case 'paused':    return `${colors.warning('❚❚')} ${colors.warning('PAUSED')}`;
    case 'pending':   return `${colors.muted('○')} ${colors.muted('PENDING')}`;
    default:          return `${colors.muted('○')} ${colors.muted(status.toUpperCase())}`;
  }
}

export function droneState(state: string): string {
  switch (state) {
    case 'done':      return colors.success('● DONE');
    case 'running':   return colors.secondary('◉ ACTIVE');
    case 'activated': return chalk.cyan('◎ STANDBY');
    case 'failed':    return colors.danger('✗ FAILED');
    case 'waiting':   return colors.warning('◌ HOLD');
    case 'idle':      return colors.muted('○ IDLE');
    default:          return colors.muted(`○ ${state.toUpperCase()}`);
  }
}

// ── TABLE ────────────────────────────────────────────────

export function table(headers: string[], rows: string[][], colWidths?: number[]): string {
  const widths = colWidths ?? headers.map((h, i) => {
    const maxData = Math.max(...rows.map((r) => stripAnsi(r[i] ?? '').length), 0);
    return Math.max(h.length, maxData);
  });

  const headerLine = headers.map((h, i) => colors.muted(h.toUpperCase().padEnd(widths[i]))).join('  ');
  const sep = widths.map((w) => colors.dim('─'.repeat(w))).join('──');
  const dataLines = rows.map((row) =>
    row.map((cell, i) => {
      const plain = stripAnsi(cell);
      const pad = Math.max(0, widths[i] - plain.length);
      return cell + ' '.repeat(pad);
    }).join('  '),
  );

  return [
    `  ${headerLine}`,
    `  ${sep}`,
    ...dataLines.map((l) => `  ${l}`),
  ].join('\n');
}

// ── TACTICAL READOUT (for status/info) ───────────────────

export function readout(label: string, value: string): string {
  return `  ${colors.dim('[')} ${colors.muted(label.padEnd(12))} ${colors.dim(']')} ${colors.text(value)}`;
}

// ── HELPERS ──────────────────────────────────────────────

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[\d*(;\d+)*m/g, '');
}

export function trunc(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

export const LOGO_SMALL = `${colors.primary('◈')} ${colors.bright('MISSION CONTROL')}`;
