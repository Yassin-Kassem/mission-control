export interface DroneArgument {
  droneName: string;
  position: string;
  reasoning: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface Conflict {
  id: string;
  arguments: DroneArgument[];
  recommendation: {
    droneName: string;
    position: string;
    reasoning: string;
  };
}

const SEVERITY_WEIGHT: Record<string, number> = { critical: 3, warning: 2, info: 1 };

export class ConsensusBuilder {
  private arguments: DroneArgument[] = [];
  constructor(private conflictId: string) {}

  addArgument(arg: DroneArgument): void {
    this.arguments.push(arg);
  }

  build(): Conflict {
    const sorted = [...this.arguments].sort((a, b) => (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0));
    const winner = sorted[0];
    return {
      id: this.conflictId,
      arguments: this.arguments,
      recommendation: {
        droneName: winner.droneName,
        position: winner.position,
        reasoning: `Recommended: "${winner.droneName}" has higher severity (${winner.severity})`,
      },
    };
  }
}
