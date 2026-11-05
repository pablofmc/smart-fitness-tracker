-- HR settings versioned by date (R-LOAD-05), and each activity's TRIMP and time in zones (R-LOAD-01, R-RUN-05).

create table public.hr_settings (
  id bigint generated always as identity primary key,
  effective_from date not null unique,
  max_hr integer not null check (max_hr between 100 and 240),
  resting_hr integer not null check (resting_hr between 25 and 120),
  lthr integer not null check (lthr between 80 and 230),
  source text not null default 'owner' check (source in ('owner', 'garmin')),
  created_at timestamptz not null default now(),
  check (max_hr > resting_hr and lthr <= max_hr)
);

comment on table public.hr_settings is
  'An activity uses the latest row effective on or before its local day. Rows are added, never edited, so past loads stay put.';

-- Derived from the .FIT and hr_settings: rebuilt whenever the formula version or the settings in effect change.
create table public.activity_loads (
  activity_id bigint primary key references public.activities (id) on delete cascade,
  hr_settings_id bigint references public.hr_settings (id),
  formula_version integer not null,
  trimp double precision,
  hr_minutes double precision,
  zone_seconds integer[],
  unavailable_reason text,
  computed_at timestamptz not null default now(),
  check ((trimp is null) = (unavailable_reason is not null))
);

create index activity_loads_hr_settings_id_idx on public.activity_loads (hr_settings_id);

alter table public.hr_settings enable row level security;
alter table public.activity_loads enable row level security;

revoke all on public.hr_settings, public.activity_loads from anon, authenticated;
grant select, insert on public.hr_settings to authenticated;
grant select on public.activity_loads to authenticated;
grant all on public.hr_settings, public.activity_loads to service_role;

create policy "signed-in owner reads hr settings" on public.hr_settings
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner adds hr settings" on public.hr_settings
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true and source = 'owner');

create policy "signed-in owner reads activity loads" on public.activity_loads
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
