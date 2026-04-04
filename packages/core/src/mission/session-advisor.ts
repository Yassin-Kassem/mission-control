export type ClaudePlan = 'pro' | 'max5x' | 'max20x' | 'api';

export interface PlanLimits {
  name: string;
  price: string;
  tokensPerWindow: number;    // approximate tokens per 5-hour window
  maxAiDrones: number;        // max AI subagents per mission
  defaultMode: string;        // default execution mode
  preferredModels: { architect: string; coder: string; reviewer: string; debugger: string; docs: string };
  warningThreshold: number;   // warn at this % of budget
}

const PLAN_LIMITS: Record<ClaudePlan, PlanLimits> = {
  pro: {
    name: 'Pro',
    price: '$20/mo',
    tokensPerWindow: 200_000,
    maxAiDrones: 2,
    defaultMode: 'solo',
    preferredModels: { architect: 'haiku', coder: 'sonnet', reviewer: 'haiku', debugger: 'sonnet', docs: 'haiku' },
    warningThreshold: 0.3,
  },
  max5x: {
    name: 'Max 5x',
    price: '$100/mo',
    tokensPerWindow: 1_000_000,
    maxAiDrones: 4,
    defaultMode: 'copilot',
    preferredModels: { architect: 'sonnet', coder: 'sonnet', reviewer: 'haiku', debugger: 'sonnet', docs: 'haiku' },
    warningThreshold: 0.5,
  },
  max20x: {
    name: 'Max 20x',
    price: '$200/mo',
    tokensPerWindow: 4_000_000,
    maxAiDrones: 7,
    defaultMode: 'copilot',
    preferredModels: { architect: 'sonnet', coder: 'sonnet', reviewer: 'haiku', debugger: 'opus', docs: 'haiku' },
    warningThreshold: 0.7,
  },
  api: {
    name: 'API',
    price: 'pay-as-you-go',
    tokensPerWindow: Infinity,
    maxAiDrones: 10,
    defaultMode: 'blitz',
    preferredModels: { architect: 'sonnet', coder: 'sonnet', reviewer: 'sonnet', debugger: 'opus', docs: 'haiku' },
    warningThreshold: 1.0,
  },
};

export interface SessionStep {
  session: number;
  drones: { name: string; type: 'ai' | 'tool'; model?: string }[];
  estimatedTokens: number;
  description: string;
}

export interface SessionAdvice {
  plan: PlanLimits;
  totalEstimatedTokens: number;
  windowBudget: number;
  budgetPercent: number;
  fitsInOneSession: boolean;
  sessions: SessionStep[];
  recommendation: string;
  suggestedMode: string;
  maxAiDrones: number;
  modelOverrides: Record<string, string>;
}

// Token estimates per model for a single subagent invocation
const MODEL_TOKENS: Record<string, number> = {
  opus: 80000,
  sonnet: 40000,
  haiku: 15000,
};

export class SessionAdvisor {
  private planLimits: PlanLimits;

  constructor(private plan: ClaudePlan) {
    this.planLimits = PLAN_LIMITS[plan];
  }

  advise(
    drones: { name: string; type: 'ai' | 'tool' }[],
    scope: string,
  ): SessionAdvice {
    const models = this.assignModels(drones);
    const totalTokens = this.estimateTotal(drones, models);
    const budget = this.planLimits.tokensPerWindow;
    const budgetPercent = budget === Infinity ? 0 : Math.round((totalTokens / budget) * 100);
    const fitsInOne = totalTokens <= budget * 0.8; // leave 20% headroom

    let sessions: SessionStep[];
    let recommendation: string;

    if (fitsInOne) {
      sessions = [this.buildSession(1, drones, models, 'Full mission')];
      recommendation = `Fits in one session (${budgetPercent}% of your ${this.planLimits.name} window).`;
    } else {
      sessions = this.splitIntoSessions(drones, models, scope);
      recommendation = `Mission needs ~${totalTokens.toLocaleString()} tokens but your ${this.planLimits.name} plan window is ~${budget.toLocaleString()}. Splitting into ${sessions.length} sessions for best quality.`;
    }

    // Determine suggested mode
    let suggestedMode = this.planLimits.defaultMode;
    if (scope === 'trivial' || scope === 'small') suggestedMode = 'solo';
    if (budgetPercent > 60 && this.plan !== 'api') suggestedMode = 'solo';

    return {
      plan: this.planLimits,
      totalEstimatedTokens: totalTokens,
      windowBudget: budget,
      budgetPercent,
      fitsInOneSession: fitsInOne,
      sessions,
      recommendation,
      suggestedMode,
      maxAiDrones: this.planLimits.maxAiDrones,
      modelOverrides: models,
    };
  }

  private assignModels(drones: { name: string; type: 'ai' | 'tool' }[]): Record<string, string> {
    const models: Record<string, string> = {};
    for (const d of drones) {
      if (d.type === 'tool') continue;
      const preferred = this.planLimits.preferredModels as Record<string, string>;
      models[d.name] = preferred[d.name] ?? 'sonnet';
    }
    return models;
  }

  private estimateTotal(
    drones: { name: string; type: 'ai' | 'tool' }[],
    models: Record<string, string>,
  ): number {
    let total = 0;
    for (const d of drones) {
      if (d.type === 'tool') continue;
      const model = models[d.name] ?? 'sonnet';
      total += MODEL_TOKENS[model] ?? 40000;
    }
    // Add overhead for parent orchestrator context
    total += 20000;
    return total;
  }

  private buildSession(
    num: number,
    drones: { name: string; type: 'ai' | 'tool' }[],
    models: Record<string, string>,
    description: string,
  ): SessionStep {
    const sessionDrones = drones.map((d) => ({
      name: d.name,
      type: d.type,
      model: d.type === 'ai' ? models[d.name] : undefined,
    }));
    const tokens = this.estimateTotal(drones, models);
    return { session: num, drones: sessionDrones, estimatedTokens: tokens, description };
  }

  private splitIntoSessions(
    drones: { name: string; type: 'ai' | 'tool' }[],
    models: Record<string, string>,
    _scope: string,
  ): SessionStep[] {
    const sessions: SessionStep[] = [];
    const budget = this.planLimits.tokensPerWindow * 0.7; // use 70% per session for safety

    // Phase 1: Scout + Architect (planning phase)
    const phase1Drones = drones.filter((d) =>
      d.name === 'scout' || d.name === 'architect' || d.name === 'security',
    );
    if (phase1Drones.length > 0) {
      sessions.push({
        session: 1,
        drones: phase1Drones.map((d) => ({ name: d.name, type: d.type, model: d.type === 'ai' ? models[d.name] : undefined })),
        estimatedTokens: this.estimateTotal(phase1Drones, models),
        description: 'Planning: scout project, design architecture, security audit',
      });
    }

    // Phase 2: Coder (implementation)
    const phase2Drones = drones.filter((d) => d.name === 'coder');
    if (phase2Drones.length > 0) {
      sessions.push({
        session: sessions.length + 1,
        drones: phase2Drones.map((d) => ({ name: d.name, type: d.type, model: d.type === 'ai' ? models[d.name] : undefined })),
        estimatedTokens: this.estimateTotal(phase2Drones, models),
        description: 'Implementation: follow the plan from session 1',
      });
    }

    // Phase 3: Test + Review + Docs
    const phase3Drones = drones.filter((d) =>
      d.name === 'tester' || d.name === 'reviewer' || d.name === 'docs',
    );
    if (phase3Drones.length > 0) {
      const phase3Tokens = this.estimateTotal(phase3Drones, models);
      // If phase 3 fits with phase 2, merge them
      const phase2Tokens = sessions.length > 1 ? sessions[sessions.length - 1].estimatedTokens : 0;
      if (phase2Tokens + phase3Tokens < budget && sessions.length > 1) {
        // Merge into phase 2
        const lastSession = sessions[sessions.length - 1];
        lastSession.drones.push(...phase3Drones.map((d) => ({
          name: d.name, type: d.type, model: d.type === 'ai' ? models[d.name] : undefined,
        })));
        lastSession.estimatedTokens += phase3Tokens;
        lastSession.description = 'Implementation + testing + review';
      } else {
        sessions.push({
          session: sessions.length + 1,
          drones: phase3Drones.map((d) => ({ name: d.name, type: d.type, model: d.type === 'ai' ? models[d.name] : undefined })),
          estimatedTokens: phase3Tokens,
          description: 'Testing, review, and documentation',
        });
      }
    }

    return sessions;
  }
}

export function getPlanLimits(plan: ClaudePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}
