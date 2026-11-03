-- The Garmin Personal API key (R-SEC-03, R-SYN-05). Only the server reaches this table, with the
-- secret key. RLS is on with no policies, and browser roles have no grants.
create table public.garmin_key (
  id boolean primary key default true check (id),
  api_key text not null,
  expires_on date not null,
  blocked_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.garmin_key is
  'Single row. blocked_at is set when Garmin rejects the key, and cleared when a new key is saved.';

alter table public.garmin_key enable row level security;

revoke all on public.garmin_key from anon, authenticated;
grant all on public.garmin_key to service_role;
