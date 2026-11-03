# Smart Fitness Tracker

A personal app that pulls my own activity and sleep data from Garmin Connect (Personal API tier) and turns it into something useful. Single user: me.

## Before working

- **Requirements:** `docs/requirements.md` is the source of truth for scope. Cite requirements by ID (`R-ACT-01`), never by section number. Don't build anything marked `LATER` or `WON'T` unless asked.
- **Domain terms:** `GLOSSARY.md` at the repo root, once it exists. Use its words in code, issues and tests.
- **Decisions:** `docs/adr/`. Read the ADRs touching the area you're changing. See `docs/agents/domain.md`.
- **Tasks:** `docs/agents/issue-tracker.md`. Use the `sft-milestone` skill to start, build or close a milestone.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind, installable as a PWA, deployed on Vercel Hobby. Supabase free plan for Postgres (RLS on every table), Auth and Storage, with migrations in the repo via the Supabase CLI. `@garmin/fitsdk` for decoding .FIT files and visx for charts. pnpm, Vitest, ESLint, zod. Metric formulas are pure functions in `src/lib/metrics/`, each with tests on reference cases. Sync design: ADR-0002. Raw archive: ADR-0003.

## Local development

Open the app at `http://localhost:3100`. On `127.0.0.1`, Next blocks its dev resources and the page never hydrates. Supabase runs on ports 544xx (`pnpm exec supabase start`), so it can run beside other local projects. `pnpm exec supabase db reset` applies migrations and `supabase/seed.sql`, which holds the local owner login.
