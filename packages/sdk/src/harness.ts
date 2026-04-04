import fs from 'fs';
import path from 'path';
import { parseDroneManifest, validateManifest, type DroneManifest, SignalBus, createSignal, type Signal } from '@missionctl/core';

export class DroneTestHarness {
  readonly manifest: DroneManifest;
  readonly directory: string;
  private bus: SignalBus;
  private signals: Signal[] = [];

  constructor(manifest: DroneManifest, directory: string) {
    this.manifest = manifest;
    this.directory = directory;
    this.bus = new SignalBus();
    this.bus.on('*', (signal) => this.signals.push(signal));
  }

  static fromDirectory(dir: string): DroneTestHarness {
    const manifestPath = path.join(dir, 'drone.yaml');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No drone.yaml found in ${dir}`);
    }
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = parseDroneManifest(content);
    return new DroneTestHarness(manifest, dir);
  }

  static fromYaml(yaml: string, dir = '.'): DroneTestHarness {
    const manifest = parseDroneManifest(yaml);
    return new DroneTestHarness(manifest, dir);
  }

  validate(): string[] {
    return validateManifest(this.manifest);
  }

  shouldActivate(request: string): boolean {
    const keywords = this.manifest.triggers.keywords as string[] | undefined;
    if (!keywords || keywords.length === 0) return false;
    return keywords.some((kw) => request.toLowerCase().includes(kw.toLowerCase()));
  }

  emitSignal(topic: string, payload: Record<string, unknown> = {}): void {
    this.bus.emit(createSignal({
      type: 'progress',
      source: this.manifest.name,
      topic,
      severity: 'info',
      payload,
      missionId: 'test-mission',
    }));
  }

  getEmittedSignals(): Signal[] {
    return [...this.signals];
  }

  clearSignals(): void {
    this.signals = [];
  }

  hasSkillFile(): boolean {
    return fs.existsSync(path.join(this.directory, 'skills', 'main.md'));
  }

  getSkillContent(): string | null {
    const skillPath = path.join(this.directory, 'skills', 'main.md');
    if (!fs.existsSync(skillPath)) return null;
    return fs.readFileSync(skillPath, 'utf-8');
  }
}
