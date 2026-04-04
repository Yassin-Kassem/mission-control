import chalk from 'chalk';
import { padRight } from './layout.js';

export interface DroneDisplayState {
  name: string;
  state: string;
}

const STATE_DISPLAY: Record<string, { icon: string; label: string; color: (s: string) => string }> = {
  idle:      { icon: '○', label: 'IDLE',      color: chalk.gray },
  activated: { icon: '◎', label: 'ACTIVATED', color: chalk.cyan },
  running:   { icon: '◉', label: 'RUNNING',   color: chalk.blue },
  waiting:   { icon: '◌', label: 'WAITING',   color: chalk.yellow },
  done:      { icon: '●', label: 'DONE',       color: chalk.green },
  failed:    { icon: '✗', label: 'FAILED',     color: chalk.red },
};

export function renderDronePanel(drones: DroneDisplayState[], width: number): string[] {
  return drones.map((d) => {
    const display = STATE_DISPLAY[d.state] ?? STATE_DISPLAY.idle;
    const raw = `${display.icon} ${padRight(d.name, 12)} ${display.label}`;
    return padRight(raw, width).slice(0, width);
  });
}

export function renderDronePanelColored(drones: DroneDisplayState[], width: number): string[] {
  return drones.map((d) => {
    const display = STATE_DISPLAY[d.state] ?? STATE_DISPLAY.idle;
    const icon = display.color(display.icon);
    const label = display.color(display.label);
    const nameStr = padRight(d.name, 12);
    return `${icon} ${nameStr} ${label}`;
  });
}
