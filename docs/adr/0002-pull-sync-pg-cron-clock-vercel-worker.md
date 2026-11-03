# Scheduled pull sync: pg_cron is the clock, a Vercel route does the work

The Personal tier has no webhooks (to be confirmed, see `docs/garmin-api.md`), so we must poll Garmin on a schedule (R-SYN-01, R-SYN-02). Vercel Hobby cron runs at most once a day ([docs](https://vercel.com/docs/cron-jobs/usage-and-pricing)), which is too slow. Instead, Supabase `pg_cron` + `pg_net` (both available on the free plan, [docs](https://supabase.com/docs/guides/functions/schedule-functions)) send an HTTP request every 30 minutes to a sync route in the Next.js app on Vercel. That route fetches from Garmin, stores the raw files (ADR-0003), parses them and recomputes metrics, all in the same TypeScript codebase as the rest of the app.

## Considered options

- **Vercel cron alone:** limited to once a day on Hobby. "Sync now" (R-SYN-03) would still work, but automatic sync would lag by up to a day.
- **Supabase Edge Functions as the worker:** these run on Deno, separately from the app code, and their CPU-time limits (not verified) may be too short for parsing large .FIT files. That would mean two runtimes and two deploy paths for one sync.
- **An external cron service (GitHub Actions, cron-job.org):** this adds another account and another place where the secret lives, with no gain over `pg_cron`.

## Consequences

- The sync route is public on the internet. It only accepts requests carrying a shared secret, which is stored in Supabase Vault (for `pg_cron`) and in a Vercel environment variable, and never in the repo (R-SEC-03).
- Each run must finish within Vercel's function time limit, which is 300 s on Hobby ([docs](https://vercel.com/docs/functions/limitations#max-duration), checked 2026-11-02). Runs stop themselves at 240 s. The full history load (R-SYN-04) therefore runs in resumable batches: each run picks up where the last one stopped, using a cursor stored in the database.
- Calls to Garmin are spaced about 1 s apart because its limits are unpublished. The full load (about 10,000 calls) takes roughly a day, and recent health days refresh every 3 hours instead of every run.
- Every run writes a row to a sync-run log (start, end, result, error). That log is the source for the last-sync status in the app (R-SYN-02).
- Writes are upserts keyed on Garmin's IDs and calendar days, so a run that is repeated or overlaps another one creates no duplicates (R-SYN-06).
- The 30-minute requests also count as database activity. We expect them to keep the free project from pausing after 7 days (R-OPS-03), but this is unconfirmed. If the project pauses anyway, the app must show that sync is stopped rather than fail silently.
