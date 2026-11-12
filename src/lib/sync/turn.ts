/** One person with a usable Garmin key, and when their last sync run started (null if never). */
export type SyncCandidate = { userId: string; lastStartedAt: string | null };

/**
 * Whose turn it is in a scheduled run (ADR-0007): the person who waited longest, someone never synced
 * first. Ties go to the lower id, so the choice is stable.
 */
export function nextUserToSync(candidates: SyncCandidate[]): string | null {
  const sorted = [...candidates].sort((a, b) => {
    if (a.lastStartedAt === b.lastStartedAt) return a.userId.localeCompare(b.userId);
    if (a.lastStartedAt === null) return -1;
    if (b.lastStartedAt === null) return 1;
    return a.lastStartedAt.localeCompare(b.lastStartedAt);
  });
  return sorted[0]?.userId ?? null;
}
