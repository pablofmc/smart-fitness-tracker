# Raw Garmin data is the source of truth; parsed tables are rebuilt from it

Every original .FIT file and raw JSON payload is kept forever, gzip-compressed, in Supabase Storage (R-DAT-01). All parsed tables and computed metrics are derived data: a reprocess job can drop them and rebuild them from the raw archive with the same result (R-DAT-02). We did this because formulas, parsers and Garmin's payloads will change, and Garmin may not let us re-download years of history later. The free plan gives 1 GB of storage ([pricing](https://supabase.com/pricing)). Our rough estimate is about 250 MB uncompressed for 1,300 activities, which leaves room for years.

## Considered options

- **Store only parsed tables:** this is smaller and simpler, but every parser bug or new metric would need a fresh download from Garmin, if that is even possible.
- **Store raw data in a Postgres `bytea`/`jsonb` column:** this would fill the 500 MB database limit long before the 1 GB storage limit.
- **Cloudflare R2 (10 GB free):** this is more space, but it means another account and more credentials. It is the fallback if storage gets tight, and moving there would need its own ADR (R-OPS-02).

## Consequences

- Parsed tables are never edited by hand or by the UI. User corrections, such as fixing a strength set (R-STR-05), live in separate override tables that are applied on top of the parsed data, so a reprocess keeps them.
- Each parsed record links to its raw file and stores the parser version that produced it.
- The archive keeps one current object per payload (`raw_files` is unique on kind and source key). Recent days are fetched again every 30 minutes while Garmin is still filling them, so keeping every version would use up the 1 GB quickly. A re-fetch replaces the object only when its hash changed.
- Ajustes shows storage usage and warns at 70 % of the free quota.
