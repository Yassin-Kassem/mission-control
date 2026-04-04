export interface DroneTokenEstimate {
  name: string;
  type: 'ai' | 'tool';
  model?: string;
  tokens: number;
  cost: number;
}

export interface TokenEstimate {
  totalTokens: number;
  estimatedCost: number;
  perDrone: DroneTokenEstimate[];
}

export interface TokenUsage {
  totalTokens: number;
  totalCost: number;
  perDrone: { name: string; tokens: number; cost: number }[];
}

const MODEL_TOKEN_ESTIMATES: Record<string, number> = {
  opus: 80000,
  sonnet: 40000,
  haiku: 15000,
};

const MODEL_COST_PER_MILLION: Record<string, number> = {
  opus: 75,
  sonnet: 18,
  haiku: 4,
};

export class TokenTracker {
  private recorded: { name: string; tokens: number }[] = [];
  private budget: number;

  constructor(budget = 200000) {
    this.budget = budget;
  }

  estimate(drones: { name: string; type: string; model?: string }[]): TokenEstimate {
    const perDrone: DroneTokenEstimate[] = drones.map((d) => {
      if (d.type === 'tool') {
        return { name: d.name, type: 'tool' as const, tokens: 0, cost: 0 };
      }
      const model = d.model ?? 'sonnet';
      const tokens = MODEL_TOKEN_ESTIMATES[model] ?? 40000;
      const cost = (tokens / 1_000_000) * (MODEL_COST_PER_MILLION[model] ?? 18);
      return { name: d.name, type: 'ai' as const, model, tokens, cost };
    });

    return {
      totalTokens: perDrone.reduce((sum, d) => sum + d.tokens, 0),
      estimatedCost: perDrone.reduce((sum, d) => sum + d.cost, 0),
      perDrone,
    };
  }

  recordDrone(name: string, tokens: number): void {
    this.recorded.push({ name, tokens });
  }

  getUsage(): TokenUsage {
    const perDrone = this.recorded.map((r) => ({
      name: r.name,
      tokens: r.tokens,
      cost: (r.tokens / 1_000_000) * 18,
    }));
    return {
      totalTokens: perDrone.reduce((sum, d) => sum + d.tokens, 0),
      totalCost: perDrone.reduce((sum, d) => sum + d.cost, 0),
      perDrone,
    };
  }

  isWarning(): boolean {
    return this.getUsage().totalTokens > this.budget * 0.5;
  }

  isOverBudget(): boolean {
    return this.getUsage().totalTokens > this.budget;
  }

  formatCost(): string {
    const usage = this.getUsage();
    return `~${usage.totalTokens.toLocaleString()} tokens ($${usage.totalCost.toFixed(4)})`;
  }
}
