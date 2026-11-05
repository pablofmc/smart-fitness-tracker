-- Activities parsed from the raw archive (R-ACT-01, R-DAT-02). Derived data: dropping these rows and
-- running a sync rebuilds them (ADR-0003). The signed-in owner only reads them.

create table public.activities (
  id bigint primary key,
  raw_file_id bigint not null references public.raw_files (id),
  raw_sha256 text not null,
  parser_version integer not null,
  name text,
  sport text not null,
  local_day date not null,
  started_at timestamptz,
  duration_s double precision,
  moving_s double precision,
  distance_m double precision,
  avg_hr double precision,
  max_hr double precision,
  exercise_count integer,
  data jsonb not null
);

comment on column public.activities.sport is 'Garmin activity type key. Free text, so a sport never seen before needs no migration (R-ACT-01).';
comment on column public.activities.local_day is 'Calendar day where the watch recorded it (R-DAT-04).';
comment on column public.activities.data is 'Every field of the summary payload, queryable even if no screen uses it (R-DAT-03).';

create index activities_local_day_idx on public.activities (local_day desc);
create index activities_raw_file_id_idx on public.activities (raw_file_id);

alter table public.activities enable row level security;

revoke all on public.activities from anon, authenticated;
grant select on public.activities to authenticated;
grant all on public.activities to service_role;

create policy "signed-in owner reads activities" on public.activities
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
