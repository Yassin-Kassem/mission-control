import type { DroneManifest } from './drone-manifest.js';
import type { SignalBus } from '../signals/signal-bus.js';
import { createSignal } from '../signals/signal.js';

export enum DroneState {
  IDLE = 'idle',
  ACTIVATED = 'activated',
  RUNNING = 'running',
  WAITING = 'waiting',
  DONE = 'done',
  FAILED = 'failed',
}

export interface DroneResult {
  summary: string;
  [key: string]: unknown;
}

export interface DroneExecutor {
  execute(): Promise<DroneResult>;
}

export class DroneRunner {
  state: DroneState = DroneState.IDLE;
  error?: string;
  private result?: DroneResult;

  constructor(
    readonly manifest: DroneManifest,
    private executor: DroneExecutor,
    private bus: SignalBus,
    private missionId: string,
  ) {}

  activate(): void {
    this.state = DroneState.ACTIVATED;
    this.emitSignal('drone.activated', 'info', { drone: this.manifest.name });
  }

  async run(): Promise<DroneResult | undefined> {
    this.state = DroneState.RUNNING;
    this.emitSignal('drone.running', 'info', { drone: this.manifest.name });

    try {
      this.result = await this.executor.execute();
      this.state = DroneState.DONE;
      this.emitSignal('drone.done', 'info', {
        drone: this.manifest.name,
        summary: this.result.summary,
      });
      return this.result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state = DroneState.FAILED;
      this.error = message;
      this.emitSignal('drone.failed', 'critical', {
        drone: this.manifest.name,
        error: message,
      });
      return undefined;
    }
  }

  private emitSignal(
    topic: string,
    severity: 'info' | 'warning' | 'critical',
    payload: Record<string, unknown>,
  ): void {
    this.bus.emit(
      createSignal({
        type: 'progress',
        source: this.manifest.name,
        topic,
        severity,
        payload,
        missionId: this.missionId,
      }),
    );
  }
}
