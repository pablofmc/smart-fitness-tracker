---
title: Garmin API client
milestone: M2 Sync and raw archive
labels: area:sync
status: done
---

**Requirements:** R-SEC-03

Key-to-token exchange, windows and backoff from the `garmin-api` skill.

**Done when:**
- [x] A 401 from the token endpoint marks sync as blocked
- [x] 429 and 5xx back off and end the run with a log entry
- [x] Tested against recorded response shapes
