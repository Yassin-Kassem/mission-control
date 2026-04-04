import chalk from 'chalk';

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'completed': return chalk.green('● completed');
    case 'running': return chalk.blue('● running');
    case 'failed': return chalk.red('● failed');
    case 'paused': return chalk.yellow('● paused');
    case 'pending': return chalk.gray('○ pending');
    default: return chalk.gray(`○ ${status}`);
  }
}

export function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const colWidths: number[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i] ?? 0, row[i].length);
    }
  }
  return rows
    .map((row) => row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join('  '))
    .join('\n');
}
