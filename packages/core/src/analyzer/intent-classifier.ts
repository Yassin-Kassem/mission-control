import type { Intent } from './situation-profile.js';

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  {
    intent: 'fix',
    patterns: [/\bfix\b/i, /\bbug\b/i, /\berror\b/i, /\bpatch\b/i, /\bbroken\b/i, /\bissue\b/i, /\bcorrect\b/i, /\brepair\b/i],
  },
  {
    intent: 'debug',
    patterns: [/\bdebug\b/i, /\binvestigat/i, /\bwhy is\b/i, /\bwhy are\b/i, /\bmemory leak\b/i, /\bprofile\b/i, /\btrace\b/i],
  },
  {
    intent: 'refactor',
    patterns: [/\brefactor\b/i, /\bclean\s*up\b/i, /\brestructur/i, /\breorganiz/i, /\bsimplif/i, /\bextract\b/i, /\bmodulariz/i],
  },
  {
    intent: 'explore',
    patterns: [/\bhow does\b/i, /\bexplain\b/i, /\bwhat does\b/i, /\bwhat is\b/i, /\bshow me\b/i, /\bdescribe\b/i, /\bunderstand\b/i],
  },
  {
    intent: 'deploy',
    patterns: [/\bdeploy\b/i, /\brelease\b/i, /\bpublish\b/i, /\bship\b/i, /\bstaging\b/i, /\bproduction\b/i, /\brollout\b/i],
  },
  {
    intent: 'build',
    patterns: [/\bbuild\b/i, /\bcreate\b/i, /\badd\b/i, /\bimplement\b/i, /\bnew\b/i, /\bset\s*up\b/i, /\bintegrat/i, /\bmake\b/i],
  },
];

export function classifyIntent(request: string): Intent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(request))) {
      return intent;
    }
  }
  return 'build';
}
