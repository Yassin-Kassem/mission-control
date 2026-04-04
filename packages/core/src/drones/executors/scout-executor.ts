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

  private walkDir(base: string, relative: string, files: string[], dirs: Set<string>, depth: number): void {
    if (depth > 6) return;
    const full = path.join(base, relative);
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch { return; }
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
  '.mctl', '.next', '.turbo', '__pycache__', '.venv',
]);
