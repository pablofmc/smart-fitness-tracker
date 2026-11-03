# Domain docs

How agents should use this repo's domain documentation.

## Read before exploring

- `GLOSSARY.md` at the repo root.
- `docs/adr/`: the ADRs that touch the area you're about to work in.
- `docs/requirements.md`: the requirement IDs your change serves.

If a file doesn't exist yet, carry on without mentioning it. The `mattpocock-skills:domain-modeling` skill creates the glossary and ADRs when a term or decision actually gets settled. Don't create them up front.

## Use the glossary's words

When you name a domain concept (in code, an issue, a test name), use the glossary's term. If the concept you need isn't there, either you're inventing language (reconsider) or there's a gap (add it through `domain-modeling`).

## Flag conflicts

If your change contradicts an ADR or a requirement, say so explicitly instead of silently overriding it:

> _Contradicts ADR-0002 (pull-only sync), but worth reopening because…_
