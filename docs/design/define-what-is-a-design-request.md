# Design: Define — What Is a Design Request?

**Thread:** `6a501ae5267684453cb021f1`
**Status:** Approved / Finalized
**Decision:** Retire `designRequests` from EFD entirely. It is a platform feature, not an EFD-internal one.
**Build task:** `build-define-what-is-a-design-request` (admin, ready)

---

## Overview

This design chat clarified two competing interpretations of `designRequest`, resolved which fit EFD's current scope, and concluded that **neither does** — the concept belongs on the future multi-tenant umbrella platform, not bolted onto EFD in its current sprint.

### What a designRequest *was* (data-model intent)

A `designRequest` is an **internal, gemstone-anchored work request** where someone in the shop (gem cutter, buyer, owner) asks a designer to spec a piece around a specific stone in inventory.

- **Submitter:** any authenticated shop user who owns/edits a gemstone product
- **Receiver:** an internal designer (`assignedTo` user)
- **Required payload:** `gemstoneId` + requirements text + priority + optional due date
- **Produce path:** `designRequest → Design → Piece → work orders` (the strangler-fig action landed in task 8, commit `0603f60`)
- **Statuses:** `pending → in_progress → completed`

### Why it's being retired

During the design conversation the owner expanded the desired scope beyond a narrow internal tool:

1. **Artisan onboarding** — a jeweler bringing sketches + specs to receive CAD/casting has the same structure as a B2C custom order, not an internal request.
2. **Partner/wholesale layer** — stores and independent artisans submitting customs for their own clients need a client-management sub-model, trade pricing, and optional end-client visibility.
3. **Multi-tenant ambition** — every extension needed (partner entities, sourceType routing, artisan client lists, job-board claim model) is a **platform primitive**, not an EFD-solo feature. Building it in EFD before the umbrella split means a full rewrite six months later.

**Owner's call:** finish the current M6 production-pipeline sprint (products live, customs engine solid), then start the multi-tenant umbrella app where designRequests, partner customs, and the job board are first-class from day one.

---

## What To Remove from EFD

### API routes

| File | Action |
|------|--------|
| `src/app/api/design-requests/route.js` | Delete |
| `src/app/api/design-requests/[requestId]/claim/route.js` | Delete |
| `src/app/api/design-requests/[requestId]/complete/route.js` | Delete |
| `src/app/api/design-requests/[requestId]/produce/route.js` | Delete |

### UI surface

| File / symbol | Action |
|---------------|--------|
| `src/app/dashboard/design-requests/page.js` | Delete |
| `src/app/dashboard/design-requests/` (all components) | Delete |
| `useDesignRequests` hook | Delete |
| Nav entry for `/dashboard/design-requests` | Remove |

### Docs

| File | Action |
|------|--------|
| `docs/manufacturing/data-model.md` — designRequests section | Remove section |
| `docs/APP_SURFACE_MAP.md` — designRequests callout | Remove callout |
| `docs/PRODUCTION_PIPELINE_VISION.md` — designRequests callout | Remove callout |
| `docs/CAD_REQUEST_REIMAGINING.md` — designRequests callout | Remove callout |

### Data

Check production `designRequests` collection:
- **If empty:** drop the collection.
- **If non-empty:** archive to a timestamped snapshot collection, then drop.

---

## Platform Seed (preserve, do not delete)

The strangler-fig produce action is the right shape for peer/partner customs on the future job board. It has been documented and saved **before** route deletion:

- `docs/platform/peer-request-produce.md` — full shape, platform notes, field mapping
- `docs/platform/README.md` — explains what belongs in this directory

Both files are committed on the working tree (see task #24 scope). The umbrella app should treat `docs/platform/peer-request-produce.md` as a reference spec when building the marketplace job board.

---

## Acceptance Criteria (for the build/removal task)

- [ ] All four API routes deleted; no 200 response on any `/api/design-requests/*` path
- [ ] `/dashboard/design-requests` returns 404 or redirects to dashboard root
- [ ] `useDesignRequests` hook removed; no import references remain
- [ ] Nav entry gone from sidebar/navigation config
- [ ] `designRequests` sections stripped from the four doc files listed above
- [ ] Production collection archived (if non-empty) or dropped (if empty); confirmed with DB check
- [ ] `docs/platform/peer-request-produce.md` and `docs/platform/README.md` committed in the same PR
- [ ] No TypeScript/lint errors after deletion
- [ ] M6-T2 (old designRequests inbox UI task) marked cancelled in the task board

---

## Mockup

No mockup was built. The design decision is **removal**, not a new UI. The produce-shape reference (`docs/platform/peer-request-produce.md`) serves as the conceptual sketch for the future platform job board.

---

## Related

- Task #24 — "Remove designRequests from EFD; lift produce logic into platform-seed doc"
- `docs/platform/peer-request-produce.md` — produce-action reference for umbrella platform
- Commit `0603f60` — task 8 strangler-fig (last live version of the produce route)
- Design thread `6a501ae5267684453cb021f1` — full conversation record
