import chalk from 'chalk';

// ═══════════════════════════════════════════════════════════
// MISSION CONTROL THEME
// Military/space mission control aesthetic
// ═══════════════════════════════════════════════════════════

// Color palette
export const colors = {
  primary: chalk.hex('#00FF9F'),      // Neon green — main accent
  secondary: chalk.hex('#00B8FF'),    // Cyan blue — secondary
  warning: chalk.hex('#FFB800'),      // Amber — warnings
  danger: chalk.hex('#FF3366'),       // Hot pink — errors/failures
  muted: chalk.hex('#5C6370'),        // Gray — dimmed text
  dim: chalk.hex('#3E4451'),          // Dark gray — borders, subtle
  text: chalk.hex('#ABB2BF'),         // Light gray — body text
  bright: chalk.hex('#E5E9F0'),       // Near-white — headings
  success: chalk.hex('#00FF9F'),      // Same as primary
};

// The ASCII drone — displayed on init
export const DRONE_ASCII = `
${colors.primary('    ╔══════════════════════════════════════╗')}
${colors.primary('    ║')}  ${colors.secondary('◉')}                              ${colors.secondary('◉')}  ${colors.primary('║')}
${colors.primary('    ║')}     ${colors.dim('╔══════════════════════╗')}     ${colors.primary('║')}
${colors.primary('    ║')}     ${colors.dim('║')}  ${colors.bright('M I S S I O N')}       ${colors.dim('║')}     ${colors.primary('║')}
${colors.primary('    ║')}     ${colors.dim('║')}  ${colors.bright('C O N T R O L')}       ${colors.dim('║')}     ${colors.primary('║')}
${colors.primary('    ║')}     ${colors.dim('╚══════════════════════╝')}     ${colors.primary('║')}
${colors.primary('    ║')}  ${colors.secondary('◉')}                              ${colors.secondary('◉')}  ${colors.primary('║')}
${colors.primary('    ╠══╗')}                            ${colors.primary('╔══╣')}
${colors.primary('    ║')}${colors.warning('▓▓')}${colors.primary('║')}      ${colors.muted('▪ ▪ ▪ ▪ ▪ ▪')}      ${colors.primary('║')}${colors.warning('▓▓')}${colors.primary('║')}
${colors.primary('    ╠══╝')}                            ${colors.primary('╚══╣')}
${colors.primary('    ╚══════════════════════════════════════╝')}
`;

// Compact logo for headers
export const LOGO_SMALL = `${colors.primary('◈')} ${colors.bright('MISSION CONTROL')}`;

// Section header
export function header(title: string): string {
  const line = colors.dim('─'.repeat(Math.max(0, 50 - title.length - 3)));
  return `${colors.primary('◈')} ${colors.bright(title)} ${line}`;
}

// Subheader
export function subheader(title: string): string {
  return `  ${colors.secondary('▸')} ${colors.text(title)}`;
}

// Key-value pair
export function kv(key: string, value: string, keyWidth = 14): string {
  const paddedKey = key.padEnd(keyWidth);
  return `  ${colors.muted(paddedKey)} ${colors.text(value)}`;
}

// Success message
export function success(msg: string): string {
  return `  ${colors.success('✓')} ${colors.text(msg)}`;
}

// Error message
export function error(msg: string): string {
  return `  ${colors.danger('✗')} ${msg}`;
}

// Warning message
export function warn(msg: string): string {
  return `  ${colors.warning('!')} ${colors.text(msg)}`;
}

// Info message
export function info(msg: string): string {
  return `  ${colors.secondary('▸')} ${colors.text(msg)}`;
}

// Divider line
export function divider(width = 50): string {
  return colors.dim('─'.repeat(width));
}

// Status indicator
export function statusBadge(status: string): string {
  switch (status) {
    case 'completed': return colors.success('● COMPLETED');
    case 'running':   return colors.secondary('◉ RUNNING');
    case 'failed':    return colors.danger('✗ FAILED');
    case 'paused':    return colors.warning('◌ PAUSED');
    case 'pending':   return colors.muted('○ PENDING');
    default:          return colors.muted(`○ ${status.toUpperCase()}`);
  }
}

// Drone state indicator
export function droneState(state: string): string {
  switch (state) {
    case 'done':      return colors.success('● DONE');
    case 'running':   return colors.secondary('◉ RUNNING');
    case 'activated': return chalk.cyan('◎ ACTIVATED');
    case 'failed':    return colors.danger('✗ FAILED');
    case 'waiting':   return colors.warning('◌ WAITING');
    case 'idle':      return colors.muted('○ IDLE');
    default:          return colors.muted(`○ ${state.toUpperCase()}`);
  }
}

// Table with theme
export function table(headers: string[], rows: string[][], colWidths?: number[]): string {
  // Auto-calculate widths if not provided
  const widths = colWidths ?? headers.map((h, i) => {
    const maxData = Math.max(...rows.map((r) => (r[i] ?? '').length), 0);
    return Math.max(h.length, maxData);
  });

  const headerLine = headers.map((h, i) => colors.muted(h.padEnd(widths[i]))).join('  ');
  const separator = widths.map((w) => colors.dim('─'.repeat(w))).join('──');
  const dataLines = rows.map((row) =>
    row.map((cell, i) => colors.text(cell.padEnd(widths[i]))).join('  '),
  );

  return [
    `  ${headerLine}`,
    `  ${separator}`,
    ...dataLines.map((l) => `  ${l}`),
  ].join('\n');
}

// Box with theme (for important content)
export function box(content: string[]): string {
  const maxLen = Math.max(...content.map((l) => stripAnsi(l).length), 0);
  const width = maxLen + 4;
  const top = colors.dim(`  ╭${'─'.repeat(width - 2)}╮`);
  const bot = colors.dim(`  ╰${'─'.repeat(width - 2)}╯`);
  const lines = content.map((l) => {
    const visible = stripAnsi(l).length;
    const pad = Math.max(0, width - visible - 4);
    return `  ${colors.dim('│')} ${l}${' '.repeat(pad)} ${colors.dim('│')}`;
  });
  return [top, ...lines, bot].join('\n');
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[\d*(;\d+)*m/g, '');
}
