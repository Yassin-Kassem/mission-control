import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addDrone, removeDrone, listInstalledDrones } from '../../src/commands/drone.js';
import { initProject } from '../../src/commands/init.js';
import { scaffoldDrone } from '@mctl/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('drone marketplace', () => {
  let tmpDir: string;
  let droneDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-market-'));
    initProject(tmpDir);

    // Create a drone to install
    droneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-drone-src-'));
    scaffoldDrone('my-lint', droneDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(droneDir, { recursive: true, force: true });
  });

  it('installs a drone from local path', () => {
    const name = addDrone(path.join(droneDir, 'my-lint'), tmpDir);
    expect(name).toBe('my-lint');
    expect(fs.existsSync(path.join(tmpDir, '.mctl', 'drones', 'my-lint', 'drone.yaml'))).toBe(true);
  });

  it('lists installed drones', () => {
    addDrone(path.join(droneDir, 'my-lint'), tmpDir);
    const installed = listInstalledDrones(tmpDir);
    expect(installed).toContain('my-lint');
  });

  it('removes an installed drone', () => {
    addDrone(path.join(droneDir, 'my-lint'), tmpDir);
    removeDrone('my-lint', tmpDir);
    expect(listInstalledDrones(tmpDir)).not.toContain('my-lint');
  });

  it('throws when adding invalid drone (no drone.yaml)', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-empty-'));
    expect(() => addDrone(emptyDir, tmpDir)).toThrow('No drone.yaml');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('throws when adding duplicate drone', () => {
    addDrone(path.join(droneDir, 'my-lint'), tmpDir);
    expect(() => addDrone(path.join(droneDir, 'my-lint'), tmpDir)).toThrow('already installed');
  });

  it('throws when removing non-existent drone', () => {
    expect(() => removeDrone('nonexistent', tmpDir)).toThrow('not installed');
  });
});
