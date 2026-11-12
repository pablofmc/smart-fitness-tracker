-- R-USR-01, ADR-0007 (#57): with two people, each reads only their own rows and files, keys are unique
-- per person, and a row can never point at the other person's rows.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Me (the local owner from seed.sql) and a second person, created only inside this test.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'second@local.test', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

-- Rows of every person count the same in a table, whoever reads it: "other people's rows I can see".
create function pg_temp.foreign_rows(t text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from public.%I where user_id is distinct from (select auth.uid())', t) into n;
  return n;
end $$;
create function pg_temp.tables_leaking() returns setof text language sql as $$
  select tablename::text from pg_tables
  where schemaname = 'public' and tablename <> 'garmin_key' and pg_temp.foreign_rows(tablename) > 0
$$;

-- A row in the main tables for each person, with the same natural keys.
do $$
declare
  me uuid := '11111111-1111-4111-8111-111111111111';
  her uuid := '55555555-5555-4555-8555-555555555555';
  who uuid;
  raw bigint;
begin
  foreach who in array array[me, her] loop
    insert into public.raw_files (user_id, kind, source_key, storage_path, content_type, size_bytes, sha256)
    values (who, 'test_kind', 'same-key', 'test/' || who || '/a.fit.gz', 'application/gzip', 1, 'x') returning id into raw;
    insert into storage.objects (bucket_id, name) values ('raw', 'test/' || who || '/a.fit.gz');
    insert into public.activities (user_id, id, raw_file_id, raw_sha256, parser_version, sport, local_day, data)
    values (who, case when who = me then 900000000001 else 900000000002 end, raw, 'x', 1, 'running', '2026-11-09', '{}');
    insert into public.health_days (user_id, kind, day, raw_file_id, raw_sha256, parser_version, data)
    values (who, 'test_kind', '1999-01-01', raw, 'x', 1, '{}');
    insert into public.hr_settings (user_id, effective_from, max_hr, resting_hr, lthr) values (who, '1999-01-01', 190, 50, 170);
    insert into public.checkin_tags (user_id, name) values (who, 'test-tag');
    insert into public.checkins (user_id, day) values (who, '1999-01-01');
    insert into public.sync_cursors (user_id, stream) values (who, 'test-stream');
    insert into public.sync_runs (user_id, trigger) values (who, 'manual');
    insert into public.garmin_key (user_id, api_key, expires_on) values (who, 'k', '2030-01-01') on conflict (user_id) do nothing;
    update public.shoes set is_default = false where user_id = who;
    insert into public.shoes (user_id, brand, model, run_types, started_on, is_default) values (who, 'Test', 'Shoe', array['daily'], '2026-11-01', true);
    insert into public.routines (user_id, name) values (who, 'Test routine');
    insert into public.logged_sessions (user_id, id, name, local_day, started_at)
    values (who, case when who = me then '00000000-0000-4000-8000-00000000000a'::uuid else '00000000-0000-4000-8000-00000000000b'::uuid end, 'x', '2026-11-09', now());
  end loop;
end $$;

select pass('both people can hold the same tag, day, cursor, HR date and default shoe');

-- Reading as me.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';
select is_empty($$ select * from pg_temp.tables_leaking() $$, 'I read none of her rows, in any table');
select isnt_empty($$ select 1 from public.activities where id = 900000000001 $$, 'I read my own activity');
select is_empty($$ select 1 from public.activities where id = 900000000002 $$, 'I do not read her activity');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'raw' and name like 'test/%'), 1,
  'I download only my own raw file'
);
select throws_ok(
  $$ insert into public.hr_settings (user_id, effective_from, max_hr, resting_hr, lthr) values ('55555555-5555-4555-8555-555555555555', '1999-02-01', 190, 50, 170) $$,
  '42501', null, 'I cannot add HR settings in her name'
);
select lives_ok(
  $$ insert into public.hr_settings (effective_from, max_hr, resting_hr, lthr) values ('1999-02-01', 190, 50, 170) $$,
  'I can add my own HR settings'
);
select is(
  (select user_id from public.hr_settings where effective_from = '1999-02-01'), '11111111-1111-4111-8111-111111111111'::uuid,
  'a row I add belongs to me without saying so'
);
reset role;

-- Reading as her.
set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","is_anonymous":false}';
select is_empty($$ select * from pg_temp.tables_leaking() $$, 'she reads none of my rows, in any table');
select is((select count(*)::int from public.activities), 1, 'she reads exactly her one activity');
select is((select count(*)::int from public.shoes), 1, 'she reads exactly her one shoe');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'raw'), 1,
  'she downloads only her own raw file'
);
select throws_ok($$ select * from public.garmin_key $$, '42501', null, 'she cannot read any Garmin key from the browser');
reset role;

-- An anonymous session reads nothing, even with rows around.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","is_anonymous":true}';
select is((select count(*)::int from public.activities), 0, 'an anonymous session reads no activities');
reset role;

-- Rows can't point across people, even from admin code that bypasses RLS.
select throws_ok(
  $$ insert into public.activities (user_id, id, raw_file_id, raw_sha256, parser_version, sport, local_day, data)
     values ('55555555-5555-4555-8555-555555555555', 900000000003,
             (select id from public.raw_files where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'test_kind'), 'x', 1, 'running', '2026-11-09', '{}') $$,
  '23503', null, 'her activity cannot come from my raw file'
);
select throws_ok(
  $$ insert into public.logged_sets (user_id, id, session_id, exercise_name, exercise_position, set_number, weight_kg, reps, logged_at)
     values ('55555555-5555-4555-8555-555555555555', gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'x', 0, 1, 10, 5, now()) $$,
  '23503', null, 'her set cannot go into my session'
);
select throws_ok(
  $$ insert into public.shoe_runs (user_id, activity_id, shoe_id, source)
     values ('55555555-5555-4555-8555-555555555555', 900000000002,
             (select id from public.shoes where user_id = '11111111-1111-4111-8111-111111111111' and brand = 'Test'), 'manual') $$,
  '23503', null, 'her run cannot go on my shoe'
);
select throws_ok(
  $$ insert into public.activity_loads (user_id, activity_id, formula_version, unavailable_reason) values ('55555555-5555-4555-8555-555555555555', 900000000001, 1, 'test') $$,
  '23503', null, 'she cannot get a load for my activity'
);
select throws_ok(
  $$ insert into public.routine_exercises (user_id, routine_id, position, name)
     values ('55555555-5555-4555-8555-555555555555', (select id from public.routines where user_id = '11111111-1111-4111-8111-111111111111' and name = 'Test routine'), 0, 'x') $$,
  '23503', null, 'she cannot add exercises to my routine'
);
select throws_ok(
  $$ insert into public.logged_sessions (user_id, id, routine_id, name, local_day, started_at)
     values ('55555555-5555-4555-8555-555555555555', gen_random_uuid(), (select id from public.routines where user_id = '11111111-1111-4111-8111-111111111111' and name = 'Test routine'), 'x', '2026-11-09', now()) $$,
  '23503', null, 'her session cannot follow my routine'
);
select lives_ok(
  $$ insert into public.shoe_runs (user_id, activity_id, shoe_id, source)
     values ('55555555-5555-4555-8555-555555555555', 900000000002,
             (select id from public.shoes where user_id = '55555555-5555-4555-8555-555555555555'), 'manual') $$,
  'her run can go on her own shoe'
);

-- Admin code must name the owner: nothing defaults it without a session.
set local request.jwt.claims = '';
select throws_ok(
  $$ insert into public.sync_runs (trigger) values ('scheduled') $$,
  '23502', null, 'a row written without a session must say whose it is'
);

-- Keys are unique per person, not across people.
select throws_ok(
  $$ insert into public.checkin_tags (user_id, name) values ('55555555-5555-4555-8555-555555555555', 'test-tag') $$,
  '23505', null, 'she cannot have the same tag twice'
);
select throws_ok(
  $$ insert into public.shoes (user_id, brand, model, run_types, started_on, is_default)
     values ('55555555-5555-4555-8555-555555555555', 'Other', 'Shoe', array['daily'], '2026-11-01', true) $$,
  '23505', null, 'she has at most one default shoe'
);
select throws_ok(
  $$ insert into public.garmin_key (user_id, api_key, expires_on) values ('55555555-5555-4555-8555-555555555555', 'k2', '2030-01-01') $$,
  '23505', null, 'she has at most one Garmin key'
);

select * from finish();
rollback;
