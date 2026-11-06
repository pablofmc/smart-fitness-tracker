-- Which shoe each run used (R-GEAR-03, #48).
-- Kept apart from activities, with no foreign key to them, because the parser may empty and
-- rebuild activities (ADR-0003, ADR-0005) and an assignment must survive that.
-- A row with a null shoe means "decided: no shoe", so the sync never assigns that run again.

create table public.shoe_runs (
  activity_id bigint primary key,
  shoe_id bigint references public.shoes (id) on delete set null,
  -- 'sync' when the default shoe took the run, 'manual' when I picked it in the run detail.
  source text not null check (source in ('sync', 'manual')),
  updated_at timestamptz not null default now()
);

create index shoe_runs_shoe_id_idx on public.shoe_runs (shoe_id);

alter table public.shoe_runs enable row level security;

revoke all on public.shoe_runs from anon, authenticated;
grant select on public.shoe_runs to authenticated;
grant all on public.shoe_runs to service_role;

create policy "signed-in owner reads shoe runs" on public.shoe_runs
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

-- Km per shoe (R-GEAR-04): initial km plus the distance of its runs. Runs as the caller, so
-- the RLS on the tables underneath applies.
create view public.shoe_totals with (security_invoker = true) as
select
  s.id as shoe_id,
  round(s.initial_km + coalesce(sum(a.distance_m), 0)::numeric / 1000, 1) as km,
  count(a.id)::integer as runs
from public.shoes s
left join public.shoe_runs r on r.shoe_id = s.id
left join public.activities a on a.id = r.activity_id
group by s.id;

revoke all on public.shoe_totals from anon, authenticated;
grant select on public.shoe_totals to authenticated, service_role;
