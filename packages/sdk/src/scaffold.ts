import fs from 'fs';
import path from 'path';

export function scaffoldDrone(name: string, targetDir: string): string[] {
  const droneDir = path.join(targetDir, name);

  if (fs.existsSync(droneDir)) {
    throw new Error(`Directory "${name}" already exists`);
  }

  fs.mkdirSync(droneDir, { recursive: true });
  fs.mkdirSync(path.join(droneDir, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(droneDir, 'tests'), { recursive: true });

  const files: string[] = [];

  // drone.yaml
  const manifest = `name: ${name}
description: A custom drone for Mission Control

triggers:
  keywords:
    - ${name}

opinions:
  requires: []
  suggests: []
  blocks: []

signals:
  emits:
    - ${name}.done
  listens: []

priority: 50
escalation: user
`;
  fs.writeFileSync(path.join(droneDir, 'drone.yaml'), manifest, 'utf-8');
  files.push('drone.yaml');

  // skills/main.md
  const skill = `# ${name} Drone

## What This Drone Does

Describe what your drone does here.

## When It Activates

This drone activates when the task contains: "${name}"

## Behavior

When activated as an AI drone, follow these steps:

1. Read .mctl/mission/scout.json for project context
2. Do your specific work
3. Write results to .mctl/mission/${name}.md
4. Report: "Done" + one-line summary
`;
  fs.writeFileSync(path.join(droneDir, 'skills', 'main.md'), skill, 'utf-8');
  files.push('skills/main.md');

  // package.json
  const pkg = {
    name: `@missionctl/drone-${name}`,
    version: '0.0.1',
    description: `${name} drone for Mission Control`,
    keywords: ['mission-control', 'drone', name],
    main: 'drone.yaml',
    files: ['drone.yaml', 'skills/', 'tests/'],
  };
  fs.writeFileSync(path.join(droneDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  files.push('package.json');

  // tests/drone.test.ts
  const droneDirForwardSlash = path.join(droneDir).replace(/\\/g, '/');
  const test = `import { describe, it, expect } from 'vitest';
import { DroneTestHarness } from '@missionctl/sdk';

describe('${name} drone', () => {
  it('has a valid manifest', () => {
    const harness = DroneTestHarness.fromDirectory('${droneDirForwardSlash}');
    expect(harness.manifest.name).toBe('${name}');
    expect(harness.manifest.description).toBeTruthy();
  });

  it('activates on keyword "${name}"', () => {
    const harness = DroneTestHarness.fromDirectory('${droneDirForwardSlash}');
    expect(harness.shouldActivate('I need help with ${name}')).toBe(true);
    expect(harness.shouldActivate('fix a random typo')).toBe(false);
  });

  it('emits ${name}.done signal', () => {
    const harness = DroneTestHarness.fromDirectory('${droneDirForwardSlash}');
    expect(harness.manifest.signals.emits).toContain('${name}.done');
  });
});
`;
  fs.writeFileSync(path.join(droneDir, 'tests', 'drone.test.ts'), test, 'utf-8');
  files.push('tests/drone.test.ts');

  // README.md
  const readme = `# ${name} Drone

A custom drone for [Mission Control](https://github.com/your-repo/mission-control).

## Install

\`\`\`bash
mission drone add ./${name}
\`\`\`

## What It Does

Describe your drone's purpose here.

## Configuration

Edit \`drone.yaml\` to customize:
- **triggers**: When this drone activates
- **opinions**: What it requires/suggests/blocks
- **signals**: What it emits and listens to
- **priority**: Execution order (higher = earlier)

## Development

\`\`\`bash
cd ${name}
npx vitest run
\`\`\`
`;
  fs.writeFileSync(path.join(droneDir, 'README.md'), readme, 'utf-8');
  files.push('README.md');

  return files;
}
