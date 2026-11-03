-- One row per health payload kind and calendar day, split out of the raw archive (R-DAT-03, R-DAT-02).
-- Derived data like activities: emptying it makes the next syncs rebuild it (ADR-0003).

create table public.health_days (
  kind text not null,
  day date not null,
  raw_file_id bigint not null references public.raw_files (id),
  raw_sha256 text not null,
  parser_version integer not null,
  data jsonb not null,
  primary key (kind, day)
);

comment on table public.health_days is
  'kind is the raw payload kind (sleep_daily, hrv_summaries, …). data holds every field Garmin sent for that day.';

create index health_days_raw_file_id_idx on public.health_days (raw_file_id);
create index health_days_day_idx on public.health_days (day desc);

alter table public.health_days enable row level security;

revoke all on public.health_days from anon, authenticated;
grant select on public.health_days to authenticated;
grant all on public.health_days to service_role;

create policy "signed-in owner reads health days" on public.health_days
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

-- Which raw files the health parser has read, so a payload with no days isn't read again every run.
create table public.health_parsed_files (
  raw_file_id bigint primary key references public.raw_files (id),
  raw_sha256 text not null,
  parser_version integer not null
);

alter table public.health_parsed_files enable row level security;

revoke all on public.health_parsed_files from anon, authenticated;
grant select on public.health_parsed_files to authenticated;
grant all on public.health_parsed_files to service_role;

create policy "signed-in owner reads health parse log" on public.health_parsed_files
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
