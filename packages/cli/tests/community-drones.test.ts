import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadProjectContext } from '../src/context.js';
import { addDrone } from '../src/commands/drone.js';
import { initProject } from '../src/commands/init.js';
import { scaffoldDrone } from '@missionctl/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('community drone loading', () => {
  let tmpDir: string;
  let droneDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-community-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    initProject(tmpDir);

    droneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mctl-drone-'));
    scaffoldDrone('my-lint', droneDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(droneDir, { recursive: true, force: true });
  });

  it('loads community drones alongside builtins', () => {
    addDrone(path.join(droneDir, 'my-lint'), tmpDir);

    const ctx = loadProjectContext(tmpDir);
    const allDrones = ctx.registry.list();
    const names = allDrones.map((d) => d.name);

    // Has builtins
    expect(names).toContain('scout');
    expect(names).toContain('coder');

    // Has community drone
    expect(names).toContain('my-lint');

    ctx.close();
  });
});
