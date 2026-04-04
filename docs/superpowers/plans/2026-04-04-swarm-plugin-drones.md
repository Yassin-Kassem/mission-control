# Swarm Plugin + Real Drone Executors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Claude Code plugin that makes the swarm framework operational — real drone executors (both AI-powered and tool-based), skill files for Claude Code integration, hooks for automation, and a JSON CLI mode so Claude can consume structured output. Plus a controlled testing strategy that won't burn through Pro plan limits.

**Architecture:** The plugin follows the official Claude Code plugin structure (`.claude-plugin/plugin.json`, `skills/`, `hooks/`, `bin/`). AI drones are skill markdown files that instruct Claude to dispatch subagents. Non-AI drones are Node.js executors invoked via the CLI. The CLI gains a `--json` flag so Claude can call `swarm` commands and parse structured results. The plugin's `bin/` directory adds `swarm` to Claude Code's PATH.

**Tech Stack:** TypeScript, Commander.js, Claude Code Plugin API (skills, hooks, bin/), Vitest

---

## Architecture Overview

```
Claude Code Session
  ├── /swarm:run "build auth" ← user invokes skill
  │     ├── Bash: swarm analyze "build auth" --json
  │     │     → { intent, scope, drones: [...], plan: [...] }
  │     │
  │     ├── Non-AI drones (via Bash):
  │     │     swarm drone exec scout --json
  │     │     → { files: [...], languages: [...], frameworks: [...] }
  │     │
  │     ├── AI drones (via Agent tool):
  │     │     Dispatch subagent with drone skill prompt
  │     │     → Subagent does real work (writes code, reviews, etc.)
  │     │
  │     ├── Bash: swarm signal emit ... (log results)
  │     └── Bash: swarm mission complete ...
  │
  └── Hooks:
        PostToolUse(Edit|Write) → swarm signal emit file.changed
        SessionStart → load swarm context into memory
```

---

## File Structure

```
packages/
├── plugin/                              # Claude Code plugin package
│   ├── .claude-plugin/
│   │   └── plugin.json                  # Plugin manifest
│   ├── skills/
│   │   └── swarm-run/
│   │       ├── SKILL.md                 # Main /swarm:run skill
│   │       ├── drone-scout.md           # Scout drone prompt
│   │       ├── drone-architect.md       # Architect drone prompt
│   │       ├── drone-coder.md           # Coder drone prompt
│   │       ├── drone-tester.md          # Tester drone prompt
│   │       ├── drone-debugger.md        # Debugger drone prompt
│   │       ├── drone-security.md        # Security drone prompt
│   │       ├── drone-reviewer.md        # Reviewer drone prompt
│   │       └── drone-docs.md            # Docs drone prompt
│   ├── hooks/
│   │   └── hooks.json                   # PostToolUse hooks
│   ├── bin/
│   │   └── swarm -> ../../cli/dist/index.js  # Symlink to CLI
│   └── package.json
│
├── cli/src/
│   ├── commands/
│   │   ├── analyze.ts                   # swarm analyze (JSON output for Claude)
│   │   ├── signal-emit.ts              # swarm signal emit (log from hooks)
│   │   ├── mission-complete.ts         # swarm mission complete
│   │   └── drone-exec.ts              # swarm drone exec <name> (non-AI executors)
│   └── index.ts                        # (modify: add new commands)
│
├── core/src/
│   └── drones/
│       └── executors/
│           ├── scout-executor.ts        # File scanner
│           ├── tester-executor.ts       # Test runner
│           └── security-executor.ts     # npm audit / dep check
│
└── core/tests/
    └── drones/
        └── executors/
            ├── scout-executor.test.ts
            ├── tester-executor.test.ts
            └── security-executor.test.ts
```

---

## Task 1: CLI JSON Output Mode (`swarm analyze`)

A new command that outputs structured JSON for Claude to consume. This is the bridge between the plugin skills and the core engine.

**Files:**
- Create: `packages/cli/src/commands/analyze.ts`
- Create: `packages/cli/tests/commands/analyze.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/analyze.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeMission } from '../../src/commands/analyze.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('analyzeMission', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-analyze-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '5.0.0', vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    initProject(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns structured analysis for a build task', () => {
    const result = analyzeMission('build a payment system', tmpDir);
    expect(result.intent).toBe('build');
    expect(result.scope).toBeDefined();
    expect(result.drones).toBeInstanceOf(Array);
    expect(result.drones.length).toBeGreaterThan(0);
    expect(result.plan).toBeInstanceOf(Array);
    expect(result.missionId).toBeDefined();
  });

  it('returns correct drone list for trivial task', () => {
    const result = analyzeMission('fix typo', tmpDir);
    expect(result.intent).toBe('fix');
    expect(result.scope).toBe('trivial');
    expect(result.drones.map((d: { name: string }) => d.name)).toContain('coder');
    expect(result.drones.map((d: { name: string }) => d.name)).not.toContain('architect');
  });

  it('includes parallel groups in plan', () => {
    const result = analyzeMission('build a complete auth system', tmpDir);
    expect(result.plan.length).toBeGreaterThan(0);
    for (const step of result.plan) {
      expect(step.droneName).toBeDefined();
      expect(step.parallelGroup).toBeDefined();
      expect(step.type).toMatch(/^(ai|tool)$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/analyze.test.ts
```

- [ ] **Step 3: Implement analyze command**

```typescript
// packages/cli/src/commands/analyze.ts
import { createMissionId } from '@swarm/core';
import { loadProjectContext } from '../context.js';

const AI_DRONES = new Set(['architect', 'coder', 'reviewer', 'debugger', 'docs']);

export interface AnalysisResult {
  missionId: string;
  intent: string;
  scope: string;
  drones: { name: string; type: 'ai' | 'tool'; priority: number; reason: string }[];
  plan: { droneName: string; parallelGroup: number; type: 'ai' | 'tool'; dependsOn: string[] }[];
  estimatedTokens: number;
  project: {
    languages: string[];
    frameworks: string[];
    hasTests: boolean;
    testRunner: string | null;
  };
}

export function analyzeMission(description: string, projectDir: string): AnalysisResult {
  const ctx = loadProjectContext(projectDir);
  const profile = ctx.analyzer.analyze(description, projectDir);
  const missionId = createMissionId();

  const drones = profile.recommendedDrones.map((d) => ({
    name: d.manifest.name,
    type: (AI_DRONES.has(d.manifest.name) ? 'ai' : 'tool') as 'ai' | 'tool',
    priority: d.manifest.priority,
    reason: d.reason,
  }));

  const missionPlan = ctx.planner.plan(profile.recommendedDrones.map((d) => d.manifest));
  const plan = missionPlan.steps.map((step) => ({
    droneName: step.droneName,
    parallelGroup: step.parallelGroup,
    type: (AI_DRONES.has(step.droneName) ? 'ai' : 'tool') as 'ai' | 'tool',
    dependsOn: step.dependsOn,
  }));

  ctx.close();

  return {
    missionId,
    intent: profile.intent,
    scope: profile.scope,
    drones,
    plan,
    estimatedTokens: profile.estimatedTokens,
    project: {
      languages: profile.project.languages,
      frameworks: profile.project.frameworks,
      hasTests: profile.project.hasTests,
      testRunner: profile.project.testRunner,
    },
  };
}

export function printAnalysis(description: string, projectDir: string): void {
  const result = analyzeMission(description, projectDir);
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts`:

```typescript
import { printAnalysis } from './commands/analyze.js';

program
  .command('analyze')
  .description('Analyze a task and output structured plan (JSON)')
  .argument('<description>', 'Task description')
  .action((description: string) => {
    printAnalysis(description, process.cwd());
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/analyze.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/analyze.ts packages/cli/tests/commands/analyze.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm analyze command with JSON output"
```

---

## Task 2: Scout Executor (File Scanner)

Real scout that scans the project structure — no AI needed.

**Files:**
- Create: `packages/core/src/drones/executors/scout-executor.ts`
- Create: `packages/core/tests/drones/executors/scout-executor.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/executors/scout-executor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScoutExecutor } from '../../../src/drones/executors/scout-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ScoutExecutor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-scout-'));
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { express: '4.0.0' },
      devDependencies: { vitest: '1.0.0' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;\nexport function hello() { return "hi"; }');
    fs.writeFileSync(path.join(tmpDir, 'src', 'utils.ts'), 'export const y = 2;');
    fs.mkdirSync(path.join(tmpDir, 'tests'));
    fs.writeFileSync(path.join(tmpDir, 'tests', 'app.test.ts'), 'test("x", () => {})');
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns file count and list', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.summary).toContain('files');
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
  });

  it('detects source and test files', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    const files = result.files as string[];
    expect(files.some((f: string) => f.includes('app.ts'))).toBe(true);
    expect(files.some((f: string) => f.includes('app.test.ts'))).toBe(true);
  });

  it('detects project languages and frameworks', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.languages).toContain('typescript');
    expect(result.frameworks).toContain('express');
  });

  it('reports directory structure', async () => {
    const scout = new ScoutExecutor(tmpDir);
    const result = await scout.execute();
    expect(result.directories).toBeInstanceOf(Array);
    expect(result.directories).toContain('src');
    expect(result.directories).toContain('tests');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/executors/scout-executor.test.ts
```

- [ ] **Step 3: Implement ScoutExecutor**

```typescript
// packages/core/src/drones/executors/scout-executor.ts
import fs from 'fs';
import path from 'path';
import type { DroneResult } from '../drone-runner.js';
import { scanProject } from '../../analyzer/project-scanner.js';

export class ScoutExecutor {
  constructor(private projectDir: string) {}

  async execute(): Promise<DroneResult & {
    fileCount: number;
    files: string[];
    directories: string[];
    languages: string[];
    frameworks: string[];
    hasTests: boolean;
    testRunner: string | null;
  }> {
    const files: string[] = [];
    const directories = new Set<string>();

    this.walkDir(this.projectDir, '', files, directories, 0);

    const projectInfo = scanProject(this.projectDir);

    return {
      summary: `Scanned ${files.length} files in ${directories.size} directories`,
      fileCount: files.length,
      files,
      directories: [...directories].sort(),
      languages: projectInfo.languages,
      frameworks: projectInfo.frameworks,
      hasTests: projectInfo.hasTests,
      testRunner: projectInfo.testRunner,
    };
  }

  private walkDir(
    base: string,
    relative: string,
    files: string[],
    dirs: Set<string>,
    depth: number,
  ): void {
    if (depth > 6) return;
    const full = path.join(base, relative);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(full, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue;

      const rel = relative ? `${relative}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        dirs.add(rel);
        this.walkDir(base, rel, files, dirs, depth + 1);
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
  }
}

const IGNORED = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.swarm', '.next', '.turbo', '__pycache__', '.venv',
]);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/executors/scout-executor.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:

```typescript
// Executors
export { ScoutExecutor } from './drones/executors/scout-executor.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/drones/executors/ packages/core/tests/drones/executors/ packages/core/src/index.ts
git commit -m "feat(core): add ScoutExecutor — real file scanner drone"
```

---

## Task 3: Tester Executor (Test Runner)

Runs the project's test command and parses results.

**Files:**
- Create: `packages/core/src/drones/executors/tester-executor.ts`
- Create: `packages/core/tests/drones/executors/tester-executor.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/executors/tester-executor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TesterExecutor } from '../../../src/drones/executors/tester-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('TesterExecutor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-tester-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('detects test command from package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest run' },
    }));
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBe('vitest run');
  });

  it('returns not-found when no test command exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBeNull();
  });

  it('detects pytest for Python projects', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'pytest==7.0\n');
    const tester = new TesterExecutor(tmpDir);
    expect(tester.getTestCommand()).toBe('pytest');
  });

  it('execute returns result with passed/failed', async () => {
    // Create a minimal project with a passing test
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'echo "1 passed"' },
    }));
    const tester = new TesterExecutor(tmpDir);
    const result = await tester.execute();
    expect(result.summary).toBeDefined();
    expect(result.command).toBeDefined();
    expect(result.exitCode).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/executors/tester-executor.test.ts
```

- [ ] **Step 3: Implement TesterExecutor**

```typescript
// packages/core/src/drones/executors/tester-executor.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { DroneResult } from '../drone-runner.js';

export class TesterExecutor {
  constructor(private projectDir: string) {}

  getTestCommand(): string | null {
    // Check package.json scripts.test
    const pkgPath = path.join(this.projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const testScript = pkg.scripts?.test;
        if (testScript && testScript !== 'echo "Error: no test specified" && exit 1') {
          return testScript;
        }
      } catch { /* ignore */ }
    }

    // Check for pytest
    if (
      fs.existsSync(path.join(this.projectDir, 'pytest.ini')) ||
      fs.existsSync(path.join(this.projectDir, 'setup.cfg'))
    ) {
      return 'pytest';
    }
    const reqPath = path.join(this.projectDir, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');
      if (/pytest/i.test(content)) return 'pytest';
    }

    return null;
  }

  async execute(): Promise<DroneResult & {
    command: string | null;
    exitCode: number;
    output: string;
  }> {
    const command = this.getTestCommand();

    if (!command) {
      return {
        summary: 'No test command found',
        command: null,
        exitCode: -1,
        output: '',
      };
    }

    try {
      const output = execSync(command, {
        cwd: this.projectDir,
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        summary: `Tests passed (${command})`,
        command,
        exitCode: 0,
        output: output.slice(-2000), // last 2000 chars
      };
    } catch (err) {
      const execErr = err as { status?: number; stdout?: string; stderr?: string };
      const output = (execErr.stdout ?? '') + (execErr.stderr ?? '');

      return {
        summary: `Tests failed with exit code ${execErr.status ?? 1} (${command})`,
        command,
        exitCode: execErr.status ?? 1,
        output: output.slice(-2000),
      };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/executors/tester-executor.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:

```typescript
export { TesterExecutor } from './drones/executors/tester-executor.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/drones/executors/tester-executor.ts packages/core/tests/drones/executors/tester-executor.test.ts packages/core/src/index.ts
git commit -m "feat(core): add TesterExecutor — real test runner drone"
```

---

## Task 4: Security Executor (Dependency Audit)

**Files:**
- Create: `packages/core/src/drones/executors/security-executor.ts`
- Create: `packages/core/tests/drones/executors/security-executor.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/drones/executors/security-executor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityExecutor } from '../../../src/drones/executors/security-executor.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SecurityExecutor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-sec-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('detects audit command for Node projects', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    expect(sec.getAuditCommand()).toBe('npm audit --json');
  });

  it('returns no-audit when no lock file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    expect(sec.getAuditCommand()).toBeNull();
  });

  it('execute returns result with vulnerability info', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const sec = new SecurityExecutor(tmpDir);
    const result = await sec.execute();
    expect(result.summary).toBeDefined();
    expect(result.auditAvailable).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm test -- tests/drones/executors/security-executor.test.ts
```

- [ ] **Step 3: Implement SecurityExecutor**

```typescript
// packages/core/src/drones/executors/security-executor.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { DroneResult } from '../drone-runner.js';

export class SecurityExecutor {
  constructor(private projectDir: string) {}

  getAuditCommand(): string | null {
    if (fs.existsSync(path.join(this.projectDir, 'pnpm-lock.yaml'))) return 'pnpm audit --json';
    if (fs.existsSync(path.join(this.projectDir, 'package-lock.json'))) return 'npm audit --json';
    if (fs.existsSync(path.join(this.projectDir, 'yarn.lock'))) return 'yarn audit --json';
    return null;
  }

  async execute(): Promise<DroneResult & {
    auditAvailable: boolean;
    command: string | null;
    vulnerabilities: number;
    output: string;
  }> {
    const command = this.getAuditCommand();

    if (!command) {
      return {
        summary: 'No lock file found — cannot run security audit',
        auditAvailable: false,
        command: null,
        vulnerabilities: 0,
        output: '',
      };
    }

    try {
      const output = execSync(command, {
        cwd: this.projectDir,
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        summary: 'Security audit passed — no vulnerabilities found',
        auditAvailable: true,
        command,
        vulnerabilities: 0,
        output: output.slice(-2000),
      };
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      const output = (execErr.stdout ?? '') + (execErr.stderr ?? '');

      // npm audit exits non-zero when vulnerabilities are found
      let vulnCount = 0;
      try {
        const parsed = JSON.parse(execErr.stdout ?? '');
        vulnCount = parsed.metadata?.vulnerabilities?.total ?? 0;
      } catch { /* non-JSON output */ }

      return {
        summary: vulnCount > 0
          ? `Security audit found ${vulnCount} vulnerabilities`
          : 'Security audit completed (check output for details)',
        auditAvailable: true,
        command,
        vulnerabilities: vulnCount,
        output: output.slice(-2000),
      };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm test -- tests/drones/executors/security-executor.test.ts
```

- [ ] **Step 5: Export from core**

Add to `packages/core/src/index.ts`:

```typescript
export { SecurityExecutor } from './drones/executors/security-executor.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/drones/executors/security-executor.ts packages/core/tests/drones/executors/security-executor.test.ts packages/core/src/index.ts
git commit -m "feat(core): add SecurityExecutor — dependency audit drone"
```

---

## Task 5: CLI `drone exec` Command

Lets the plugin (or user) run non-AI drones from the command line.

**Files:**
- Create: `packages/cli/src/commands/drone-exec.ts`
- Create: `packages/cli/tests/commands/drone-exec.test.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/commands/drone-exec.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execDrone } from '../../src/commands/drone-exec.js';
import { initProject } from '../../src/commands/init.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('execDrone', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-exec-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '1.0.0' },
    }));
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');
    initProject(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('executes scout drone and returns JSON', async () => {
    const result = await execDrone('scout', tmpDir);
    expect(result.summary).toContain('files');
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('executes tester drone', async () => {
    const result = await execDrone('tester', tmpDir);
    expect(result.summary).toBeDefined();
  });

  it('executes security drone', async () => {
    const result = await execDrone('security', tmpDir);
    expect(result.summary).toBeDefined();
  });

  it('throws for unknown drone', async () => {
    await expect(execDrone('nonexistent', tmpDir)).rejects.toThrow('Unknown tool drone');
  });

  it('throws for AI-only drone', async () => {
    await expect(execDrone('architect', tmpDir)).rejects.toThrow('requires Claude Code');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test -- tests/commands/drone-exec.test.ts
```

- [ ] **Step 3: Implement drone exec**

```typescript
// packages/cli/src/commands/drone-exec.ts
import { ScoutExecutor, TesterExecutor, SecurityExecutor, type DroneResult } from '@swarm/core';

const AI_DRONES = new Set(['architect', 'coder', 'reviewer', 'debugger', 'docs']);
const TOOL_DRONES = new Set(['scout', 'tester', 'security']);

export async function execDrone(name: string, projectDir: string): Promise<DroneResult> {
  if (AI_DRONES.has(name)) {
    throw new Error(`Drone "${name}" requires Claude Code — it cannot run standalone.`);
  }
  if (!TOOL_DRONES.has(name)) {
    throw new Error(`Unknown tool drone "${name}". Available: ${[...TOOL_DRONES].join(', ')}`);
  }

  switch (name) {
    case 'scout':
      return new ScoutExecutor(projectDir).execute();
    case 'tester':
      return new TesterExecutor(projectDir).execute();
    case 'security':
      return new SecurityExecutor(projectDir).execute();
    default:
      throw new Error(`Unknown tool drone "${name}"`);
  }
}

export async function printDroneExec(name: string, projectDir: string): Promise<void> {
  const result = await execDrone(name, projectDir);
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Add to CLI index**

Add to `packages/cli/src/index.ts` inside the `drone` subcommand:

```typescript
import { printDroneExec } from './commands/drone-exec.js';

droneCmd
  .command('exec')
  .description('Execute a tool drone (non-AI)')
  .argument('<name>', 'Drone name (scout|tester|security)')
  .action(async (name: string) => {
    try {
      await printDroneExec(name, process.cwd());
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/cli && pnpm test -- tests/commands/drone-exec.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/drone-exec.ts packages/cli/tests/commands/drone-exec.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add swarm drone exec for standalone tool drones"
```

---

## Task 6: Plugin Manifest & Structure

**Files:**
- Create: `packages/plugin/.claude-plugin/plugin.json`
- Create: `packages/plugin/package.json`

- [ ] **Step 1: Create plugin directory structure**

```bash
mkdir -p packages/plugin/.claude-plugin
mkdir -p packages/plugin/skills/swarm-run
mkdir -p packages/plugin/hooks
mkdir -p packages/plugin/bin
```

- [ ] **Step 2: Create plugin.json manifest**

```json
// packages/plugin/.claude-plugin/plugin.json
{
  "name": "swarm",
  "version": "0.0.1",
  "description": "Adaptive AI orchestration framework — self-organizing drone swarm for Claude Code",
  "author": {
    "name": "Yassin"
  },
  "license": "MIT",
  "keywords": [
    "orchestration",
    "drones",
    "swarm",
    "adaptive",
    "mission-control"
  ],
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

- [ ] **Step 3: Create plugin package.json**

```json
{
  "name": "@swarm/claude-code-plugin",
  "version": "0.0.1",
  "description": "Swarm framework Claude Code plugin",
  "private": true
}
```

- [ ] **Step 4: Add plugin to pnpm workspace**

Edit `pnpm-workspace.yaml` — it should already have `packages: ["packages/*"]` which will pick up the plugin directory.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin/
git commit -m "feat(plugin): scaffold Claude Code plugin structure"
```

---

## Task 7: Main Skill — `/swarm:run`

This is the core skill that orchestrates everything inside Claude Code.

**Files:**
- Create: `packages/plugin/skills/swarm-run/SKILL.md`

- [ ] **Step 1: Write the main skill**

```markdown
---
name: swarm-run
description: Run an adaptive mission with the swarm framework. Use when the user asks to build, fix, debug, refactor, or deploy something and wants orchestrated multi-agent execution.
---

# Swarm Mission Runner

You are orchestrating a mission using the Swarm framework. Follow this process exactly.

## Step 1: Analyze the Task

Run the analyzer to get a structured plan:

```bash
swarm analyze "$ARGUMENTS"
```

This returns JSON with: missionId, intent, scope, drones (with type: "ai" or "tool"), and a parallel execution plan.

Parse the JSON output. You now have:
- **missionId**: Use this for all signal logging
- **drones**: The list of drones to execute
- **plan**: Execution order with parallel groups

## Step 2: Execute Tool Drones

For each drone where `type === "tool"`, run it via CLI:

```bash
swarm drone exec <drone-name>
```

Tool drones run immediately and return JSON results. Available tool drones:
- **scout**: Scans project files, detects languages/frameworks
- **tester**: Runs the project's test suite
- **security**: Runs dependency audit (npm/pnpm/yarn audit)

## Step 3: Execute AI Drones

For each drone where `type === "ai"`, dispatch a subagent using the Agent tool.

Execute drones in parallel group order. Within a group, drones with no dependencies can run in parallel.

### AI Drone Instructions

**architect** — Design the solution architecture before writing code. Read the scout results. Propose file structure, component design, and data flow. Present the design and get user approval before proceeding.

**coder** — Implement the solution. Read architect's design (if present) and scout results. Write clean, tested code. Follow existing patterns. Commit after each logical unit of work.

**debugger** — Investigate the bug systematically. Read scout results for project context. Reproduce the issue, identify root cause, then fix. Don't guess — trace the execution path.

**reviewer** — Review all changes made during this mission. Check for: correctness, edge cases, security issues, code quality, test coverage. Report findings clearly.

**docs** — Check if public APIs and complex logic have adequate documentation. Add docstrings/comments only where the code isn't self-explanatory. Don't over-document.

Each AI drone subagent should:
1. Read the scout results for project context
2. Do its specific work
3. Report what it did

## Step 4: Report

After all drones complete, summarize:
- What was accomplished
- What each drone found/did
- Any issues or warnings
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/skills/
git commit -m "feat(plugin): add /swarm:run skill with full orchestration flow"
```

---

## Task 8: Plugin Hooks

**Files:**
- Create: `packages/plugin/hooks/hooks.json`

- [ ] **Step 1: Create hooks configuration**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[swarm] Plugin loaded. Use /swarm:run to start a mission.'"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/hooks/
git commit -m "feat(plugin): add session start hook"
```

---

## Task 9: Wire Real Executors into `swarm run`

Update the CLI `run` command to use real executors for tool drones instead of placeholders.

**Files:**
- Modify: `packages/cli/src/commands/run.ts`
- Modify: `packages/cli/tests/commands/run.test.ts`

- [ ] **Step 1: Update run.ts**

Replace the `resolveExecutor` in `packages/cli/src/commands/run.ts`:

```typescript
import { createMissionId, MissionRunner, type DroneExecutor, ScoutExecutor, TesterExecutor, SecurityExecutor } from '@swarm/core';
```

Then replace the `resolveExecutor` function:

```typescript
    resolveExecutor: (droneName: string): DroneExecutor => {
      // Real executors for tool drones
      switch (droneName) {
        case 'scout':
          return new ScoutExecutor(projectDir);
        case 'tester':
          return new TesterExecutor(projectDir);
        case 'security':
          return new SecurityExecutor(projectDir);
        default:
          // AI drones still use placeholder when running outside Claude Code
          return {
            async execute() {
              const delay = 300 + Math.random() * 500;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return { summary: `${droneName} requires Claude Code for full execution` };
            },
          };
      }
    },
```

- [ ] **Step 2: Build and run all tests**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build && pnpm test
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/run.ts
git commit -m "feat(cli): wire real tool drone executors into swarm run"
```

---

## Task 10: Build, Test, Tag

- [ ] **Step 1: Build everything**

```bash
cd c:/Users/Yassin/Downloads/claude-orchestrator && pnpm build
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (~160+ tests).

- [ ] **Step 3: Tag**

```bash
git tag v0.3.0-plugin -m "Claude Code plugin + real drone executors"
```

---

## Testing Strategy: Controlled E2E Testing

### Layer 1: Free Tests (no Claude Code needed)

All unit and integration tests run via `pnpm test`. These cover:
- Core engine (92 tests)
- CLI commands (51+ tests)
- Scout/Tester/Security executors
- Analyze command JSON output
- Drone exec command

**Run anytime, zero cost.**

### Layer 2: Manual CLI Testing (no Claude Code needed)

Test the real executors against this project:

```bash
# Scout scans the project
swarm drone exec scout

# Tester runs vitest
swarm drone exec tester

# Security runs pnpm audit
swarm drone exec security

# Full run with real tool drones + placeholder AI drones
swarm run "scan and test this project" --no-ui

# Analyze shows the plan
swarm analyze "build a payment system"
```

**Run anytime, zero cost.**

### Layer 3: Plugin E2E Test (costs Claude Code tokens — do this ONCE)

Install the plugin locally and run one focused mission that exercises all drone types.

**Pre-test checklist:**
1. Build the project: `pnpm build`
2. Start Claude Code with the plugin: `claude --plugin-dir packages/plugin`
3. Navigate to this project directory

**The one E2E test to run:**

```
/swarm:run "add a simple health check endpoint that returns { status: ok, timestamp: Date.now() } — create src/health.ts and a test for it"
```

This single mission exercises:
- **scout** (tool): scans the project
- **architect** (AI): designs the endpoint
- **security** (tool): checks for vulnerabilities
- **coder** (AI): writes the code
- **tester** (tool + AI): runs existing tests + writes new test
- **reviewer** (AI): reviews the changes

**What to verify:**
1. Does `/swarm:run` trigger correctly?
2. Does `swarm analyze` produce valid JSON?
3. Does scout actually scan files (check output)?
4. Do AI drones dispatch as subagents?
5. Does the coder actually write code?
6. Does the tester actually run tests?
7. Are signals logged? (`swarm replay <mission-id>`)
8. Does `swarm status` show the mission?

**After the test:**
```bash
# Verify everything persisted
swarm status
swarm history
swarm replay <the-mission-id>
swarm memory show
```

**Expected token cost:** ~50-100k tokens for one complete mission. Well within a single session.

### What NOT to test in Claude Code:
- Don't run multiple large missions
- Don't test trivial/small scope — those barely use AI
- Don't test edge cases in Claude Code — unit tests handle those
- Don't test failure recovery — mock tests handle that
