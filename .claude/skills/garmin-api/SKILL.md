---
name: garmin-api
description: Rules for anything that touches Garmin data in Smart Fitness Tracker. Load before writing or changing sync code, Garmin API calls (endpoints, date windows, rate limits, the personal API key), .FIT decoding with @garmin/fitsdk, mapping payload fields to tables, or before answering a question about what the Garmin Personal tier provides.
---

# Garmin API

The single record of what we know about the Garmin Connect API Personal tier is `docs/garmin-api.md`. Each fact there has a status: ✅ confirmed in Garmin's docs, 🟡 secondary source, ❓ unknown. Your memory of Garmin's API is a ❓: the Personal tier dates from 2026-10-27 and changes fast.

## Before writing code

1. Find every fact the change relies on in `docs/garmin-api.md`, and note its status.
2. If a fact is missing, or the change needs a 🟡 fact to be true, check Garmin's own developer docs (or a real response from the API, once the key exists). Then update the table: the fact, the new status, the date and the source link. A real API response counts as a source: name the endpoint and the date.
3. If a fact stays 🟡 or ❓, write the code so it still works when the fact is false (see below), and say so when you report back.

You're done when every Garmin fact the change depends on appears in the table with today's date or an earlier one.

## Coding against unconfirmed facts

- **Every payload field is optional.** Parse with zod schemas that accept a missing field, and store the raw payload first (ADR-0003). A field that disappears breaks a chart, never the sync.
- **Unknown rate limits:** small batches, a pause between calls, and exponential backoff on 429 and 5xx. Stop the run and log it rather than retrying in a loop. The sync design is ADR-0002.
- **Date windows:** request history in windows no larger than the table says, and keep the resumable cursor (ADR-0002).
- **"Not found" values** (training readiness, VO2max and others) are normal. Show them as missing, never as zero (R-LOAD-04).
- **Strength sets** come from the `set` messages in the .FIT. Reps and durations are there; weights are absent and many exercises are `UNKNOWN`, so analysis uses sets, reps and time, with unknown exercises labelled "sin clasificar" (R-STR-06).

## The personal API key

The key lives server-side only: in the database behind RLS, or in an environment variable on Vercel, and never in client components, logs, error messages or the repo (R-SEC-03). Data calls never carry the key: each sync run trades it at the token endpoint for an access token that lasts at most 24 h, and sends that as a bearer token. The token gets the same treatment as the key, and there are no refresh tokens. The key expires (30, 90, 180 days or 1 year). Store its expiry date, because the app warns 14 days ahead (R-SYN-05). A 401 response from the token endpoint means "key expired or revoked": mark sync as blocked and surface it in the app, don't retry. A 401 on a data call means the access token is stale: get one new token, then treat a second 401 as blocked.

## Scope

The Personal tier is read-only and for one person (ADR-0001). Writing to Garmin (workouts, courses) is out of scope (R-WONT-01).
