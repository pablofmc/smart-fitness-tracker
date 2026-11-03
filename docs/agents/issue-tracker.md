# Issue tracker

Tasks are GitHub Issues grouped by milestone, once the private repo exists. Until then they live as files in `docs/issues/`, one per issue:

```markdown
---
title: Password login with sign-ups off
milestone: M1 Foundations
labels: area:security,area:ui
status: open
---

**Requirements:** R-SEC-01
...
**Done when:**
- [ ] Sign-up attempts are rejected
```

- Name files `M<n>-<nn>-<slug>.md`, or `L-<nn>-<slug>.md` for the `Later` milestone.
- When a task is finished, tick its boxes and set `status: done`.

## Moving to GitHub

No commit or push happens in the owner's work hours, so ask before starting.

1. `git init`, then `gh repo create smart-fitness-tracker --private --source .`.
2. `pnpm issues` prints the plan. `pnpm issues --apply` creates the milestones, labels and issues, and closes those marked `done`. Re-running skips titles that already exist.
3. Check the issues on GitHub, then delete `docs/issues/` and `scripts/publish-issues.mjs`, and replace this file with a pointer to GitHub Issues.
4. Commit, grouped by task where practical, and push.
