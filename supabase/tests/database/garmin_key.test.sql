-- R-SEC-03: no browser session can read the Garmin key.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Rolled back with the rest of the test, so a local key survives.
delete from public.garmin_key;
insert into public.garmin_key (api_key, expires_on) values ('test-key', '2030-01-01');

select throws_ok(
  $$ insert into public.garmin_key (api_key, expires_on) values ('second', '2030-01-01') $$,
  '23505', null, 'only one key can exist'
);

set local role anon;
select throws_ok($$ select * from public.garmin_key $$, '42501', null, 'anon cannot read the key');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';
select throws_ok($$ select * from public.garmin_key $$, '42501', null, 'the signed-in owner cannot read the key from the browser');
select throws_ok(
  $$ update public.garmin_key set api_key = 'x' $$,
  '42501', null, 'the signed-in owner cannot change the key from the browser'
);
reset role;

select * from finish();
rollback;
