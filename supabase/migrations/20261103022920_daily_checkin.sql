-- The 10-second daily check-in (R-CHK-01): how I feel, tags, weight and a note, one row per local day.

create table public.checkin_tags (
  name text primary key check (length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

insert into public.checkin_tags (name) values ('Alcohol'), ('Café tarde'), ('Enfermo'), ('Viaje'), ('Estrés trabajo');

create table public.checkins (
  day date primary key,
  feel smallint check (feel between 1 and 5),
  tags text[] not null default '{}',
  weight_kg numeric(5, 1) check (weight_kg between 20 and 300),
  note text check (length(note) <= 500),
  updated_at timestamptz not null default now()
);

comment on column public.checkins.tags is 'Tag names as chosen that day; a tag deleted later stays in past check-ins.';

alter table public.checkin_tags enable row level security;
alter table public.checkins enable row level security;

revoke all on public.checkin_tags, public.checkins from anon, authenticated;
grant select on public.checkin_tags, public.checkins to authenticated;
grant all on public.checkin_tags, public.checkins to service_role;

create policy "signed-in owner reads check-in tags" on public.checkin_tags
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads check-ins" on public.checkins
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);
