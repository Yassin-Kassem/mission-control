import fs from 'fs';
import path from 'path';
import { DRONE_ASCII, banner, separator, success, info, kv, sectionStart, sectionEnd, colors } from '../ui/theme.js';

const DEFAULT_CONFIG = `# Mission Control Configuration
# This file is meant to be committed to version control.

# Your Claude plan — affects token budgets, model selection, and session splitting
# Options: pro | max5x | max20x | api
plan: pro

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

const GITIGNORE_ENTRIES = ['.mctl/memory.db', '.mctl/checkpoints/'];

export function initProject(projectDir: string): void {
  const mctlDir = path.join(projectDir, '.mctl');
  const checkpointsDir = path.join(mctlDir, 'checkpoints');
  const configPath = path.join(mctlDir, 'config.yaml');

  fs.mkdirSync(mctlDir, { recursive: true });
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
    const addition = (gitignore === '' ? '' : suffix) + '\n# Mission Control\n' + newEntries.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, gitignore + addition, 'utf-8');
  }
}

export function printInit(projectDir: string): void {
  initProject(projectDir);

  console.log(DRONE_ASCII);
  console.log(banner('S Y S T E M   O N L I N E'));
  console.log('');

  console.log(sectionStart('DEPLOYMENT'));
  console.log(kv('Config', colors.text('.mctl/config.yaml')));
  console.log(kv('Memory', colors.text('.mctl/memory.db')));
  console.log(kv('Drones', colors.bright('8') + colors.text(' deployed')));
  console.log(kv('Plan', colors.text('pro') + colors.muted(' (mission config set-plan to change)')));
  console.log(sectionEnd());

  console.log('');
  console.log(separator());
  console.log('');

  console.log(success('All systems operational. Awaiting orders.'));
  console.log('');
  console.log(info(`${colors.bright('mission run "your task"')} ${colors.muted('— launch a mission')}`));
  console.log(info(`${colors.bright('mission drone create <name>')} ${colors.muted('— build a custom drone')}`));
  console.log(info(`${colors.bright('mission status')} ${colors.muted('— check swarm status')}`));
  console.log('');
}
