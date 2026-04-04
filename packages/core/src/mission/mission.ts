export type MissionPhase = 'analyze' | 'plan' | 'execute' | 'report';
export type MissionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface Mission {
  id: string;
  description: string;
  status: MissionStatus;
  phase: MissionPhase;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  result?: string;
}

export function createMissionId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
