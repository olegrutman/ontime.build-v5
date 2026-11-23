const COMPLETED_PREFIX = 'sasha_guide_completed';

export function sashaGuideCompletionKey(ownerId: string, guideId: string) {
  return `${COMPLETED_PREFIX}:${ownerId}:${guideId}`;
}

export function readCompletedGuides(ownerId: string | null): string[] {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    const prefix = `${COMPLETED_PREFIX}:${ownerId}:`;
    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith(prefix) && window.localStorage.getItem(key) === 'true')
      .map((key) => key.slice(prefix.length));
  } catch {
    return [];
  }
}

export function markGuideCompleted(ownerId: string | null, guideId: string): string[] {
  if (!ownerId || typeof window === 'undefined') return [];
  try {
    window.localStorage.setItem(sashaGuideCompletionKey(ownerId, guideId), 'true');
  } catch {
    // Completion still applies to this session when storage is unavailable.
  }
  return Array.from(new Set([...readCompletedGuides(ownerId), guideId]));
}

export function pathMatches(pattern: RegExp | undefined, pathname: string): boolean {
  if (!pattern) return false;
  pattern.lastIndex = 0;
  return pattern.test(pathname);
}
