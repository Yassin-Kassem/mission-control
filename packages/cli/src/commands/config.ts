import fs from 'fs';
import path from 'path';

export function getConfig(projectDir: string): string {
  const configPath = path.join(projectDir, '.swarm', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error('Project not initialized. Run `swarm init` first.');
  }
  return fs.readFileSync(configPath, 'utf-8');
}

export function printConfig(projectDir: string): void {
  const config = getConfig(projectDir);
  console.log('Swarm Config (.swarm/config.yaml)\n');
  console.log(config);
}
