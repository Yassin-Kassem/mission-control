export function renderBox(title: string, contentLines: string[], width: number): string {
  const innerWidth = width - 2;
  const top = title
    ? `┌ ${title} ${'─'.repeat(Math.max(0, innerWidth - title.length - 3))}┐`
    : `┌${'─'.repeat(innerWidth)}┐`;

  const body = contentLines.map(
    (line) => `│${padLine(line, innerWidth)}│`,
  );

  const bottom = `└${'─'.repeat(innerWidth)}┘`;

  return [top, ...body, bottom].join('\n');
}

export function renderDivider(width: number): string {
  const innerWidth = width - 2;
  return `├${'─'.repeat(innerWidth)}┤`;
}

/**
 * Pad a string (which may contain ANSI codes) to exact visible width.
 * Truncates with ellipsis if too long.
 */
export function padLine(str: string, width: number): string {
  const visible = visibleLength(str);
  if (visible > width) {
    return truncateAnsi(str, width);
  }
  return str + ' '.repeat(width - visible);
}

/**
 * Pad a plain-text string (no ANSI codes) to exact width.
 * Use this for building strings BEFORE applying chalk colors.
 */
export function padRight(str: string, width: number): string {
  if (str.length > width) {
    return str.slice(0, width - 1) + '…';
  }
  return str + ' '.repeat(width - str.length);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Get the visible length of a string, ignoring ANSI escape codes.
 */
export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[\d*(;\d+)*m/g, '');
}

/**
 * Truncate a string that may contain ANSI codes to a visible width.
 */
function truncateAnsi(str: string, maxVisible: number): string {
  let visible = 0;
  let i = 0;
  while (i < str.length && visible < maxVisible - 1) {
    // Skip ANSI escape sequences
    if (str[i] === '\x1b' && str[i + 1] === '[') {
      const end = str.indexOf('m', i);
      if (end !== -1) {
        i = end + 1;
        continue;
      }
    }
    visible++;
    i++;
  }
  // Grab any trailing ANSI reset codes
  let tail = '';
  let j = i;
  while (j < str.length && str[j] === '\x1b') {
    const end = str.indexOf('m', j);
    if (end !== -1) {
      tail += str.slice(j, end + 1);
      j = end + 1;
    } else break;
  }
  return str.slice(0, i) + '…' + tail;
}
