export type SignalType = 'finding' | 'decision' | 'question' | 'warning' | 'progress';
export type SignalSeverity = 'info' | 'warning' | 'critical';

export interface Signal {
  type: SignalType;
  source: string;
  topic: string;
  severity: SignalSeverity;
  payload: Record<string, unknown>;
  timestamp: number;
  missionId: string;
}

export function createSignal(
  partial: Omit<Signal, 'timestamp'> & { timestamp?: number },
): Signal {
  return {
    ...partial,
    timestamp: partial.timestamp ?? Date.now(),
  };
}

export function isSignal(value: unknown): value is Signal {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.missionId === 'string' &&
    typeof obj.timestamp === 'number'
  );
}
