import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { DroneResult } from '../drone-runner.js';

export class TesterExecutor {
  constructor(private projectDir: string) {}

  getTestCommand(): string | null {
    const pkgPath = path.join(this.projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const testScript = pkg.scripts?.test;
        if (testScript && testScript !== 'echo "Error: no test specified" && exit 1') {
          // Use the package manager to run the script (ensures PATH includes node_modules/.bin)
          const pm = this.detectPackageManager();
          return `${pm} test`;
        }
      } catch { /* ignore */ }
    }
    if (fs.existsSync(path.join(this.projectDir, 'pytest.ini')) || fs.existsSync(path.join(this.projectDir, 'setup.cfg'))) {
      return 'pytest';
    }
    const reqPath = path.join(this.projectDir, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');
      if (/pytest/i.test(content)) return 'pytest';
    }
    return null;
  }

  private detectPackageManager(): string {
    if (fs.existsSync(path.join(this.projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.projectDir, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.projectDir, 'bun.lockb'))) return 'bun';
    return 'npm';
  }

  async execute(): Promise<DroneResult & { command: string | null; exitCode: number; output: string }> {
    const command = this.getTestCommand();
    if (!command) {
      return { summary: 'No test command found', command: null, exitCode: -1, output: '' };
    }
    try {
      const output = execSync(command, {
        cwd: this.projectDir, encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { summary: `Tests passed (${command})`, command, exitCode: 0, output: output.slice(-2000) };
    } catch (err) {
      const execErr = err as { status?: number; stdout?: string; stderr?: string };
      const output = (execErr.stdout ?? '') + (execErr.stderr ?? '');
      return {
        summary: `Tests failed with exit code ${execErr.status ?? 1} (${command})`,
        command, exitCode: execErr.status ?? 1, output: output.slice(-2000),
      };
    }
  }
}
