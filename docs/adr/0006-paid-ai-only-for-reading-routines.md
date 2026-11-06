# Reading a strength routine with AI is the one paid exception to $0

The app runs on free tiers (R-OPS-01), with one exception the owner approved on 2026-11-05: when a routine image or PDF is uploaded, Claude Haiku 5.5 (`claude-haiku-5-5`) reads it into a proposed exercise list (R-STR-07). It costs under $0.001 per routine at $0.10 / $0.50 per million input / output tokens, paid from prepaid Anthropic credit (minimum purchase $5). The key lives in `ANTHROPIC_API_KEY` on Vercel, server side only, as in elua-2.0.

## Considered options

- **Type the exercises by hand:** free, but the owner wants uploading a photo of the routine to be enough.
- **Claude Opus 5.5:** about $0.02 per routine, 40× Haiku, for a task Haiku handles.
- **On-device OCR:** free, but turns a table photo into text, not into exercises, sets and reps.

## Consequences

- AI runs only when the owner uploads a routine and asks for it to be read; nothing calls it on a schedule or in the sync.
- The proposed list is always reviewed before it's saved. When the call fails or credit runs out, the routine is saved without a list and filled in by hand.
- Ajustes shows how many routines were read this month, so spending stays visible.
- Any other paid use needs its own ADR.
