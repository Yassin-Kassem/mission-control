import type { DroneRegistry } from '../drones/drone-registry.js';
import type { MemoryManager } from '../memory/memory-manager.js';
import { classifyIntent } from './intent-classifier.js';
import { detectScope } from './scope-detector.js';
import { scanProject } from './project-scanner.js';
import type { SituationProfile, Scope, DroneActivation, ProjectInfo, UserPrefs } from './situation-profile.js';

const SCOPE_DRONE_MAP: Record<Scope, string[]> = {
  trivial: ['coder'],
  small: ['scout', 'coder', 'tester'],
  medium: ['scout', 'architect', 'coder', 'tester', 'reviewer'],
  large: ['scout', 'architect', 'security', 'coder', 'tester', 'docs', 'reviewer'],
  epic: ['scout', 'architect', 'security', 'coder', 'tester', 'docs', 'reviewer'],
};

export class ContextAnalyzer {
  constructor(private registry: DroneRegistry, private memory: MemoryManager) {}

  analyze(request: string, projectDir: string): SituationProfile {
    const intent = classifyIntent(request);
    const scope = detectScope(request, intent, 0);
    const project = this.scanProjectSafe(projectDir);
    const userPrefs = this.loadUserPrefs();
    const recommendedDrones = this.selectDrones(request, scope, userPrefs);
    const estimatedTokens = this.estimateTokens(scope);
    const estimatedCost = estimatedTokens * 0.000003;
    return { intent, scope, project, userPrefs, recommendedDrones, estimatedTokens, estimatedCost };
  }

  private selectDrones(request: string, scope: Scope, prefs: UserPrefs): DroneActivation[] {
    const enabledDrones = this.registry.listEnabled();
    const scopeDrones = SCOPE_DRONE_MAP[scope];
    const activations: DroneActivation[] = [];

    for (const manifest of enabledDrones) {
      if (prefs.pastOverrides.includes(manifest.name)) continue;
      let reason: string | null = null;
      if (scopeDrones.includes(manifest.name)) {
        reason = `Activated by scope: ${scope}`;
      }
      if (!reason && manifest.triggers.keywords) {
        const keywords = manifest.triggers.keywords as string[];
        const matched = keywords.find((kw) => request.toLowerCase().includes(kw.toLowerCase()));
        if (matched) reason = `Keyword match: "${matched}"`;
      }
      if (reason) activations.push({ manifest, reason });
    }
    return activations.sort((a, b) => b.manifest.priority - a.manifest.priority);
  }

  private loadUserPrefs(): UserPrefs {
    const skipOverrides: string[] = [];
    const overrideEntries = this.memory.long.search('user.override.skip.');
    for (const entry of overrideEntries) {
      if (entry.value === 'true') {
        const droneName = entry.key.replace('user.override.skip.', '');
        skipOverrides.push(droneName);
      }
    }
    return {
      wantsTDD: this.memory.long.get('user.wants-tdd') !== 'false',
      verbosity: (this.memory.long.get('user.verbosity') as UserPrefs['verbosity']) ?? 'normal',
      riskTolerance: (this.memory.long.get('user.risk-tolerance') as UserPrefs['riskTolerance']) ?? 'balanced',
      pastOverrides: skipOverrides,
    };
  }

  private scanProjectSafe(projectDir: string): ProjectInfo {
    try { return scanProject(projectDir); }
    catch {
      return { languages: [], frameworks: [], hasTests: false, testRunner: null, hasCI: false, packageManager: 'unknown', repoSize: 'small' };
    }
  }

  private estimateTokens(scope: Scope): number {
    const estimates: Record<Scope, number> = { trivial: 5_000, small: 20_000, medium: 60_000, large: 150_000, epic: 400_000 };
    return estimates[scope];
  }
}
