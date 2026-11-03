# One user, on Garmin's Personal API tier

The app serves exactly one person: me. It reads my data with a Garmin Personal API key, which is free and read-only, and which (per secondary sources, see `docs/garmin-api.md`) may not be used to serve other people. So the tables have no `user_id`. RLS policies only require a real session (role `authenticated`, not anonymous) and don't filter rows by owner. Access is controlled in Supabase Auth: email and password login, with sign-ups turned off after my account is created (R-SEC-01, R-SEC-02).

## Considered options

- **`user_id` on every row, with per-owner policies:** we dropped this because it adds a column, an index and a policy clause to every table, and a second user would also need OAuth and a different Garmin tier anyway. If the app is ever offered to others, that migration happens together with the tier change, and this ADR is superseded.
- **Magic-link login:** we dropped this because it depends on Supabase's built-in email sending, which has a very low limit on the free plan and could lock me out. A password needs no email.
- **Garmin's Startup/commercial tier with OAuth:** this is the route for serving other users. It isn't needed for one person, and its terms and cost are unknown (R-OPS-02).

## Consequences

- Any account that exists in Auth can see and change everything. Keeping sign-ups disabled in the Supabase dashboard is part of security, not a configuration detail. The Email provider stays on, since turning it off also blocks password login.
- Pushing workouts to the watch is out of scope, because the tier is read-only (R-WONT-01).
