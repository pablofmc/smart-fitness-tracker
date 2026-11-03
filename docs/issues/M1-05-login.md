---
title: Password login with sign-ups off
milestone: M1 Foundations
labels: area:security,area:ui
status: done
---

**Requirements:** R-SEC-01

Login screen from the canvas (`C2-Login`), sign-out in Ajustes, and a proxy that sends signed-out visitors to `/login`. See ADR-0001.

**Done when:**
- [x] Signed-out visitors reach only `/login`
- [x] A wrong password shows "Correo o contraseña incorrectos."
- [x] Sign-up attempts are rejected
