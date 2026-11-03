---
title: Sync route, 30-minute schedule and status
milestone: M2 Sync and raw archive
labels: area:sync,area:ops
status: open
---

**Requirements:** R-SYN-01, R-SYN-02, R-SYN-03, R-OPS-03

Route protected by a shared secret, `pg_cron` + `pg_net` as the clock, "Sincronizar ahora" in the app.

**Done when:**
- [x] A new run appears within a few hours with no manual action
- [x] The app shows the last sync and whether it failed
- [ ] A paused backend or stopped sync is visible, not silent
