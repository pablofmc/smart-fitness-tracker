-- pg_cron is the clock for sync: every 30 minutes it calls the sync route (ADR-0002).
-- The URL and shared secret live in Vault as sync_url and sync_secret, and are set per environment.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'garmin-sync',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := url.decrypted_secret,
      headers := jsonb_build_object('Authorization', 'Bearer ' || secret.decrypted_secret),
      timeout_milliseconds := 295000
    )
    from vault.decrypted_secrets url, vault.decrypted_secrets secret
    where url.name = 'sync_url' and secret.name = 'sync_secret';
  $$
);
