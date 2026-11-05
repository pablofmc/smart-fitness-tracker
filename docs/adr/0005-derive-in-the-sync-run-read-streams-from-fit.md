# Each sync run also rebuilds derived data, and per-second streams are read from the .FIT on demand

Parsing (activities, health days) and computing (TRIMP, zones, running metrics) run at the end of every sync run, with 30 s of the function's time, picking up whatever is new, changed in Garmin, made by an older parser or formula version, or now under different HR settings (ADR-0002, ADR-0003). So the reprocess job is not a separate tool: emptying a derived table, or bumping a version constant, makes the next runs rebuild it. Per-second streams (HR, pace, altitude, cadence) are not stored in Postgres: the activity detail decodes the archived .FIT when it opens, and the jobs decode it once to store per-activity results.

## Considered options

- **A separate reprocess job or button:** one more thing to trigger and keep in step with the parsers; the sync already runs every 30 minutes and knows what changed.
- **Store every sample in a table:** about 3,600 rows per hour of activity, millions in total, against the 500 MB database limit, for data that is already in the archive.

## Consequences

- A large rebuild (all 1,056 activities and about 10,000 health days) finishes within a few runs; it was measured at one run for parsing on 2026-11-03.
- The detail page costs one .FIT download and decode per view, about 100 ms locally.
- When a run's parsing fails, the run is logged as failed with the reason, and the Garmin data it fetched stays archived.
- Garmin's HR settings (max, resting, LTHR from `heart_rate_zones`) seed the first HR version, effective from the start of history, so every past activity gets a load until the owner sets their own.
- "Today" follows the time zone on the owner's Garmin profile, so it matches the calendar days Garmin assigns (R-DAT-04).
