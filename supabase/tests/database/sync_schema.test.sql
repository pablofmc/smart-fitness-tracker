-- R-SEC-02, R-DAT-01: the owner reads the sync tables and raw bucket; nobody else reaches them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Rows inserted below belong to the local owner (user_id defaults to auth.uid(), ADR-0007).
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';

insert into public.sync_runs (trigger, error) values ('manual', 'test-marker');
insert into public.raw_files (kind, source_key, storage_path, content_type, size_bytes, sha256)
values ('test_kind', '123', 'test_kind/123.fit.gz', 'application/gzip', 10, 'abc');
insert into storage.objects (bucket_id, name) values ('raw', 'test_kind/123.fit.gz');

select throws_ok(
  $$ insert into public.raw_files (kind, source_key, storage_path, content_type, size_bytes, sha256)
     values ('test_kind', '123', 'test_kind/other.fit.gz', 'application/gzip', 10, 'abc') $$,
  '23505', null, 'the same payload cannot be archived twice (R-SYN-06)'
);
select throws_ok(
  $$ insert into public.sync_runs (trigger, status) values ('manual', 'unknown') $$,
  '23514', null, 'a run cannot have an unknown status'
);
select ok(not public, 'the raw bucket is private') from storage.buckets where id = 'raw';

set local role anon;
select throws_ok($$ select * from public.raw_files $$, '42501', null, 'anon cannot read raw_files');
select throws_ok($$ select * from public.sync_runs $$, '42501', null, 'anon cannot read sync_runs');
select throws_ok($$ select * from public.sync_cursors $$, '42501', null, 'anon cannot read sync_cursors');
select is_empty($$ select 1 from storage.objects where bucket_id = 'raw' $$, 'anon sees no raw objects');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}';
select results_eq($$ select count(*) from public.raw_files where kind = 'test_kind' $$, array[1::bigint], 'the owner reads raw_files');
select results_eq($$ select count(*) from public.sync_runs where error = 'test-marker' $$, array[1::bigint], 'the owner reads sync_runs');
select results_eq($$ select count(*) from storage.objects where bucket_id = 'raw' and name = 'test_kind/123.fit.gz' $$, array[1::bigint], 'the owner sees raw objects');
select throws_ok(
  $$ insert into public.sync_runs (trigger) values ('manual') $$,
  '42501', null, 'the browser session cannot write sync runs'
);

set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":true}';
select is_empty($$ select 1 from public.raw_files $$, 'an anonymous session reads nothing');
reset role;

select * from finish();
rollback;
