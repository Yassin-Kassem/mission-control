#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';
import { runMission } from './commands/run.js';

const program = new Command();

program
  .name('swarm')
  .description('Adaptive Claude Code orchestration framework')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize swarm in the current project')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    initProject(dir);
    console.log('Swarm initialized in', dir);
  });

program
  .command('run')
  .description('Start a new mission')
  .argument('<description>', 'What you want to accomplish')
  .option('--no-dashboard', 'Run without the browser dashboard')
  .option('--drones <names>', 'Comma-separated list of drones to activate')
  .option('--scope <scope>', 'Override scope detection (trivial|small|medium|large|epic)')
  .option('--no-analyze', 'Skip the context analyzer')
  .option('--port <port>', 'Dashboard port', '3000')
  .action(async (description: string, options) => {
    await runMission(description, process.cwd(), {
      noDashboard: !options.dashboard,
      drones: options.drones,
      scope: options.scope,
      noAnalyze: !options.analyze,
      port: parseInt(options.port, 10),
    });
  });

program.parse();
