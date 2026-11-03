# ADR template

Copy this file to `docs/adr/NNNN-short-slug.md`, using the next number after the highest existing one (`0001`, `0002`, ...). This file is not a decision itself.

Only write an ADR when the decision is all three of these:

1. **Hard to reverse**: changing your mind later would be expensive.
2. **Surprising without context**: someone reading the code later would ask "why did they do it this way?"
3. **The result of a real trade-off**: there were real alternatives and you chose one for specific reasons.

A single paragraph is enough. The point is to record *that* the decision was made and *why*, not to fill in every section.

---

```md
# {Short title of the decision}

{1–3 sentences: the context, what we decided, and why.}
```

Optional sections. Add them only when they're useful:

```md
---
status: proposed | accepted | deprecated | superseded by ADR-NNNN
---

## Considered options

- {Alternative}: {why we didn't pick it}

## Consequences

- {Non-obvious effect this decision has elsewhere}
```
