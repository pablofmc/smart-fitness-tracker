-- Strength sessions I log as I train (R-STR-08, #51). Apart from strength_sessions, which come from
-- the watch: the two are linked later (#52) but never merged.
-- Ids are made on the phone, so a set logged without signal can be sent again and again without
-- creating duplicates: every write is an upsert on its id.

create table public.logged_sessions (
  id uuid primary key,
  routine_id bigint references public.routines (id) on delete set null,
  name text not null check (length(name) between 1 and 80),
  local_day date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index logged_sessions_local_day_idx on public.logged_sessions (local_day desc);

create table public.logged_sets (
  id uuid primary key,
  session_id uuid not null references public.logged_sessions (id) on delete cascade,
  exercise_name text not null check (length(exercise_name) between 1 and 80),
  -- The strength module's exercise key, as in routine_exercises; null for exercises typed by hand.
  category text check (length(category) between 1 and 40),
  -- Order of the exercise in the session, so the list reads back as it was trained.
  exercise_position smallint not null check (exercise_position >= 0),
  set_number smallint not null check (set_number between 1 and 50),
  weight_kg numeric(5, 1) not null check (weight_kg between 0 and 999),
  reps smallint not null check (reps between 1 and 200),
  logged_at timestamptz not null
);

create index logged_sets_session_id_idx on public.logged_sets (session_id);
-- "Last time I did this exercise" for the prefill.
create index logged_sets_exercise_idx on public.logged_sets (exercise_name, logged_at desc);

alter table public.logged_sessions enable row level security;
alter table public.logged_sets enable row level security;

revoke all on public.logged_sessions, public.logged_sets from anon, authenticated;
grant select on public.logged_sessions, public.logged_sets to authenticated;
grant all on public.logged_sessions, public.logged_sets to service_role;

create policy "signed-in owner reads logged sessions" on public.logged_sessions
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads logged sets" on public.logged_sets
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
