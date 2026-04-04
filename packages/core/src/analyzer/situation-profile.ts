import type { DroneManifest } from '../drones/drone-manifest.js';

export type Intent = 'fix' | 'build' | 'refactor' | 'explore' | 'debug' | 'deploy';
export type Scope = 'trivial' | 'small' | 'medium' | 'large' | 'epic';

export interface ProjectInfo {
  languages: string[];
  frameworks: string[];
  hasTests: boolean;
  testRunner: string | null;
  hasCI: boolean;
  packageManager: string;
  repoSize: 'small' | 'medium' | 'large';
}

export interface UserPrefs {
  wantsTDD: boolean;
  verbosity: 'minimal' | 'normal' | 'detailed';
  riskTolerance: 'cautious' | 'balanced' | 'yolo';
  pastOverrides: string[];
}

export interface DroneActivation {
  manifest: DroneManifest;
  reason: string;
}

export interface SituationProfile {
  intent: Intent;
  scope: Scope;
  project: ProjectInfo;
  userPrefs: UserPrefs;
  recommendedDrones: DroneActivation[];
  estimatedTokens: number;
  estimatedCost: number;
}
