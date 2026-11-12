# Two people, one deployment, each with their own Garmin key

The owner's spouse uses the same app. Each person creates their own Garmin Personal API key and pastes it in Ajustes, and each sees only their own data (R-USR-01, R-USR-02). On 2026-11-04 the owner read Garmin's Personal API Supplemental Terms (#9, summary in `docs/garmin-api.md`): the key is for personal-use tools and must never be shared, and they say nothing about a second person. Each key is still used only for its holder's own data, but one app serving two people is a grey zone. The owner accepted the worst case, which is Garmin revoking her key.

So every owned table gets a `user_id` and every RLS policy checks `(select auth.uid()) = user_id`. New Storage objects go under `<user_id>/…`. Files archived before this ADR keep their paths, because moving thousands of objects buys nothing: the raw bucket's policy checks ownership through `raw_files`, and the private photo and routine buckets are reached only through Server Actions that check the owning row. Each person has their own key row, sync cursors, run log, HR settings and time zone. Accounts are created only by the owner with a script (R-USR-03). This supersedes ADR-0001.

## Considered options

- **Each person runs their own copy** (own free Supabase and Vercel projects, own key): clearly allowed by the terms, and no code changes. But she would need her own Supabase, Vercel and GitHub accounts, and every change would be deployed twice.
- **Garmin's Starter tier with OAuth:** the intended route for serving other people. It needs Garmin's approval, it's push only, and it gives no history, so she would lose her past data.
- **A shared login that shows both people's data:** no isolation, and every metric would mix two bodies.

## Consequences

- **The admin client must always filter.** Sync, derived jobs and Server Actions use the secret key, which bypasses RLS, so each of them takes an explicit user id and filters and writes by it. RLS protects reads made through the session, but it can't catch a missing filter in admin code. pgTAP tests use two users on every table.
- **One person per sync run (amends ADR-0002).** `pg_cron` calls the sync route every 15 minutes, and each run syncs the user whose last run is oldest. Each person still syncs about every 30 minutes, and runs never overlap, so the call rate to Garmin stays at about 1 per second whether the limit is per key or per IP. A blocked or expired key skips that person only. Her first history load takes about two days instead of one, because she gets every other run.
- **Shared and per-person data.** The curated shoe catalog is shared and read-only. Everything else is per person, including models typed by hand, routines and check-in tags. Nothing is combined across people.
- **AI reads are capped** at 30 per person per calendar month (R-USR-04). Both people use the owner's Anthropic key (ADR-0006), so the cap bounds what one account can spend.
- **Sign-ups stay disabled** in Supabase Auth. An account exists only because the owner's script created it, with a temporary password marked in `app_metadata` (never `user_metadata`, which the user can edit). The app asks for a new password until it's changed.
- **A child row has its parent's owner.** Foreign keys are composite, on `(id, user_id)`, so even admin code can't put her set in my session or her run on my shoe.
- **Garmin activity ids stay primary keys.** An activity belongs to exactly one person's account, so ids never collide across users.
- **More people are out of scope** (R-WONT-02). A third account would work technically, but the terms argument above only covers the household.
