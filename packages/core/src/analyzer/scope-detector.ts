import type { Intent, Scope } from './situation-profile.js';

const EPIC_SIGNALS = [
  /\bentire\b/i, /\bcomplete rewrite\b/i, /\bmigrate all\b/i,
  /\bfrom scratch\b/i, /\bground up\b/i, /\boverhaul\b/i,
  /\brewrite\b/i, /\brebuild\b/i, /\breplatform\b/i,
  /\bmigrat(e|ion)\b.*\b(to|from)\b/i,
];

const LARGE_SIGNALS = [
  /\bcomplete\b/i, /\bcomprehensive\b/i, /\bfull\b/i,
  /\bsystem\b/i, /\bintegration\b/i, /\barchitecture\b/i,
  /\bmultiple\s+(file|component|module|endpoint|page)/i,
  /\bauthenticat/i, /\bauthoriz/i, /\bdatabase\b/i,
  /\bapi\b.*\b(layer|system)\b/i, /\bpipeline\b/i,
  /\bwith\s+(tests?|docs?|ci)\b/i,
];

const TRIVIAL_SIGNALS = [
  /\btypo\b/i, /\bspelling\b/i, /\brename\b/i, /\bchange\s+\w+\s+to\b/i,
  /\bupdate\s+(version|readme|docs?|comment)/i,
  /\bbump\b/i, /\bremove\s+(unused|dead|old)\b/i,
  /\bdelete\s+(this|that|the)\b/i,
  /\bone\s+(line|word|char)/i, /\bswap\b/i,
];

export function detectScope(request: string, intent: Intent, estimatedFileCount: number): Scope {
  if (intent === 'explore') return 'trivial';

  const wordCount = request.split(/\s+/).length;

  // Check for explicit scope signals first
  const trivialHits = TRIVIAL_SIGNALS.filter((p) => p.test(request)).length;
  if (trivialHits >= 1 && wordCount <= 10 && estimatedFileCount <= 1) return 'trivial';

  const epicHits = EPIC_SIGNALS.filter((p) => p.test(request)).length;
  if (epicHits >= 1 || estimatedFileCount > 30) return 'epic';

  const largeHits = LARGE_SIGNALS.filter((p) => p.test(request)).length;
  if (largeHits >= 2 || estimatedFileCount > 15 || (largeHits >= 1 && wordCount > 20)) return 'large';

  // Composite scoring for medium vs small
  let complexity = 0;
  complexity += Math.min(wordCount / 8, 3);           // longer descriptions = more complex
  complexity += Math.min(estimatedFileCount / 3, 3);   // more files = more complex
  complexity += largeHits;                              // large signal keywords
  complexity -= trivialHits;                            // trivial signal keywords reduce

  // Multi-step requests (and/then/also/plus) suggest more work
  const conjunctions = (request.match(/\b(and|then|also|plus|with|after that)\b/gi) ?? []).length;
  complexity += conjunctions * 0.5;

  if (complexity >= 4) return 'large';
  if (complexity >= 2) return 'medium';
  if (complexity >= 1 || wordCount > 5 || estimatedFileCount > 1) return 'small';
  return 'trivial';
}
