export interface EscalationInput {
  droneName: string;
  error: string;
  attemptCount: number;
  critical?: boolean;
}

export interface EscalationAction {
  type: 'retry' | 'decompose' | 'skip' | 'escalate-user';
  reason: string;
}

const MAX_RETRIES = 2;

export class EscalationHandler {
  handle(input: EscalationInput): EscalationAction {
    const { attemptCount, critical = true } = input;
    if (attemptCount <= MAX_RETRIES) {
      return { type: 'retry', reason: `Attempt ${attemptCount}/${MAX_RETRIES} — retrying with fresh context` };
    }
    if (!critical) {
      return { type: 'skip', reason: `Non-critical drone "${input.droneName}" failed after ${MAX_RETRIES} retries — skipping` };
    }
    if (attemptCount === MAX_RETRIES + 1) {
      return { type: 'decompose', reason: `Critical drone "${input.droneName}" failed — attempting task decomposition` };
    }
    return { type: 'escalate-user', reason: `Critical drone "${input.droneName}" failed after all recovery attempts — user intervention required` };
  }
}
