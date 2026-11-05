-- Running module values per run (R-RUN-02, R-RUN-03, R-RUN-04, R-RUN-06), derived from the .FIT and the
-- HR settings in effect. Rebuilt when the formula version or those settings change.

create table public.run_metrics (
  activity_id bigint primary key references public.activities (id) on delete cascade,
  hr_settings_id bigint references public.hr_settings (id),
  formula_version integer not null,
  counts_for_records boolean not null,
  best_1k_s double precision,
  best_5k_s double precision,
  best_10k_s double precision,
  best_21k_s double precision,
  drift_pct double precision,
  drift_reason text,
  target_hr integer,
  pace_at_hr_s_per_km double precision,
  pace_at_hr_reason text,
  cadence_spm double precision,
  computed_at timestamptz not null default now()
);

alter table public.run_metrics enable row level security;

revoke all on public.run_metrics from anon, authenticated;
grant select on public.run_metrics to authenticated;
grant all on public.run_metrics to service_role;

create policy "signed-in owner reads run metrics" on public.run_metrics
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
