import type { MemoryManager } from './memory-manager.js';
import type { SignalStore } from '../signals/signal-store.js';
import type { MissionStore } from '../mission/mission-store.js';

export class MissionLearner {
  constructor(
    private memory: MemoryManager,
    private signals: SignalStore,
    private missions: MissionStore,
  ) {}

  learnFromMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const missionSignals = this.signals.getByMission(missionId);

    // Learn project info from scout
    const scoutDone = missionSignals.find(
      (s) => s.topic === 'drone.done' && s.payload.drone === 'scout',
    );
    if (scoutDone) {
      const langs = scoutDone.payload.languages;
      if (Array.isArray(langs) && langs.length > 0) {
        this.memory.working.set('project.languages', langs.join(', '));
      }
      const frameworks = scoutDone.payload.frameworks;
      if (Array.isArray(frameworks) && frameworks.length > 0) {
        this.memory.working.set('project.frameworks', frameworks.join(', '));
      }
    }

    // Record mission outcome pattern
    this.memory.working.set('pattern.last-mission-status', mission.status);
    this.memory.working.set('pattern.last-mission-description', mission.description);

    // Count drones used
    const dronesDone = missionSignals.filter(
      (s) => s.topic === 'drone.done' || s.topic === 'drone.failed',
    );
    this.memory.working.set('pattern.last-drone-count', String(dronesDone.length));

    // Learn from failures — persist to long-term
    const failures = missionSignals.filter((s) => s.topic === 'drone.failed');
    for (const failure of failures) {
      const drone = failure.payload.drone as string;
      const error = failure.payload.error as string;
      this.memory.long.set(
        `correction.${drone}-failed`,
        `${drone} failed: ${error}. Consider adjusting scope or splitting task.`,
      );
    }
  }
}
