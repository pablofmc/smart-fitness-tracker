---
title: Load the full history idempotently
milestone: M2 Sync and raw archive
labels: area:sync,area:data
status: open
---

**Requirements:** R-SYN-04, R-SYN-06, R-DAT-01

Resumable batches within Vercel's function limit, upserts keyed on Garmin IDs and calendar days.

**Done when:**
- [ ] Every past activity and health day is archived, with no gaps
- [ ] Re-running changes no row counts
- [ ] Each raw file can be downloaded
