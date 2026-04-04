import type { Intent, Scope } from './situation-profile.js';

const EPIC_KEYWORDS = /\bentire\b|\bcomplete rewrite\b|\bmigrate all\b|\bfrom scratch\b/i;
const LARGE_KEYWORDS = /\bcomplete\b|\bcomprehensive\b|\bfull\b|\bsystem\b|\bintegration\b/i;

export function detectScope(request: string, intent: Intent, estimatedFileCount: number): Scope {
  if (intent === 'explore') return 'trivial';
  const wordCount = request.split(/\s+/).length;
  if (EPIC_KEYWORDS.test(request) || estimatedFileCount > 30) return 'epic';
  if (LARGE_KEYWORDS.test(request) || estimatedFileCount > 15 || wordCount > 25) return 'large';
  if (estimatedFileCount > 4 || wordCount > 12) return 'medium';
  if (estimatedFileCount > 1 || wordCount > 5) return 'small';
  return 'trivial';
}
