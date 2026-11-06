-- Running shoes (R-GEAR-01, R-GEAR-02, R-GEAR-04, #49).
-- The catalog itself lives in code (src/modules/gear/catalog-data.ts); a shoe keeps a copy of
-- its model's fields so later catalog edits never change a shoe already registered.
-- Writes go through Server Actions with the admin client, like the rest of the app.

-- Models I typed by hand, offered again in later searches.
create table public.shoe_models (
  id bigint generated always as identity primary key,
  brand text not null check (length(brand) between 1 and 40),
  model text not null check (length(model) between 1 and 60),
  version text check (length(version) between 1 and 20),
  run_types text[] not null check (
    cardinality(run_types) between 1 and 2
    and run_types <@ array['daily', 'long', 'tempo', 'race', 'stability', 'trail']
  ),
  created_at timestamptz not null default now()
);

create unique index shoe_models_name_key on public.shoe_models (lower(brand), lower(model), lower(coalesce(version, '')));

create table public.shoes (
  id bigint generated always as identity primary key,
  brand text not null check (length(brand) between 1 and 40),
  model text not null check (length(model) between 1 and 60),
  version text check (length(version) between 1 and 20),
  run_types text[] not null check (
    cardinality(run_types) between 1 and 2
    and run_types <@ array['daily', 'long', 'tempo', 'race', 'stability', 'trail']
  ),
  -- Path in the public gear-catalog bucket; null for hand-typed models and catalog entries without one.
  catalog_image text check (catalog_image ~ '^[a-z0-9-]+/[a-z0-9-]+\.webp$'),
  -- Path in the private gear-photos bucket; my own photo wins over the catalog image.
  photo_path text check (length(photo_path) between 1 and 200),
  started_on date not null,
  initial_km numeric(6, 1) not null default 0 check (initial_km >= 0),
  limit_km numeric(6, 1) not null default 700 check (limit_km > 0),
  is_default boolean not null default false,
  retired_on date,
  created_at timestamptz not null default now(),
  check (not (is_default and retired_on is not null))
);

comment on table public.shoes is 'Running shoes. Km = initial_km plus the distance of the runs assigned to the shoe (#48).';

-- At most one default shoe.
create unique index shoes_one_default on public.shoes (is_default) where is_default;

alter table public.shoe_models enable row level security;
alter table public.shoes enable row level security;

revoke all on public.shoe_models, public.shoes from anon, authenticated;
grant select on public.shoe_models, public.shoes to authenticated;
grant all on public.shoe_models, public.shoes to service_role;

create policy "signed-in owner reads hand-typed shoe models" on public.shoe_models
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

create policy "signed-in owner reads shoes" on public.shoes
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous')::boolean is not true);

-- My own shoe photos: private, shrunk in the browser before upload. Only the service role
-- reads and writes them (signed URLs for display): no policies on storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gear-photos', 'gear-photos', false, 307200, array['image/webp', 'image/jpeg']);
