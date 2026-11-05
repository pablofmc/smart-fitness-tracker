# Requirements

Smart Fitness Tracker: a personal web app that pulls my own Garmin data (Personal API tier) and turns it into a full dashboard with trends, training analysis and correlations. Single user: me.

**How to use this file**
- Each requirement has a stable ID (`R-RUN-03`). Cite IDs in issues, commits, tests and skills. Never renumber; retire an ID by marking it `WON'T` with a reason.
- Priorities: `MUST` (the app is incomplete without it) · `SHOULD` (planned, after the MUSTs it depends on) · `LATER` (not now; don't build) · `WON'T` (decided against).
- Garmin API facts live in `docs/garmin-api.md`. Requirements marked 🔍 depend on a fact not yet confirmed there.
- UI text is Spanish; code, docs and identifiers are English. Familiar terms stay in English in the UI (HRV, Body Battery, TRIMP).

## Data sync (SYN)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-SYN-01 | MUST | Fetch new activities and health data from Garmin automatically, without me opening the app. | A run recorded today appears in the app within a few hours with no manual action. |
| R-SYN-02 | MUST | 🔍 The Personal tier is pull-only, so sync runs on a schedule in the cloud. | A scheduled job polls Garmin; the app shows when the last sync happened and whether it failed. |
| R-SYN-03 | MUST | A "sync now" action in the app. | Tapping it fetches anything new and updates the last-sync time. |
| R-SYN-04 | MUST | 🔍 Load my full history once: through the API if its date windows reach back far enough, otherwise from a Garmin Connect data export (zip). | Every past activity and every past day of sleep/health data is in the app, with no gaps or duplicates. |
| R-SYN-05 | MUST | 🔍 Warn me in the app before the Personal API key expires, and accept a new key in Settings. | A banner appears 14 days before expiry; pasting a new key resumes sync. |
| R-SYN-06 | MUST | Sync is idempotent: fetching the same activity or day twice never creates duplicates. | Re-running a full sync leaves row counts unchanged. |

## Data storage (DAT)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-DAT-01 | MUST | Keep every original .FIT file and every raw JSON payload forever, next to the parsed tables. | Each parsed record links to its raw source, and the raw file can be downloaded. |
| R-DAT-02 | MUST | Everything can be re-parsed from the raw data. | A reprocess job rebuilds all parsed tables from raw files with the same result. |
| R-DAT-03 | MUST | Store all health data the Personal tier exposes (sleep, HRV, resting HR, Body Battery, stress, steps, respiration, SpO2 and others), not only what the dashboard shows. | Every field the API returns is queryable, even if no screen uses it. |
| R-DAT-04 | MUST | Each record belongs to a calendar day in the time zone where the watch recorded it, so travel doesn't break days. | A run at 23:00 local time while abroad counts for that local day. |
| R-DAT-05 | MUST | Metric units: km, kg, min/km for running, km/h for cycling. | No imperial units anywhere. |
| R-DAT-06 | LATER | Export all my data (raw + parsed) as a zip or CSV. | — |

## Activities (ACT)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-ACT-01 | MUST | Store every activity in full, whatever the sport. | A sport never seen before is saved and listed with no code change. |
| R-ACT-02 | MUST | Generic summary for any sport: duration, distance, HR, load, and trends over time. | A swim, a hike or a HIIT session shows this summary with no sport-specific code. |
| R-ACT-03 | MUST | Deep analysis for running (R-RUN) and strength (R-STR). Each sport's deep analysis is a separate module, so adding a sport later doesn't touch the others. | Adding a new sport module needs no change to existing modules. |
| R-ACT-04 | MUST | The dashboard puts first the sports I've done most in recent weeks (auto-detected). | If I start cycling a lot, cycling moves up with no setting changed. |
| R-ACT-05 | MUST | Activity detail: time charts of HR, pace, elevation and cadence, plus laps. | Opening any run shows all four charts and its lap table. |
| R-ACT-06 | SHOULD | Route map on the activity detail, using OpenStreetMap tiles (free). | GPS activities show their route. |
| R-ACT-07 | MUST | Activity list, filterable by sport and date. | — |

## Running (RUN)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-RUN-01 | MUST | Weekly volume (distance, time) and its trend. | — |
| R-RUN-02 | MUST | Aerobic efficiency: pace at a fixed HR over time. | A chart shows whether I'm getting faster at the same HR. |
| R-RUN-03 | MUST | Cardiac drift on long steady runs. | Long runs show drift between their first and second halves. |
| R-RUN-04 | MUST | Best efforts auto-detected inside any run (1k, 5k, 10k, 21.1k), with a history of records. | A fast 5k inside a 12k run counts as a 5k effort. |
| R-RUN-05 | MUST | Time in HR zones per run and per week. | — |
| R-RUN-06 | MUST | Cadence, when the watch records it. | — |
| R-RUN-07 | SHOULD | Running dynamics (ground contact, vertical oscillation and so on), when the watch records them. | — |

## Strength (STR)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-STR-06 | MUST | Sets, reps and time per exercise and per muscle group, from what the watch detects. | Sets with an unknown exercise count as "sin clasificar". |
| R-STR-01 | LATER | Volume (sets × reps × weight) per exercise and per muscle group. Garmin has no weights for my sessions (`docs/garmin-api.md`), and I don't aim for a strength-specialist app. | — |
| R-STR-02 | LATER | Estimated 1RM per exercise and its trend. Needs weights (see R-STR-01). | — |
| R-STR-03 | LATER | Personal records per exercise. Needs weights (see R-STR-01). | — |
| R-STR-04 | MUST | Training frequency per muscle group. | Sets with an unknown exercise count as "sin clasificar" until corrected. |
| R-STR-05 | SHOULD | Edit a strength session's sets in the app (exercise, reps). Corrections never overwrite the raw data. | An edited set changes the analysis; the raw .FIT is untouched. |

## Training load (LOAD)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-LOAD-01 | MUST | Compute our own HR-based load per activity (TRIMP). It must not depend on Garmin's own load values. | Every activity with HR has a load value. |
| R-LOAD-02 | MUST | One combined load across all sports, with a per-sport breakdown. | A heavy leg session raises the same fatigue curve as a run. |
| R-LOAD-03 | MUST | Fitness, fatigue and form curves (CTL, ATL, TSB). | — |
| R-LOAD-04 | MUST | Show Garmin's own load and readiness values next to ours, when the API returns them. | — |
| R-LOAD-05 | MUST | HR zones and thresholds (max HR, resting HR, threshold HR) are set in Settings and versioned by date. Each activity uses the values in effect on its date. | Changing max HR today doesn't change the load or zones of past activities. |
| R-LOAD-06 | SHOULD | Our own daily readiness score from HRV vs my baseline, sleep and form (TSB), with the formula and each input visible. | The score's screen shows exactly how today's number was computed. |

## Sleep and health (HLT)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-HLT-01 | MUST | The dashboard highlights sleep (duration, stages, score), HRV, resting HR, Body Battery and stress. | — |
| R-HLT-02 | MUST | Each of these is shown against my personal baseline, not only as a raw number. | HRV shows today's value against my recent normal range. |
| R-HLT-03 | MUST | Trends over weeks, months and years for every stored health metric. | — |

## Correlations (COR)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-COR-01 | MUST | A curated set of correlations, for example: sleep vs next-day performance, load vs HRV, resting HR vs fatigue. | Available from the first day of data. |
| R-COR-02 | MUST | Every correlation shows how many days support it and how strong it is. Below about 30 days it's labelled "datos insuficientes". | No correlation is shown without its sample size and strength. |
| R-COR-03 | SHOULD | A free explorer: any metric X against any metric Y, with an optional day lag (e.g. today's sleep vs tomorrow's pace). | — |
| R-COR-04 | SHOULD | Check-in tags (R-CHK) can be used in correlations. | "Alcohol" vs next-day HRV can be explored. |

## Daily check-in (CHK)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-CHK-01 | SHOULD | A 10-second daily check-in: how I feel (1–5), predefined tags (alcohol, late caffeine, sick, travel, work stress) plus my own tags, weight, a note. | Doable one-handed on the phone in about 10 seconds. |

## Goals (GOAL)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-GOAL-01 | SHOULD | Goals such as weekly volume or a race on a date, with progress shown. | — |

## Dashboard and UI (UI)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-UI-01 | MUST | Responsive web app, installable on the phone. | Works on a phone-size screen and on desktop. |
| R-UI-02 | MUST | Sections: **Hoy** (sleep, HRV vs baseline, form, check-in) · **Actividades** · **Tendencias** · **Correlaciones** · **Ajustes**. Hoy is the home screen on the phone. | — |
| R-UI-03 | MUST | UI text in Spanish; familiar terms (HRV, Body Battery, TRIMP) stay in English. | — |
| R-UI-04 | SHOULD | Light and dark mode, including charts. Both themes are designed before colors are coded. In Ajustes I choose **Sistema** (follow the device, the default), **Claro** or **Oscuro**; the choice is remembered. | Switching theme in Ajustes applies at once, survives a reload, and doesn't flash the other theme on load. |
| R-UI-05 | MUST | Verdict-first screens: Hoy, activity detail and correlations lead with a one-sentence conclusion (e.g. "Buen día para calidad"), then the numbers. Sentences come from explicit rules and templates, not AI (AI is R-LTR-01). | Every sentence can show which rule produced it and with which inputs. |
| R-UI-06 | MUST | Visual direction "C · Coach" for the whole app; analysis screens (Tendencias, Correlaciones, activity detail) use the denser chart style of direction "B" inside C's cards. | — |

## Security and access (SEC)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-SEC-01 | MUST | Login required. Only my account exists; sign-ups are disabled. | A new visitor can't create an account or see any data. |
| R-SEC-02 | MUST | Every table has RLS; nothing is readable without a session. | — |
| R-SEC-03 | MUST | The Garmin API key is stored server-side only, never sent to the browser or committed. | — |

## Cost and operations (OPS)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| R-OPS-01 | MUST | Runs at $0 on free tiers. | — |
| R-OPS-02 | MUST | If anything would require a paid tier, stop and tell me before paying. Record the decision as an ADR. | No paid plan is ever enabled without my explicit yes. |
| R-OPS-03 | MUST | The scheduled sync keeps the backend from being paused for inactivity, or the app handles a paused backend gracefully. | 🔍 Supabase free projects pause after 7 days of inactivity. |

## Later and won't

| ID | Pri | Requirement |
|---|---|---|
| R-LTR-01 | LATER | AI coach: questions in natural language and weekly summaries. Blocked on reading Garmin's Personal tier terms on AI use. |
| R-LTR-02 | LATER | Notifications or emailed summaries. |
| R-LTR-03 | LATER | Deep analysis for more sports (e.g. cycling power and FTP), as new modules (R-ACT-03). |
| R-LTR-04 | LATER | A second, invited user (my spouse) with her own Garmin Personal key and her own data, invisible to me and mine to her. Blocked on reading Garmin's Personal tier terms on serving another person. Supersedes ADR-0001 and changes R-SEC-01 when built. |
| R-WONT-01 | WON'T | Sending workouts or routes to the watch: the Personal tier is read-only. |
| R-WONT-02 | WON'T | Open sign-ups or users beyond the invited household (R-LTR-04). |
