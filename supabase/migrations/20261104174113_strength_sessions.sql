-- Strength module values per session (R-STR-04, R-STR-06), derived from the .FIT `set` messages.
-- Rebuilt when the formula version changes. Weights are absent from Garmin's files, so there is no volume.

create table public.strength_sessions (
  activity_id bigint primary key references public.activities (id) on delete cascade,
  formula_version integer not null,
  total_sets integer not null,
  total_reps integer not null,
  active_s double precision not null,
  unknown_sets integer not null,
  -- [{ category, sets, reps, seconds }], most sets first. Category "unknown" is "sin clasificar".
  exercises jsonb not null,
  -- { "Piernas": 9, "Sin clasificar": 4, ... }, only groups with sets.
  group_sets jsonb not null,
  computed_at timestamptz not null default now()
);

alter table public.strength_sessions enable row level security;

revoke all on public.strength_sessions from anon, authenticated;
grant select on public.strength_sessions to authenticated;
grant all on public.strength_sessions to service_role;

create policy "signed-in owner reads strength sessions" on public.strength_sessions
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
