---
title: Store the Garmin key server-side and warn before expiry
milestone: M2 Sync and raw archive
labels: area:security,area:sync,area:ui
status: open
---

**Requirements:** R-SEC-03, R-SYN-05

Paste a key and its expiry in Ajustes. The key and tokens never reach the browser or logs.

**Done when:**
- [x] Banner appears 14 days before expiry
- [ ] Pasting a new key resumes sync
- [x] The key never appears in a client bundle or response
