import { describe, it, expect } from 'vitest';
import { renderDronePanel, type DroneDisplayState } from '../../src/ui/drone-panel.js';

describe('renderDronePanel', () => {
  it('renders drones with state indicators', () => {
    const drones: DroneDisplayState[] = [
      { name: 'scout', state: 'done' },
      { name: 'architect', state: 'running' },
      { name: 'coder', state: 'idle' },
    ];
    const lines = renderDronePanel(drones, 25);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('scout');
    expect(lines[0]).toContain('DONE');
    expect(lines[1]).toContain('architect');
    expect(lines[1]).toContain('RUNNING');
    expect(lines[2]).toContain('coder');
    expect(lines[2]).toContain('IDLE');
  });

  it('uses different indicators per state', () => {
    const drones: DroneDisplayState[] = [
      { name: 'a', state: 'done' },
      { name: 'b', state: 'running' },
      { name: 'c', state: 'failed' },
      { name: 'd', state: 'idle' },
      { name: 'e', state: 'activated' },
    ];
    const lines = renderDronePanel(drones, 25);
    expect(lines[0]).toContain('●');
    expect(lines[1]).toContain('◉');
    expect(lines[2]).toContain('✗');
    expect(lines[3]).toContain('○');
    expect(lines[4]).toContain('◎');
  });

  it('pads lines to given width', () => {
    const drones: DroneDisplayState[] = [
      { name: 'scout', state: 'done' },
    ];
    const lines = renderDronePanel(drones, 30);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(30);
    }
  });
});
