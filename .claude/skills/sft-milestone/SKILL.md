---
name: sft-milestone
description: Milestone workflow for Smart Fitness Tracker. Load to start, build, check or close a milestone (M0–M7) or one of its tasks.
---

# Milestones

Tasks and their milestones are tracked as described in `docs/agents/issue-tracker.md`.

## Start a milestone

1. Read its tasks, the requirements they cite and the ADRs they touch.
2. Find each screen in the design canvas (https://claude.ai/artifact/M8y2LpYGxW7wjtHaEsrgef). Design any missing screen there, and get the owner's approval, before coding it.

## Build a task

Work on one task at a time, and load the skills its area needs (`garmin-api`, `fitness-metrics`, `supabase`). A task is finished when every box in "Done when" was checked against the running app or a test. Tick it then, and report anything left unverified.

## Close a milestone

A milestone is done when all of these hold:

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:db` pass, and `pnpm build` succeeds.
- It's deployed on Vercel, on free plans (R-OPS-02).
- The owner has tried it on the phone.
- Every requirement in it meets its acceptance criterion in `docs/requirements.md`.
- Every formula has golden tests.
- Every new hard decision has an ADR.

Only the owner can confirm the phone check, so leave that milestone open until they do.
