import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = `# Swarm Framework Configuration
# This file is meant to be committed to version control.

drones:
  enabled:
    - scout
    - architect
    - coder
    - tester
    - debugger
    - security
    - reviewer
    - docs

analyzer:
  # Override scope detection: trivial | small | medium | large | epic | auto
  defaultScope: auto

dashboard:
  # Port for the dashboard server
  port: 3000
  # Auto-open browser on mission start
  autoOpen: true
`;

const GITIGNORE_ENTRIES = ['.swarm/memory.db', '.swarm/checkpoints/'];

export function initProject(projectDir: string): void {
  const swarmDir = path.join(projectDir, '.swarm');
  const checkpointsDir = path.join(swarmDir, 'checkpoints');
  const configPath = path.join(swarmDir, 'config.yaml');

  fs.mkdirSync(swarmDir, { recursive: true });
  fs.mkdirSync(checkpointsDir, { recursive: true });

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, DEFAULT_CONFIG, 'utf-8');
  }

  const gitignorePath = path.join(projectDir, '.gitignore');
  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const newEntries: string[] = [];
  for (const entry of GITIGNORE_ENTRIES) {
    if (!gitignore.includes(entry)) newEntries.push(entry);
  }

  if (newEntries.length > 0) {
    const suffix = gitignore.endsWith('\n') || gitignore === '' ? '' : '\n';
    const addition = (gitignore === '' ? '' : suffix) + '\n# Swarm Framework\n' + newEntries.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, gitignore + addition, 'utf-8');
  }
}
