# Umbrella Platform — Seed Notes

Scratch space for the multi-tenant platform being incubated above EFD.

**Context:** EFD is being extended into a multi-tenant platform (umbrella co. → tenants: EFD as tenant 0, plus stores / independent artisans / partners). Anything scoped bigger than one shop's workflow belongs here rather than in EFD proper.

This folder is not the final home for those docs — it exists so we stop losing platform-level thinking to design-chat threads while the umbrella app doesn't have its own repo yet. When the umbrella repo is created, everything here migrates over.

## What lives here

- **Seeds** — patterns / code shapes discovered inside EFD that are actually platform primitives. Save the shape before EFD-only code is deleted.
- **Concepts** — cross-tenant primitives (partner entity, peer job board, shared marketplace, tenant billing, etc.) that keep surfacing in product conversations.

## What does *not* live here

- EFD-only features → `docs/` root.
- Manufacturing / production pipeline docs → `docs/manufacturing/`.
- Anything tenant-scoped that already has a home in EFD.

## Current entries

- [peer-request-produce.md](./peer-request-produce.md) — the gemstone → Design → Piece produce action from the deprecated `designRequests` lane. Saved before removal (task 8, commit `0603f60`). Reusable shape for peer / partner customs on the future job board.

## Related design threads

- `6a501ae5267684453cb021f1` — Define: what is a Design Request? (decision: scrap in EFD, revisit in umbrella)
