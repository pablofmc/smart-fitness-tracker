# We compute our own training load (TRIMP) and don't use Garmin's

Training load, fitness, fatigue and form (CTL/ATL/TSB) are computed by us from each activity's heart-rate stream as TRIMP (R-LOAD-01, R-LOAD-03). Garmin's own load and readiness values are stored and shown next to ours (R-LOAD-04), but nothing is computed from them. The reasons are these. The Personal tier may return "not found" for them (see `docs/garmin-api.md`). Garmin's formulas are not published, and they can change with firmware. Our values must also be reproducible from the raw archive (ADR-0003).

## Considered options

- **Use Garmin's training load:** this is the least work, but it may be missing, it can't be explained on screen (R-UI-05), and it can't be recomputed.
- **Pace-based load (rTSS) for running, power-based TSS for cycling:** this is more accurate for one sport each, but it gives no single scale across sports (R-LOAD-02). It may come later as a per-sport module.
- **Session RPE (perceived effort × duration):** this needs a manual entry after every session, and the check-in (R-CHK-01) is only a SHOULD.

## Consequences

- HR settings (max, resting, threshold) are versioned by date. Each activity uses the values in effect on its date (R-LOAD-05).
- Changing the formula means running a reprocess, not a data migration.
- HR-based load undervalues heavy, low-heart-rate strength work. We accept this for now; a strength-specific factor would be a new decision.
- Activities without HR have no TRIMP. They still appear in the activity list and volume charts, but they add nothing to load.
