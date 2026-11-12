-- Local development only: `supabase db reset` runs this, production never does.
-- Sign-ups are off (ADR-0007), so local accounts have to be inserted.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner@local.test',
  extensions.crypt('local-dev-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@local.test","email_verified":true}',
  'email', now(), now(), now()
);

-- A second person (ADR-0007), to check locally that each account sees only its own data.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555',
  'authenticated', 'authenticated', 'second@local.test',
  extensions.crypt('local-dev-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555',
  '{"sub":"55555555-5555-4555-8555-555555555555","email":"second@local.test","email_verified":true}',
  'email', now(), now(), now()
);

-- The sync route on the dev server, as seen from the database container. SYNC_SECRET in .env.local must match.
select vault.create_secret('http://host.docker.internal:3100/api/sync', 'sync_url');
select vault.create_secret('local-dev-sync-secret', 'sync_secret');
