-- Raw archive index, sync-run log and resumable cursors (ADR-0002, ADR-0003).
-- The signed-in owner only reads these. Writes come from the sync route with the secret key.

create table public.raw_files (
  id bigint generated always as identity primary key,
  kind text not null,
  source_key text not null,
  storage_path text not null unique,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null,
  fetched_at timestamptz not null default now(),
  unique (kind, source_key)
);

comment on table public.raw_files is
  'One row per archived Garmin payload. kind is free text so a new endpoint needs no migration; source_key is the Garmin activity ID or the calendar day.';

create table public.sync_runs (
  id bigint generated always as identity primary key,
  trigger text not null check (trigger in ('scheduled', 'manual')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'blocked')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_fetched integer not null default 0 check (items_fetched >= 0),
  error text
);

create index sync_runs_started_at_idx on public.sync_runs (started_at desc);

create table public.sync_cursors (
  stream text primary key,
  position text,
  backfill_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.sync_cursors is
  'Where each data stream stopped, so history loads across many short runs (R-SYN-04).';

alter table public.raw_files enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_cursors enable row level security;

revoke all on public.raw_files, public.sync_runs, public.sync_cursors from anon, authenticated;
grant select on public.raw_files, public.sync_runs, public.sync_cursors to authenticated;
grant all on public.raw_files, public.sync_runs, public.sync_cursors to service_role;

-- No owner column: any real session may read (ADR-0001).
create policy "signed-in owner reads raw files" on public.raw_files
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads sync runs" on public.sync_runs
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads sync cursors" on public.sync_cursors
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

insert into storage.buckets (id, name, public)
values ('raw', 'raw', false);

create policy "signed-in owner downloads raw files" on storage.objects
  for select to authenticated
  using (bucket_id = 'raw' and ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
