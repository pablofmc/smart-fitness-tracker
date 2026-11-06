-- Strength routine library (R-STR-07, #50). Writes go through Server Actions with the admin client.

create table public.routines (
  id bigint generated always as identity primary key,
  name text not null check (length(name) between 1 and 80),
  -- Path in the private routine-files bucket; null when the routine was typed without a file.
  file_path text check (length(file_path) between 1 and 200),
  file_type text check (file_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((file_path is null) = (file_type is null))
);

create table public.routine_exercises (
  routine_id bigint not null references public.routines (id) on delete cascade,
  position smallint not null check (position >= 0),
  name text not null check (length(name) between 1 and 80),
  -- The strength module's exercise key (FIT category, e.g. "squat"); null for exercises typed by hand.
  category text check (length(category) between 1 and 40),
  target_sets smallint check (target_sets between 1 and 20),
  -- Text, because routines write "8–10" or "45 s" as often as a number.
  target_reps text check (length(target_reps) between 1 and 20),
  target_kg numeric(5, 1) check (target_kg between 0 and 999),
  primary key (routine_id, position)
);

-- One row per AI read (ADR-0006), so Ajustes can show this month's count and spending stays visible.
create table public.routine_reads (
  id bigint generated always as identity primary key,
  routine_id bigint references public.routines (id) on delete set null,
  succeeded boolean not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index routine_reads_created_at_idx on public.routine_reads (created_at desc);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_reads enable row level security;

revoke all on public.routines, public.routine_exercises, public.routine_reads from anon, authenticated;
grant select on public.routines, public.routine_exercises, public.routine_reads to authenticated;
grant all on public.routines, public.routine_exercises, public.routine_reads to service_role;

create policy "signed-in owner reads routines" on public.routines
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads routine exercises" on public.routine_exercises
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads routine reads" on public.routine_reads
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

-- The routine photos and PDFs as uploaded. Private: only the service role reads and writes them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('routine-files', 'routine-files', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
