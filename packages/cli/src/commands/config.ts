import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { renderBox } from '../ui/layout.js';

export function getConfig(projectDir: string): string {
  const configPath = path.join(projectDir, '.swarm', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('Project not initialized. Run `swarm init` first.');
  }
  return fs.readFileSync(configPath, 'utf-8');
}

export function printConfig(projectDir: string): void {
  const config = getConfig(projectDir);
  const configLines = config.split('\n').map((line) => {
    if (line.startsWith('#')) return chalk.gray(` ${line}`);
    return ` ${line}`;
  });

  console.log(renderBox('CONFIG (.swarm/config.yaml)', configLines, 60));
}
