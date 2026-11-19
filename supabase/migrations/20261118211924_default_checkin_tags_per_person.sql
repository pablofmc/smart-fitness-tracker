-- The five predefined check-in tags were seeded before there was a second person (ADR-0007), so only the
-- first account has them. Give them to every account that has no tags yet. New accounts get them from
-- scripts/create-account.mjs.
insert into public.checkin_tags (user_id, name)
select u.id, t.name
from auth.users u
cross join (values ('Alcohol'), ('Café tarde'), ('Enfermo'), ('Viaje'), ('Estrés trabajo')) as t (name)
where not exists (select 1 from public.checkin_tags c where c.user_id = u.id)
on conflict do nothing;
