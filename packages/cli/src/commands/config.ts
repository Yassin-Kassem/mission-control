import fs from 'fs';
import path from 'path';
import { header, colors } from '../ui/theme.js';

export function getConfig(projectDir: string): string {
  const configPath = path.join(projectDir, '.mctl', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('Project not initialized. Run `mission init` first.');
  }
  return fs.readFileSync(configPath, 'utf-8');
}

export function printConfig(projectDir: string): void {
  const config = getConfig(projectDir);

  console.log('');
  console.log(header('CONFIG (.mctl/config.yaml)'));
  console.log('');

  for (const line of config.split('\n')) {
    if (line.startsWith('#')) {
      console.log(`  ${colors.muted(line)}`);
    } else if (line.includes(':') && !line.startsWith(' ')) {
      console.log(`  ${colors.secondary(line)}`);
    } else {
      console.log(`  ${colors.text(line)}`);
    }
  }
  console.log('');
}
