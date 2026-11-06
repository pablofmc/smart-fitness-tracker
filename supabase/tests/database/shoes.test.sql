-- #49: only the signed-in owner reads shoes, nobody writes them from the browser, and photos stay private.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Rolled back with the rest of the test, so local shoes survive.
delete from public.shoes;
insert into public.shoes (brand, model, version, run_types, started_on, is_default)
values ('Nike', 'Pegasus', '42', array['daily'], '2026-11-01', true);

select throws_ok(
  $$ insert into public.shoes (brand, model, run_types, started_on, is_default) values ('Asics', 'Novablast', array['daily'], '2026-11-01', true) $$,
  '23505', null, 'only one shoe can be the default'
);
select throws_ok(
  $$ insert into public.shoes (brand, model, run_types, started_on) values ('Asics', 'Novablast', array['daily', 'long', 'tempo'], '2026-11-01') $$,
  '23514', null, 'a shoe has at most two run types'
);
select throws_ok(
  $$ update public.shoes set retired_on = '2026-11-05' where is_default $$,
  '23514', null, 'a retired shoe cannot stay the default, so it takes no new runs'
);

set local role anon;
select throws_ok($$ select * from public.shoes $$, '42501', null, 'anon cannot read shoes');
select throws_ok(
  $$ insert into public.shoes (brand, model, run_types, started_on) values ('x', 'y', array['daily'], '2026-11-01') $$,
  '42501', null, 'anon cannot add shoes'
);
select throws_ok($$ select * from public.shoe_models $$, '42501', null, 'anon cannot read hand-typed models');
select is_empty($$ select 1 from storage.objects where bucket_id = 'gear-photos' $$, 'anon sees no shoe photos');
select throws_ok($$ select * from public.shoe_runs $$, '42501', null, 'anon cannot read which shoe each run used');
select throws_ok($$ select * from public.shoe_totals $$, '42501', null, 'anon cannot read shoe km');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":true}';
select is_empty($$ select 1 from public.shoes $$, 'an anonymous session reads no shoes');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';
select isnt_empty($$ select 1 from public.shoes $$, 'the signed-in owner reads shoes');
select throws_ok(
  $$ update public.shoes set limit_km = 1 $$,
  '42501', null, 'the signed-in owner cannot change shoes from the browser'
);
select throws_ok(
  $$ insert into public.shoe_runs (activity_id, shoe_id, source) values (1, null, 'manual') $$,
  '42501', null, 'the signed-in owner cannot assign runs from the browser'
);
reset role;

select * from finish();
rollback;
