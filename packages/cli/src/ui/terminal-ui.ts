import chalk from 'chalk';
import type { SignalBus, Signal } from '@swarm/core';
import { type DroneDisplayState, renderDronePanelColored } from './drone-panel.js';
import { formatDuration } from '../format.js';

export interface TerminalUIOptions {
  bus: SignalBus;
  droneNames: string[];
  missionDescription: string;
  missionId: string;
  width?: number;
  write?: (text: string) => void;
}

export class TerminalUI {
  private droneStates: Map<string, string>;
  private signalFeed: { time: string; source: string; topic: string; severity: string }[] = [];
  private startTime: number;
  private completedCount = 0;
  private totalDrones: number;
  private description: string;
  private missionId: string;
  private width: number;
  private write: (text: string) => void;
  private bus: SignalBus;
  private handler: ((signal: Signal) => void) | null = null;
  private lastLineCount = 0;

  constructor(options: TerminalUIOptions) {
    this.bus = options.bus;
    this.description = options.missionDescription;
    this.missionId = options.missionId;
    this.totalDrones = options.droneNames.length;
    this.width = options.width ?? 60;
    this.write = options.write ?? ((text: string) => process.stdout.write(text));
    this.startTime = Date.now();

    this.droneStates = new Map();
    for (const name of options.droneNames) {
      this.droneStates.set(name, 'idle');
    }
  }

  start(): void {
    this.handler = (signal: Signal) => {
      if (signal.missionId !== this.missionId) return;
      this.processSignal(signal);
      this.render();
    };
    this.bus.on('*', this.handler);
    this.render();
  }

  stop(): void {
    if (this.handler) {
      this.bus.off('*', this.handler);
      this.handler = null;
    }
  }

  render(): void {
    const lines: string[] = [];
    const w = this.width;
    const inner = w - 2;

    const title = ' SWARM ';
    const topPad = Math.max(0, inner - title.length - 1);
    lines.push(`┌${title}${'─'.repeat(topPad)}┐`);

    const desc = this.description.length > inner - 2
      ? this.description.slice(0, inner - 3) + '…'
      : this.description;
    lines.push(this.pad(` ${desc}`));

    const elapsed = formatDuration(Date.now() - this.startTime);
    const pct = this.totalDrones > 0
      ? Math.round((this.completedCount / this.totalDrones) * 100)
      : 0;
    const barPlain = '█'.repeat(Math.round((pct / 100) * 20)) + '░'.repeat(20 - Math.round((pct / 100) * 20));
    const barColored = this.progressBar(pct, 20);
    const progressPlain = ` Progress: ${barPlain} ${pct}%  ${elapsed}`;
    const progressColored = ` Progress: ${barColored} ${pct}%  ${elapsed}`;
    lines.push(this.padColored(progressColored, progressPlain.length));

    lines.push(`├${'─'.repeat(inner)}┤`);

    lines.push(this.pad(chalk.bold(' DRONES')));

    const drones: DroneDisplayState[] = [];
    for (const [name, state] of this.droneStates) {
      drones.push({ name, state });
    }
    const droneLines = renderDronePanelColored(drones, inner - 2);
    for (const { plain, colored } of droneLines) {
      const padding = Math.max(0, inner - plain.length - 1);
      lines.push(`│ ${colored}${' '.repeat(padding)}│`);
    }

    lines.push(`├${'─'.repeat(inner)}┤`);

    lines.push(this.pad(chalk.bold(' SIGNALS')));

    const maxSignals = 6;
    const recentSignals = this.signalFeed.slice(-maxSignals);
    if (recentSignals.length === 0) {
      lines.push(this.pad(chalk.gray('  Waiting for signals...')));
    } else {
      for (const sig of recentSignals) {
        const prefixChar = sig.severity === 'critical' ? '!' : sig.severity === 'warning' ? '~' : ' ';
        const prefixColored = sig.severity === 'critical' ? chalk.red('!') : sig.severity === 'warning' ? chalk.yellow('~') : ' ';
        const plainText = `${prefixChar} ${sig.time} [${sig.source}] ${sig.topic}`;
        const coloredText = `${prefixColored} ${sig.time} ${chalk.gray(`[${sig.source}]`)} ${sig.topic}`;
        const padding = Math.max(0, inner - plainText.length - 1);
        lines.push(`│ ${coloredText}${' '.repeat(padding)}│`);
      }
    }

    lines.push(`└${'─'.repeat(inner)}┘`);

    // If we've rendered before, move cursor up to overwrite previous frame
    if (this.lastLineCount > 0) {
      this.write(`\x1b[${this.lastLineCount}F`);
    }

    this.write(lines.join('\n') + '\n');
    this.lastLineCount = lines.length;
  }

  private processSignal(signal: Signal): void {
    const droneName = signal.payload.drone as string | undefined;

    if (signal.topic === 'drone.activated' && droneName) {
      this.droneStates.set(droneName, 'activated');
    } else if (signal.topic === 'drone.running' && droneName) {
      this.droneStates.set(droneName, 'running');
    } else if (signal.topic === 'drone.done' && droneName) {
      this.droneStates.set(droneName, 'done');
      this.completedCount++;
    } else if (signal.topic === 'drone.failed' && droneName) {
      this.droneStates.set(droneName, 'failed');
      this.completedCount++;
    }

    if (!signal.topic.startsWith('mission.')) {
      const time = new Date(signal.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      this.signalFeed.push({
        time,
        source: signal.source,
        topic: signal.topic,
        severity: signal.severity,
      });
    }
  }

  private progressBar(pct: number, width: number): string {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  private pad(content: string): string {
    const inner = this.width - 2;
    const plainLen = stripAnsi(content).length;
    const padding = Math.max(0, inner - plainLen);
    return `│${content}${' '.repeat(padding)}│`;
  }

  private padColored(colored: string, plainLen: number): string {
    const inner = this.width - 2;
    const padding = Math.max(0, inner - plainLen);
    return `│${colored}${' '.repeat(padding)}│`;
  }
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[\d*(;\d+)*m/g, '');
}
