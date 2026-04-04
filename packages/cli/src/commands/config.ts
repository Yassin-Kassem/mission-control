import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function getConfig(projectDir: string): string {
  const configPath = path.join(projectDir, '.swarm', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('Project not initialized. Run `swarm init` first.');
  }
  return fs.readFileSync(configPath, 'utf-8');
}

export function printConfig(projectDir: string): void {
  const config = getConfig(projectDir);
  // Size box to fit content
  let maxLine = 30;
  for (const raw of config.split('\n')) {
    maxLine = Math.max(maxLine, raw.length + 2); // +2 for leading space
  }
  const w = Math.min(maxLine + 4, 80); // +4 for borders + margin
  const inner = w - 2;

  const ln = (s: string) => `│${pad(s, inner)}│`;

  const lines: string[] = [];
  lines.push(`┌ CONFIG ${'─'.repeat(inner - 8)}┐`);

  for (const raw of config.split('\n')) {
    if (raw.startsWith('#')) {
      lines.push(ln(chalk.gray(` ${raw}`)));
    } else {
      lines.push(ln(` ${raw}`));
    }
  }

  lines.push(`└${'─'.repeat(inner)}┘`);
  console.log(lines.join('\n'));
}

function pad(str: string, width: number): string {
  const plain = str.replace(/\x1b\[\d*(;\d+)*m/g, '');
  const padding = Math.max(0, width - plain.length);
  return str + ' '.repeat(padding);
}
