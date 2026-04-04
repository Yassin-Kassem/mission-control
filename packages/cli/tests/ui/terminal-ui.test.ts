import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalUI } from '../../src/ui/terminal-ui.js';
import { SignalBus, createSignal } from '@mctl/core';

describe('TerminalUI', () => {
  let bus: SignalBus;
  let output: string[];

  beforeEach(() => {
    bus = new SignalBus();
    output = [];
  });

  function createUI(droneNames: string[], description = 'test mission') {
    return new TerminalUI({
      bus,
      droneNames,
      missionDescription: description,
      missionId: 'm1',
      write: (text: string) => { output.push(text); },
    });
  }

  it('renders initial state with all drones idle', () => {
    const ui = createUI(['scout', 'coder']);
    ui.render();
    const frame = output.join('');
    expect(frame).toContain('MISSION CONTROL');
    expect(frame).toContain('test mission');
    expect(frame).toContain('scout');
    expect(frame).toContain('coder');
    expect(frame).toContain('IDLE');
  });

  it('updates drone state on signal', () => {
    const ui = createUI(['scout', 'coder']);
    ui.start();

    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.activated',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('ACTIVATED');
  });

  it('adds signals to the feed', () => {
    const ui = createUI(['scout']);
    ui.start();

    bus.emit(createSignal({
      type: 'finding', source: 'scout', topic: 'file.found',
      severity: 'info', payload: { path: 'src/app.ts' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('file.found');
  });

  it('tracks progress as drones complete', () => {
    const ui = createUI(['scout', 'coder']);
    ui.start();

    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.done',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    const frame = output.join('');
    expect(frame).toContain('50%');
  });

  it('stops listening on stop()', () => {
    const ui = createUI(['scout']);
    ui.start();
    ui.stop();

    output = [];
    bus.emit(createSignal({
      type: 'progress', source: 'scout', topic: 'drone.done',
      severity: 'info', payload: { drone: 'scout' }, missionId: 'm1',
    }));

    expect(output).toHaveLength(0);
  });
});
