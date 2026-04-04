// Database
export { createDatabase, type SwarmDatabase } from './db.js';

// Signals
export { type Signal, type SignalType, type SignalSeverity, createSignal, isSignal } from './signals/signal.js';
export { SignalBus } from './signals/signal-bus.js';
export { SignalStore } from './signals/signal-store.js';

// Memory
export { type MemoryEntry, type MemoryLayerName, createMemoryEntry } from './memory/memory-entry.js';
export { MemoryLayer } from './memory/memory-layer.js';
export { MemoryManager } from './memory/memory-manager.js';
export { MemoryPromoter } from './memory/memory-promoter.js';

// Drones
export { type DroneManifest, type DroneTriggers, type DroneOpinions, type DroneSignals, parseDroneManifest, validateManifest } from './drones/drone-manifest.js';
export { DroneRegistry } from './drones/drone-registry.js';
export { DroneRunner, DroneState, type DroneExecutor, type DroneResult } from './drones/drone-runner.js';

// Analyzer
export { type SituationProfile, type Intent, type Scope, type ProjectInfo, type UserPrefs, type DroneActivation } from './analyzer/situation-profile.js';
export { classifyIntent } from './analyzer/intent-classifier.js';
export { detectScope } from './analyzer/scope-detector.js';
export { scanProject } from './analyzer/project-scanner.js';
export { ContextAnalyzer } from './analyzer/context-analyzer.js';

// Mission
export { type Mission, type MissionPhase, type MissionStatus, createMissionId } from './mission/mission.js';
export { MissionStore } from './mission/mission-store.js';
export { MissionPlanner, type MissionPlan, type PlanStep } from './mission/mission-planner.js';
export { MissionRunner, type MissionRunnerConfig, type MissionResult } from './mission/mission-runner.js';

// Executors
export { ScoutExecutor } from './drones/executors/scout-executor.js';
export { TesterExecutor } from './drones/executors/tester-executor.js';
export { SecurityExecutor } from './drones/executors/security-executor.js';

// Token Tracker
export { TokenTracker, type TokenEstimate, type TokenUsage, type DroneTokenEstimate } from './mission/token-tracker.js';
export { MissionRollback } from './mission/rollback.js';

// Recovery
export { type Checkpoint, type CheckpointData } from './recovery/checkpoint.js';
export { CheckpointManager } from './recovery/checkpoint-manager.js';
export { EscalationHandler, type EscalationInput, type EscalationAction } from './recovery/escalation.js';
export { ConsensusBuilder, type DroneArgument, type Conflict } from './recovery/consensus.js';
