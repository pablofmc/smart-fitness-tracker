-- Owner on every row (ADR-0007, R-USR-01, #57). Every table gets user_id, backfilled to the one account
-- that exists today, and every policy checks it. A child row's owner must equal its parent's: composite
-- foreign keys on (id, user_id) make that a database rule, so admin code that bypasses RLS still can't
-- link one person's row to the other person's.

-- 1. The column, backfilled to the existing account.
do $$
declare
  owner_id uuid;
  owners int;
  t text;
  tables text[] := array[
    'raw_files', 'sync_runs', 'sync_cursors', 'garmin_key', 'activities', 'health_days', 'health_parsed_files',
    'hr_settings', 'activity_loads', 'run_metrics', 'strength_sessions', 'checkin_tags', 'checkins',
    'shoe_models', 'shoes', 'shoe_runs', 'routines', 'routine_exercises', 'routine_reads',
    'logged_sessions', 'logged_sets'
  ];
begin
  select count(*) into owners from auth.users;
  if owners > 1 then
    raise exception 'Expected at most one account before this migration, found %', owners;
  end if;
  select id into owner_id from auth.users;

  foreach t in array tables loop
    execute format('alter table public.%I add column user_id uuid references auth.users (id) on delete cascade', t);
    execute format('update public.%I set user_id = $1', t) using owner_id;
    execute format('alter table public.%I alter column user_id set default auth.uid(), alter column user_id set not null', t);
  end loop;
end $$;

-- 2. Keys that were unique for one person become unique per person.
alter table public.raw_files drop constraint raw_files_kind_source_key_key,
  add constraint raw_files_user_kind_source_key_key unique (user_id, kind, source_key);
alter table public.sync_cursors drop constraint sync_cursors_pkey, add primary key (user_id, stream);
alter table public.garmin_key drop constraint garmin_key_pkey, drop column id, add primary key (user_id);
comment on table public.garmin_key is
  'One row per person. blocked_at is set when Garmin rejects the key, and cleared when a new key is saved.';
alter table public.health_days drop constraint health_days_pkey, add primary key (user_id, kind, day);
alter table public.hr_settings drop constraint hr_settings_effective_from_key,
  add constraint hr_settings_user_effective_from_key unique (user_id, effective_from);
alter table public.checkin_tags drop constraint checkin_tags_pkey, add primary key (user_id, name);
alter table public.checkins drop constraint checkins_pkey, add primary key (user_id, day);

drop index public.shoe_models_name_key;
create unique index shoe_models_name_key on public.shoe_models (user_id, lower(brand), lower(model), lower(coalesce(version, '')));
drop index public.shoes_one_default;
create unique index shoes_one_default on public.shoes (user_id) where is_default;

-- 3. A child row belongs to the same person as its parent.
alter table public.raw_files add constraint raw_files_id_user_key unique (id, user_id);
alter table public.activities add constraint activities_id_user_key unique (id, user_id);
alter table public.hr_settings add constraint hr_settings_id_user_key unique (id, user_id);
alter table public.shoes add constraint shoes_id_user_key unique (id, user_id);
alter table public.routines add constraint routines_id_user_key unique (id, user_id);
alter table public.logged_sessions add constraint logged_sessions_id_user_key unique (id, user_id);

-- One row per activity in these tables. Keys on (activity_id, user_id) match the foreign keys below, so
-- the API still embeds them as a single object, not a list.
alter table public.activity_loads add constraint activity_loads_activity_user_key unique (activity_id, user_id);
alter table public.run_metrics add constraint run_metrics_activity_user_key unique (activity_id, user_id);
alter table public.strength_sessions add constraint strength_sessions_activity_user_key unique (activity_id, user_id);

alter table public.activities drop constraint activities_raw_file_id_fkey,
  add constraint activities_raw_file_fkey foreign key (raw_file_id, user_id) references public.raw_files (id, user_id);
alter table public.health_days drop constraint health_days_raw_file_id_fkey,
  add constraint health_days_raw_file_fkey foreign key (raw_file_id, user_id) references public.raw_files (id, user_id);
alter table public.health_parsed_files drop constraint health_parsed_files_raw_file_id_fkey,
  add constraint health_parsed_files_raw_file_fkey foreign key (raw_file_id, user_id) references public.raw_files (id, user_id);

alter table public.activity_loads drop constraint activity_loads_activity_id_fkey,
  add constraint activity_loads_activity_fkey foreign key (activity_id, user_id) references public.activities (id, user_id) on delete cascade,
  drop constraint activity_loads_hr_settings_id_fkey,
  add constraint activity_loads_hr_settings_fkey foreign key (hr_settings_id, user_id) references public.hr_settings (id, user_id);
alter table public.run_metrics drop constraint run_metrics_activity_id_fkey,
  add constraint run_metrics_activity_fkey foreign key (activity_id, user_id) references public.activities (id, user_id) on delete cascade,
  drop constraint run_metrics_hr_settings_id_fkey,
  add constraint run_metrics_hr_settings_fkey foreign key (hr_settings_id, user_id) references public.hr_settings (id, user_id);
alter table public.strength_sessions drop constraint strength_sessions_activity_id_fkey,
  add constraint strength_sessions_activity_fkey foreign key (activity_id, user_id) references public.activities (id, user_id) on delete cascade;

alter table public.shoe_runs drop constraint shoe_runs_shoe_id_fkey,
  add constraint shoe_runs_shoe_fkey foreign key (shoe_id, user_id) references public.shoes (id, user_id) on delete set null (shoe_id);
alter table public.routine_exercises drop constraint routine_exercises_routine_id_fkey,
  add constraint routine_exercises_routine_fkey foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade;
alter table public.routine_reads drop constraint routine_reads_routine_id_fkey,
  add constraint routine_reads_routine_fkey foreign key (routine_id, user_id) references public.routines (id, user_id) on delete set null (routine_id);
alter table public.logged_sessions drop constraint logged_sessions_routine_id_fkey,
  add constraint logged_sessions_routine_fkey foreign key (routine_id, user_id) references public.routines (id, user_id) on delete set null (routine_id);
alter table public.logged_sets drop constraint logged_sets_session_id_fkey,
  add constraint logged_sets_session_fkey foreign key (session_id, user_id) references public.logged_sessions (id, user_id) on delete cascade;

-- 4. Indexes: the screens read one person's rows, newest first.
drop index public.activities_local_day_idx;
create index activities_user_local_day_idx on public.activities (user_id, local_day desc);
drop index public.health_days_day_idx;
create index health_days_user_day_idx on public.health_days (user_id, day desc);
drop index public.logged_sessions_local_day_idx;
create index logged_sessions_user_local_day_idx on public.logged_sessions (user_id, local_day desc);
drop index public.sync_runs_started_at_idx;
create index sync_runs_user_started_at_idx on public.sync_runs (user_id, started_at desc);
drop index public.routine_reads_created_at_idx;
create index routine_reads_user_created_at_idx on public.routine_reads (user_id, created_at desc);
create index health_parsed_files_user_idx on public.health_parsed_files (user_id);
create index activity_loads_user_idx on public.activity_loads (user_id);
create index run_metrics_user_idx on public.run_metrics (user_id);
create index strength_sessions_user_idx on public.strength_sessions (user_id);
create index shoe_runs_user_idx on public.shoe_runs (user_id);
create index routine_exercises_user_idx on public.routine_exercises (user_id);
create index logged_sets_user_idx on public.logged_sets (user_id);
-- raw_files, shoes, routines and the tables keyed by user_id first are covered by the keys above.

-- 5. Policies: each person reads only their own rows. Writes still go through the secret key (Server
-- Actions and the sync), except adding HR settings.
do $$
declare
  p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' and policyname like 'signed-in owner %' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  for p in select tablename from pg_tables where schemaname = 'public' and tablename <> 'garmin_key' loop
    execute format('create policy "owner reads own rows" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', p.tablename);
  end loop;
end $$;

create policy "owner adds own hr settings" on public.hr_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Raw files: the path no longer says whose a file is (files archived before this migration keep their
-- paths), so ownership comes from the archive index.
drop policy "signed-in owner downloads raw files" on storage.objects;
create policy "owner downloads own raw files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'raw'
    and exists (select 1 from public.raw_files r where r.storage_path = name and r.user_id = (select auth.uid()))
  );
