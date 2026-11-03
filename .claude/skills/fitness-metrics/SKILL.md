---
name: fitness-metrics
description: The formulas behind every number Smart Fitness Tracker computes — TRIMP, CTL/ATL/TSB, HR zones, estimated 1RM, personal baselines, correlations, cardiac drift, pace at fixed HR, best efforts. Load before writing or changing anything in src/lib/metrics, a reprocess job, a chart or verdict sentence that shows a computed value, or a test of one.
---

# Fitness metrics

This file is the single source of truth for the formulas. If code and this file disagree, ask me before changing either. Units are metric (R-DAT-05); every daily value belongs to the local calendar day where the watch recorded it (R-DAT-04).

## Rules for every metric

- **Pure functions** in `src/lib/metrics/`: no React, no Supabase, no I/O. Inputs are parsed records plus the HR settings in effect on the activity's date (R-LOAD-05).
- **Golden tests:** each formula has Vitest cases computed by hand from small inputs, including the edge cases listed below. A formula change updates its golden tests in the same change.
- **Explainable:** each function returns its value and the inputs it used, so the screen can show how the number was computed (R-UI-05, R-LOAD-06).
- **Missing is not zero.** When the inputs are not enough, return "not available" with the reason, and the UI shows that reason.
- **Changing a formula** means a reprocess from the raw archive, not a data migration (ADR-0003, ADR-0004). Store a formula version with each computed value.

## HR settings

Max HR, resting HR and threshold HR (LTHR) are set in Ajustes, each with an effective-from date. An activity uses the latest values effective on or before its date. The resting HR here is the setting, not Garmin's daily resting HR.

## HR zones (R-RUN-05)

Five zones as a percentage of LTHR (Friel): Z1 < 85 %, Z2 85–89 %, Z3 90–94 %, Z4 95–99 %, Z5 ≥ 100 %. Time in zone is summed per activity and per week.

## TRIMP (R-LOAD-01)

Banister, integrated over the HR samples of the activity:

- HRr = (HR − HRrest) / (HRmax − HRrest), clamped to [0, 1].
- TRIMP = Σ Δt_min × HRr × 0.64 × e^(1.92 × HRr). The 1.92 coefficient is the male one, chosen on purpose.
- Δt is the time to the next sample. A gap longer than 30 s counts as a pause and adds nothing.
- An activity with no HR samples has no TRIMP. It still counts in volume, but not in load.

## Fitness, fatigue, form (R-LOAD-02, R-LOAD-03)

Daily load = the sum of TRIMP over all activities of that day, all sports together; a day with no activity has a load of 0.

- CTL_d = CTL_(d−1) + (load_d − CTL_(d−1)) / 42
- ATL_d = ATL_(d−1) + (load_d − ATL_(d−1)) / 7
- TSB_d = CTL_(d−1) − ATL_(d−1)

Both start at 0 on the first day of data. The per-sport breakdown splits daily load by sport; CTL/ATL always use the total.

## Estimated 1RM (R-STR-02, R-STR-03: LATER, don't build yet)

Epley: 1RM = weight × (1 + reps / 30), only for sets with weight > 0 and 1–10 reps. A 1-rep set gives its own weight. The day's 1RM for an exercise is the one from its best set. Garmin has no weights for this user's sessions, so this needs a source of weights first.

## Personal baseline (R-HLT-02)

For HRV and resting HR: compare the mean of the last 7 days with the normal range, which is the 60-day mean ± 1 standard deviation over the 60 days ending yesterday. For a single-night value (for example last night's sleep), compare the value itself with the same kind of range. Conventions: the range needs at least 14 values in its window, and the 7-day mean needs at least 3. Below that, return "sin línea base aún".

## Correlations (R-COR-01, R-COR-02, R-COR-03)

- **Numeric vs numeric:** Spearman ρ between X on day d and Y on day d + lag. Strength by |ρ|: < 0.2 muy débil, 0.2–0.4 débil, 0.4–0.6 moderada, ≥ 0.6 fuerte.
- **Tag vs numeric** (R-COR-04): the difference of Y's means between days with the tag and days without, with pooled-SD Cohen's d. Strength by |d|: < 0.2 muy débil, 0.2–0.5 débil, 0.5–0.8 moderada, ≥ 0.8 fuerte. Convention: each group needs at least 10 days.
- Below 30 paired days, the result is "datos insuficientes", whatever ρ or d is. Always show n with the strength.

## Cardiac drift (R-RUN-03)

Pa:HR decoupling. Split the run in two halves by elapsed time; EF = mean speed / mean HR in each half; decoupling = (EF₁ − EF₂) / EF₁ × 100 %. It only applies to runs of at least 60 min that are steady, meaning every full lap's pace is within ±10 % of the mean lap pace. Below 5 % is shown as good.

## Pace at fixed HR (R-RUN-02)

The target HR is set in Ajustes; its default is the midpoint of Z2 (87 % of LTHR, rounded). Use the samples where HR is within ±3 bpm of the target, skipping the first 10 minutes of the run (HR lag) and runs without GPS. A run needs at least 5 qualifying minutes; its value is the mean pace of those samples. The trend shows the weekly median.

## Best efforts (R-RUN-04)

For 1, 5, 10 and 21.1 km: the shortest elapsed time between two records of the run whose distance difference reaches the target, interpolating the end point. Pauses inside the window count as time. Only outdoor runs with GPS count; treadmill and indoor runs never set a record. Each new best is kept in the records history.
