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

  async execute(): Promise<DroneResult & { auditAvailable: boolean; command: string | null; vulnerabilities: number; output: string }> {
    const command = this.getAuditCommand();
    if (!command) {
      return { summary: 'No lock file found — cannot run security audit', auditAvailable: false, command: null, vulnerabilities: 0, output: '' };
    }
    try {
      const output = execSync(command, {
        cwd: this.projectDir, encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { summary: 'Security audit passed — no vulnerabilities found', auditAvailable: true, command, vulnerabilities: 0, output: output.slice(-2000) };
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      const output = (execErr.stdout ?? '') + (execErr.stderr ?? '');
      let vulnCount = 0;
      try {
        const parsed = JSON.parse(execErr.stdout ?? '');
        vulnCount = parsed.metadata?.vulnerabilities?.total ?? 0;
      } catch { /* non-JSON */ }
      return {
        summary: vulnCount > 0 ? `Security audit found ${vulnCount} vulnerabilities` : 'Security audit completed (check output for details)',
        auditAvailable: true, command, vulnerabilities: vulnCount, output: output.slice(-2000),
      };
    }
  }
}
