import { execSync } from 'child_process';

export class MissionRollback {
  constructor(private projectDir: string) {}

  snapshot(missionId: string): string {
    const tag = `mission-pre-${missionId}`;
    this.git(`tag ${tag}`);
    return tag;
  }

  rollback(missionId: string): void {
    const tag = `mission-pre-${missionId}`;
    try {
      this.git(`rev-parse ${tag}`);
    } catch {
      throw new Error(`No snapshot found for mission "${missionId}"`);
    }
    this.git(`reset --hard ${tag}`);
    this.git(`tag -d ${tag}`);
  }

  listSnapshots(): string[] {
    const output = this.git('tag -l "mission-pre-*"');
    return output.split('\n').filter((t) => t.length > 0);
  }

  private git(command: string): string {
    return execSync(`git ${command}`, {
      cwd: this.projectDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  }
}
