import { describe, it, expect } from 'vitest';
import { ConsensusBuilder } from '../../src/recovery/consensus.js';

describe('ConsensusBuilder', () => {
  it('builds a conflict with arguments from multiple drones', () => {
    const builder = new ConsensusBuilder('refactor-vs-ship');
    builder.addArgument({ droneName: 'architect', position: 'Refactor auth module first', reasoning: 'Current structure cannot support new feature safely', severity: 'critical' });
    builder.addArgument({ droneName: 'coder', position: 'Inline fix is faster', reasoning: 'Refactor is out of scope for this mission', severity: 'info' });
    const conflict = builder.build();
    expect(conflict.id).toBe('refactor-vs-ship');
    expect(conflict.arguments).toHaveLength(2);
    expect(conflict.recommendation.droneName).toBe('architect');
    expect(conflict.recommendation.reasoning).toContain('higher severity');
  });

  it('recommends the argument with higher severity', () => {
    const builder = new ConsensusBuilder('test-conflict');
    builder.addArgument({ droneName: 'tester', position: 'Need tests', reasoning: 'No coverage', severity: 'warning' });
    builder.addArgument({ droneName: 'coder', position: 'Skip tests', reasoning: 'Trivial change', severity: 'info' });
    const conflict = builder.build();
    expect(conflict.recommendation.droneName).toBe('tester');
  });
});
