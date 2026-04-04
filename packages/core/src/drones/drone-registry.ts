import type { DroneManifest } from './drone-manifest.js';

export class DroneRegistry {
  private drones = new Map<string, DroneManifest>();
  private disabled = new Set<string>();

  register(manifest: DroneManifest): void {
    if (this.drones.has(manifest.name)) {
      throw new Error(`Drone "${manifest.name}" is already registered`);
    }
    this.drones.set(manifest.name, manifest);
  }

  unregister(name: string): void {
    this.drones.delete(name);
    this.disabled.delete(name);
  }

  get(name: string): DroneManifest | undefined {
    return this.drones.get(name);
  }

  list(): DroneManifest[] {
    return [...this.drones.values()].sort((a, b) => b.priority - a.priority);
  }

  listEnabled(): DroneManifest[] {
    return this.list().filter((d) => !this.disabled.has(d.name));
  }

  enable(name: string): void {
    this.disabled.delete(name);
  }

  disable(name: string): void {
    this.disabled.add(name);
  }

  isEnabled(name: string): boolean {
    return !this.disabled.has(name);
  }
}
