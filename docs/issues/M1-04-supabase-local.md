---
title: Supabase project config, migrations and RLS guard
milestone: M1 Foundations
labels: area:security,area:data
status: done
---

**Requirements:** R-SEC-02

Supabase CLI config in the repo, local stack on its own ports, and a database test that fails for any public table without RLS.

**Done when:**
- [x] `pnpm test:db` passes against the local stack
- [x] A public table without RLS makes the test fail
