#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';

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

program.parse();
