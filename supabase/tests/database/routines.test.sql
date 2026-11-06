-- #50, #51: only the signed-in owner reads routines and logged sessions, nobody writes them from the browser, and files stay private.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.routines (name) values ('Pierna y core');

select throws_ok(
  $$ insert into public.routines (name, file_path) values ('Sin tipo', 'a.jpg') $$,
  '23514', null, 'a file always comes with its type'
);

set local role anon;
select throws_ok($$ select * from public.routines $$, '42501', null, 'anon cannot read routines');
select throws_ok($$ insert into public.routines (name) values ('x') $$, '42501', null, 'anon cannot add routines');
select throws_ok($$ select * from public.routine_exercises $$, '42501', null, 'anon cannot read routine exercises');
select throws_ok($$ select * from public.routine_reads $$, '42501', null, 'anon cannot read the AI read log');
select is_empty($$ select 1 from storage.objects where bucket_id = 'routine-files' $$, 'anon sees no routine files');
select throws_ok($$ select * from public.logged_sessions $$, '42501', null, 'anon cannot read logged sessions');
select throws_ok($$ select * from public.logged_sets $$, '42501', null, 'anon cannot read logged sets');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":true}';
select is_empty($$ select 1 from public.routines $$, 'an anonymous session reads no routines');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';
select isnt_empty($$ select 1 from public.routines $$, 'the signed-in owner reads routines');
select throws_ok($$ delete from public.routines $$, '42501', null, 'the signed-in owner cannot delete routines from the browser');
select throws_ok(
  $$ insert into public.logged_sessions (id, name, local_day, started_at) values (gen_random_uuid(), 'x', '2026-11-06', now()) $$,
  '42501', null, 'the signed-in owner cannot log sessions from the browser directly'
);
reset role;

select * from finish();
rollback;
