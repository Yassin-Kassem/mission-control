#!/usr/bin/env node
import { Command } from 'commander';
import { type MemoryLayerName } from '@swarm/core';
import { initProject } from './commands/init.js';
import { runMission } from './commands/run.js';
import { printStatus } from './commands/status.js';
import { printHistory } from './commands/history.js';
import { printReplay } from './commands/replay.js';
import { printDroneList, printDroneInfo } from './commands/drone.js';
import { printMemory, promoteMemory, forgetMemory } from './commands/memory.js';
import { printConfig } from './commands/config.js';

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

program
  .command('status')
  .description('Show current swarm status')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printStatus(dir);
  });

program
  .command('history')
  .description('Show past missions')
  .option('-n, --limit <n>', 'Number of missions to show', '20')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string, options) => {
    printHistory(dir, parseInt(options.limit, 10));
  });

program
  .command('replay')
  .description('Replay signal history for a mission')
  .argument('<mission-id>', 'Mission ID to replay')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((missionId: string, dir: string) => {
    printReplay(dir, missionId);
  });

const droneCmd = program
  .command('drone')
  .description('Manage drones');

droneCmd
  .command('list')
  .description('List all registered drones')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printDroneList(dir);
  });

droneCmd
  .command('info')
  .description('Show drone details')
  .argument('<name>', 'Drone name')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((name: string, dir: string) => {
    printDroneInfo(dir, name);
  });

const memoryCmd = program
  .command('memory')
  .description('Manage swarm memory');

memoryCmd
  .command('show')
  .description('Show memory entries')
  .option('--layer <layer>', 'Filter by layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string, options) => {
    printMemory(dir, options.layer as MemoryLayerName | undefined);
  });

memoryCmd
  .command('promote')
  .description('Promote a key from one layer to another')
  .argument('<key>', 'Memory key')
  .argument('<from>', 'Source layer (short|working|long)')
  .argument('<to>', 'Target layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((key: string, from: string, to: string, dir: string) => {
    promoteMemory(dir, key, from as MemoryLayerName, to as MemoryLayerName);
    console.log(`Promoted "${key}" from ${from} to ${to}`);
  });

memoryCmd
  .command('forget')
  .description('Delete a memory entry')
  .argument('<key>', 'Memory key')
  .argument('<layer>', 'Layer (short|working|long)')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((key: string, layer: string, dir: string) => {
    forgetMemory(dir, key, layer as MemoryLayerName);
    console.log(`Forgot "${key}" from ${layer}`);
  });

const configCmd = program
  .command('config')
  .description('Manage swarm configuration');

configCmd
  .command('show')
  .description('Show current configuration')
  .argument('[dir]', 'Project directory', process.cwd())
  .action((dir: string) => {
    printConfig(dir);
  });

program.parse();
