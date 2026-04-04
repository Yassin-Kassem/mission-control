import type { Intent } from './situation-profile.js';

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
  weight: number;  // higher = stronger signal
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'fix',
    weight: 3,
    patterns: [
      /\bfix\b/i, /\bbug\b/i, /\berror\b/i, /\bpatch\b/i, /\bbroken\b/i,
      /\bissue\b/i, /\bcorrect\b/i, /\brepair\b/i, /\bhotfix\b/i,
      /\bregress/i, /\bfailing\b/i, /\bcrash/i, /\bnot working\b/i,
      /\bwon'?t\s+\w+/i, /\bdoesn'?t\s+work/i, /\bcan'?t\s+\w+/i,
    ],
  },
  {
    intent: 'debug',
    weight: 4,
    patterns: [
      /\bdebug\b/i, /\binvestigat/i, /\bwhy is\b/i, /\bwhy are\b/i,
      /\bwhy does\b/i, /\bwhy doesn'?t\b/i, /\broot cause\b/i,
      /\bmemory leak\b/i, /\bprofile\b/i, /\btrace\b/i, /\bbottleneck\b/i,
      /\bperformance\b/i, /\bslow\b/i, /\bhang/i, /\bfreez/i,
    ],
  },
  {
    intent: 'refactor',
    weight: 3,
    patterns: [
      /\brefactor\b/i, /\bclean\s*up\b/i, /\brestructur/i, /\breorganiz/i,
      /\bsimplif/i, /\bextract\b/i, /\bmodulariz/i, /\bdecompos/i,
      /\bsplit\b.*\b(file|class|function|module)\b/i,
      /\bconsolid/i, /\bdry\b/i, /\breduce\s+(complex|duplicat)/i,
      /\brename\b/i, /\bmove\b.*\bto\b/i,
    ],
  },
  {
    intent: 'explore',
    weight: 2,
    patterns: [
      /\bhow does\b/i, /\bexplain\b/i, /\bwhat does\b/i, /\bwhat is\b/i,
      /\bshow me\b/i, /\bdescribe\b/i, /\bunderstand\b/i, /\bwalk\s*through\b/i,
      /\bwhere is\b/i, /\bfind\b.*\b(where|how)\b/i, /\blist\s+(all|the)\b/i,
      /\bdiagram\b/i, /\barchitecture\b/i, /\boverview\b/i,
    ],
  },
  {
    intent: 'deploy',
    weight: 4,
    patterns: [
      /\bdeploy\b/i, /\brelease\b/i, /\bpublish\b/i, /\bship\b/i,
      /\bstaging\b/i, /\bproduction\b/i, /\brollout\b/i, /\bci\/?cd\b/i,
      /\bdocker/i, /\bkubernetes\b/i, /\bk8s\b/i, /\bnpm publish\b/i,
      /\bpipeline\b/i, /\bgithub action/i, /\bvercel\b/i, /\bnetlify\b/i,
    ],
  },
  {
    intent: 'build',
    weight: 1,  // lowest weight — catchall intent
    patterns: [
      /\bbuild\b/i, /\bcreate\b/i, /\badd\b/i, /\bimplement\b/i,
      /\bnew\b/i, /\bset\s*up\b/i, /\bintegrat/i, /\bmake\b/i,
      /\bwrite\b/i, /\bgenerat/i, /\bscaffold\b/i, /\binit/i,
      /\bbootstrap\b/i, /\bwire\s*up\b/i, /\bconnect\b/i,
      /\bfeature\b/i, /\bendpoint\b/i, /\bcomponent\b/i, /\bpage\b/i,
    ],
  },
];

export function classifyIntent(request: string): Intent {
  const scores = new Map<Intent, number>();

  for (const rule of INTENT_RULES) {
    const matchCount = rule.patterns.filter((p) => p.test(request)).length;
    if (matchCount > 0) {
      const current = scores.get(rule.intent) ?? 0;
      scores.set(rule.intent, current + matchCount * rule.weight);
    }
  }

  if (scores.size === 0) return 'build';

  // Return the intent with the highest weighted score
  let best: Intent = 'build';
  let bestScore = 0;
  for (const [intent, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return best;
}
