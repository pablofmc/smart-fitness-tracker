/** A run as the assignment rule sees it. `startedAt` is an ISO timestamp, null when Garmin gave none. */
export type RunForShoe = { id: number; startedAt: string | null };
export type DefaultShoe = { id: number; createdAt: string };

/**
 * R-GEAR-03: each run is decided once, the first sync that sees it. It goes to the default shoe
 * when one exists and the run started after that shoe was registered; otherwise it is recorded
 * with no shoe, so a default set later never reaches back to it. Runs already decided (by the
 * sync or by hand) are left alone.
 */
export function assignRuns(runs: RunForShoe[], decided: ReadonlySet<number>, defaultShoe: DefaultShoe | null) {
  const registered = defaultShoe ? Date.parse(defaultShoe.createdAt) : null;
  return runs
    .filter((run) => !decided.has(run.id))
    .map((run) => {
      const started = run.startedAt ? Date.parse(run.startedAt) : NaN;
      const takes = defaultShoe !== null && registered !== null && started >= registered;
      return { activity_id: run.id, shoe_id: takes ? defaultShoe.id : null };
    });
}
