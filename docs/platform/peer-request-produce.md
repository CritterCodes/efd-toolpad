# Peer Design-Request → Produce (reference)

**Status:** reference / archive. The route documented here was retired from EFD in task #24 (design thread `6a501ae5267684453cb021f1`). Preserved because the shape is the right one for peer/partner customs on the future platform job board.

## Why keep this

Task 8 (commit `0603f60`) migrated the legacy `designRequests` produce action onto the production engine using a strangler-fig: the old collection stays, the new action calls `createPieceFromDesign` and threads the gemstone end-to-end. Once wholesalers / independent artisans get a real job board in the umbrella platform, "submitter fills a spec → someone claims → produce spawns a Piece with routed work orders" is exactly the flow. Don't re-derive it.

## The shape (peer → produce)

Trigger: any authenticated shop user hits `POST /api/design-requests/:id/produce` on a request in `in_progress`.

1. **Resolve or mint a Design.** Look for a Design already linked to the request (`requestId`), then fall back to gemstone match (`gemstoneId`), else mint a stub Design with status `APPROVED_FOR_PRODUCTION` using the request's requirements/gemstone/assignee.
2. **Spawn the Piece.** `createPieceFromDesign(design.designID, { gemstoneId, createdBy })` — the production engine handles Piece creation + work-order routing.
3. **Close the request.** Mark `designRequests` row `completed`, backfill `pieceID` + `designID`, stamp `completedAt`.
4. **Flip the stone.** On the linked `products` row (the gemstone): `needsCustomDesign: false`, `hasCustomDesign: true`, `pieceId`, `updatedAt`.

## Source at time of archive

`src/app/api/design-requests/[requestId]/produce/route.js` — removed in task #24 (branch `ops/admin-task24`); see git history at commit `0603f60` for the produce shape.

## Platform notes

When this ports to the umbrella:

- **Submitter is a tenant user, not a shop-internal user.** The current auth check just needs a session — swap that for a tenant-scoped identity.
- **Receiver is any qualified artisan on the job board.** The current `assignedTo` field maps to whoever claimed; keep as nullable so open/claimed/assigned tri-state works.
- **`gemstoneId` becomes optional.** Peer requests can be stone-anchored (gem cutter) OR spec-only (jeweler submitting sketches). If null, skip step 4 and let the Design carry the spec.
- **`sourceType` on the umbrella record.** Distinguish client / store / independent submitter for reporting; the produce action is source-agnostic.
- **Reject / won't-do path** — never landed in EFD; add on the umbrella so an unfulfillable stone/spec doesn't sit in the board forever.
- **Trade rates** — partner-level attribute (rate card lives on the tenant/partner entity), not per-request.

## Removals in EFD (task #24)

Deleted:

- `src/app/api/design-requests/route.js` + `[requestId]/{claim,complete,produce}`
- `src/app/dashboard/design-requests/*` (page, components)
- `src/hooks/requests/useDesignRequests.js`
- `designRequests` sections stripped from `docs/manufacturing/data-model.md`, `APP_SURFACE_MAP.md`, `PRODUCTION_PIPELINE_VISION.md`, `CAD_REQUEST_REIMAGINING.md`
- `designRequests` collection: check prod — archive if non-empty, then drop.
