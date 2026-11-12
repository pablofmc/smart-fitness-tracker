-- Each sync run serves one person, the one who waited longest (ADR-0007). With two people, a run every
-- 15 minutes keeps each of us syncing about every 30, as before (ADR-0002). Scheduling a job with an
-- existing name replaces it.
select cron.schedule(
  'garmin-sync',
  '*/15 * * * *',
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
