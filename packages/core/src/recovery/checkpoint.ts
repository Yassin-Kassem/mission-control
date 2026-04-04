export interface Checkpoint {
  id?: number;
  missionId: string;
  label: string;
  data: CheckpointData;
  createdAt: number;
}

export interface CheckpointData {
  missionState: Record<string, unknown>;
  signalHistory: unknown[];
  memorySnapshot: {
    short: Record<string, string>;
    working: Record<string, string>;
  };
  droneStates: Record<string, string>;
}
