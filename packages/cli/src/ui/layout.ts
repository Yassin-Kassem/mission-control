export function renderBox(title: string, contentLines: string[], width: number): string {
  const innerWidth = width - 2;
  const top = title
    ? `┌ ${title} ${'─'.repeat(Math.max(0, innerWidth - title.length - 3))}┐`
    : `┌${'─'.repeat(innerWidth)}┐`;
  const topLine = padRight(top, width).slice(0, width);
  const body = contentLines.map(
    (line) => `│${padRight(line, innerWidth)}│`,
  );
  const bottom = `└${'─'.repeat(innerWidth)}┘`;
  return [topLine, ...body, bottom].join('\n');
}

export function renderDivider(width: number): string {
  const innerWidth = width - 2;
  return `├${'─'.repeat(innerWidth)}┤`;
}

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
