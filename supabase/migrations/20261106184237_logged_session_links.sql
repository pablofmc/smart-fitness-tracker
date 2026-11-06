-- A logged session linked to the Garmin strength activity it happened in (R-STR-09, #52).
-- No foreign key to activities: the parser may empty and rebuild them (ADR-0003, ADR-0005), and the
-- link must survive that. Garmin activity ids are stable.
alter table public.logged_sessions
  add column activity_id bigint,
  -- 'sync' when the sync found exactly one overlapping activity, 'manual' when I picked it.
  add column link_source text check (link_source in ('sync', 'manual')),
  add constraint logged_sessions_link_check check ((activity_id is null) = (link_source is null));

create index logged_sessions_activity_id_idx on public.logged_sessions (activity_id);
