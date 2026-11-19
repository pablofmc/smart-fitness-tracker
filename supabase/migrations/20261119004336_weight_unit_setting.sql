-- #66: each person picks kg or lb for showing and typing weights. Weights stay stored in kg.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
grant select on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

-- Reads like every other table; writes go through a Server Action with the secret key.
create policy "owner reads own rows" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- #65 and #66: a weight typed in lb (or a dumbbell like 21,25 kg) needs more than one decimal in kg,
-- or switching units drifts: 135 lb = 61.235 kg, stored as 61.2, would come back as 134.9 lb.
alter table public.logged_sets alter column weight_kg type numeric(7, 3);
alter table public.checkins alter column weight_kg type numeric(7, 3);
alter table public.routine_exercises alter column target_kg type numeric(7, 3);
