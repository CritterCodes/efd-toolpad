# Customs — the assigned artisan's flow, audited

**2026-10-02. Read from code at `main`, not run.** `efd-database-DEV` holds six `views.check` users and no
custom orders, so nothing here was reproduced against live data; every finding below names the route and the
caller it was read from, so each is checkable in one step. Where something needs a live run to confirm, it
says so.

The question this audits: **a CAD designer is assigned to a custom. What can they actually do?**

`docs/manufacturing/customs-workflow.md` declares the build complete (C1–C8). The spine *is* there —
assignment spawns the work order, STL upload moves it to QC, peer review pays both fees, the GLB stage
exists, labour is gated on QC, COGS rolls up. This audit is about the gaps between that spine and a person
using it.

---

## The short answer to the gemstone question

**There is nowhere to upload a gemstone, so there is nothing to download.**

A commissioned stone (`services/customs/customGemComponent.js`) is created as a gemstone Design + Piece +
`gem_cutting` work order carrying **spec only**: species, cut, cut style, colour label, carat *or* target mm,
tolerance, clarity, treatment, natural/synthetic, cut labour, yield. There is no file field on a gem Design
or a gem Piece — no model, no scan, no photo, no certificate. Searched: `designs/model.js`, `pieces/model.js`,
`customGemComponent.js`.

File upload exists in exactly two places in this whole flow, both on a **work order**:
`files.stl` and `files.glb`, written by `upload-stl` / `upload-glb` and read back by the uploader's own bench
card. Mood-board images are the third upload, and they live on the order.

So if the intent is *"Jacob uploads the cut stone's model and the designer builds the setting around it"*,
**that path does not exist**. It is not broken; it was never built. What to build is a decision, not a fix —
see **Question 1** below.

---

## Four holes, each verified

### 1. The assigned artisan cannot read the stones on their own custom

| | |
|---|---|
| Route | `GET /api/custom-orders/[customID]/stones` |
| Gate | `requireRole(['admin', 'dev'])` |
| Caller | `components/tabs/StoneTab.js:57`, rendered at `[customID]/page.js:359` with **no role gate** |

The Stones tab renders for an assigned artisan and its first fetch returns **403**. The designer building a
setting for a commissioned stone cannot load that stone's species, cut or target size from the custom they
are assigned to.

Worse for the cutter: `PATCH .../stones/[pieceID]` is correctly authorised — admin **or the cutter who owns
the stone** — so a cutter may set their own price, but cannot `GET` the list to find the `pieceID` they would
be setting it on. They can only arrive via their `gem_cutting` bench work order.

**Fix:** `requireCustomsRead(customID)` on the GET, which is the helper already written for exactly this.

### 2. The client-management bonus cannot be earned by anyone

| | |
|---|---|
| Pays | `services/customs/production/billing.js:125` — only if `m.thread === 'client' && m.direction === 'outbound' && m.authorUserID === cad.userID` |
| Route that writes messages | `POST /api/custom-orders/[customID]/communications` |
| Gate | `requireRole(['admin', 'dev'])` |

An artisan **cannot author a message**, so `managedClient` is always `false` for the assigned designer, the
bonus is always `0`, and on completion the order is stamped `clientMgmtBonusAwarded: true` — permanently, and
idempotently, so it cannot be corrected afterwards.

This is a shipped, settings-configurable payout (`clientMgmtBonusPct`, C8, verified live at the time with a
designer-managed order paying 43.75) that **is unreachable by construction**. The C8 verification must have
been performed with an admin session writing the message and the admin's `userID` matching the assignment —
possible in a test, impossible in the shop.

It is also the one place the workflow doc is explicit about intent: *"the assigned designer is expected to
manage the client via comms. If they do, they earn a bonus; if they push the communicating onto admin, no
bonus."* Today the system pushes the communicating onto admin and then declines to pay the bonus for it.

**Fix:** let an assigned artisan POST to the threads. Whether they may post to the **client** thread or only
the **internal** one is **Question 2**.

### 3. The GLB stage sends the artisan to a page that will refuse their save

| | |
|---|---|
| Button | `BenchWorkCard.js:379` — "Assign materials → QC", shown when `isGlbStage && hasFile && customOrderID`, **no admin gate** |
| Goes to | `/dashboard/customs/[customID]/assign-materials` |
| Which saves via | `PUT /api/custom-orders/[customID]/design-model` → `requireRole(['admin', 'dev'])` |

A CAD designer on a GLB work order can upload the GLB (`upload-glb` is `requireAuth` and checks assignment
inside), is then shown a gold primary button by their own bench card, follows it, assigns the materials, and
**the save fails**. The step between "GLB uploaded" and "submit to QC" is closed to the person the button is
for.

**Fix:** allow the assigned artisan on that work order to write the design model, or move the write behind
the work-order action that already authorises them.

### 4. The artisan cannot add a note or a reference image

`POST .../notes` and `POST .../images` are both `requireRole(['admin','dev'])`, while `NotesTab` and
`ImagesTab` render for everyone. A designer who photographs a wax, or wants to record "client approved the
shoulder taper on the phone", has nowhere to put it on the order — they can read both tabs and write to
neither.

This one may be deliberate (`lib/customsPermissions.js`: *"Mutations stay staff-only; artisans act through
their bench work orders"*). It is listed because the **UI does not say so** — the tabs render as though they
are usable. If it stays, the tabs should be read-only for artisans rather than silently failing.

---

## What does work

Worth stating plainly, because the spine is sound and most of this audit is about its edges.

- **Assignment** snapshots the designer's fee, spawns the CAD work order on their bench, and stamps
  `assignmentId` on it so the two can be unpaired. Removing an assignment reverses all three and **cancels**
  rather than deletes a work order that already carries work.
- **Read scoping** is right: `customsListFilter` scopes "My Customs" to `assignments.userID`, and
  `requireCustomsRead` gates the order, its invoices, its communications and its work orders.
- **STL upload** moves the CAD work order to QC and logs **no hourly labour** — CAD is paid the flat design
  fee from the quote, which is the correct distinction from bench work.
- **CAD QC peer review** refuses the author (`cadReview.js:92`), pays the author's design fee and the
  reviewer's `qcReviewFee` as flat-fee labour into piece COGS, and notifies the author that their fee is now
  payable. The refusal is enforced server-side, not just hidden in the UI.
- **Labour gating** on bench work: move-to-QC logs with `pendingQc`, complete-from-QC releases it.
- The artisan's bench card **links through to the custom** (`View Custom`), so the deep link exists.

---

## Not audited yet

- **efd-shop's side** of the client thread and the portal (`/custom-work/portal`). The holes above are all
  admin-side; the client's half needs its own pass.
- **A live run.** Every finding is from reading the route and its caller. The dev database has no custom
  orders to open, which is the same gap that produced the seed-data proposal in `docs/FRICTION-LOG.md`.
- **The money path end to end** — deposit → casting receipt → generated bench work orders → final invoice.
  Read enough to see the shape, not enough to assert it.
- **Multi-item customs** (`items[]`). The doc says supported and rare; nothing here exercised it.

---

## Questions for the owner

### Question 1 — the gemstone file. What is it, and who needs it?

Nothing in the system holds a gemstone as a file. Before building one, the shape matters:

| | What it would be | What it costs |
|---|---|---|
| **A** | **A model on the stone** — an STL/GLB field on the gem Piece, uploaded by whoever has it, downloadable by any artisan assigned to a custom that uses that stone. | The honest version of "design around this stone". Needs an upload surface, a download surface on the CAD bench card, and a decision about who may upload. |
| **B** | **A reference image on the stone** — photo and/or certificate, no 3D. | Much smaller. Covers "what does it look like" but not "design the setting to these dimensions". |
| **C** | **Mood-board images, already built** — put the stone photo on the order instead of on the stone. | Nothing to build, but the file is attached to the order rather than the stone, so it does not follow the stone to another job. |

**Recommendation: A, scoped to the Piece.** The dimensions are the reason this exists — a setting is cut to
the stone, and a photo cannot be measured. Putting it on the Piece rather than the order means the one
commissioned stone carries its own model wherever it is used, which is the same reason the stone got its own
Design and Piece in the first place.

**What I need from you:** is the file a *scan of a finished stone*, or a *target model the cutter works to*?
That changes who uploads it and when — and if it is both, they are two fields, not one.

### Question 2 — may an assigned artisan write to the **client** thread?

The bonus says yes: it pays the designer for managing the client. The route says no. One of them is wrong.

**Recommendation: yes to the client thread, for the assigned CAD designer only, and leave the internal thread
open to any assigned artisan.** That is what the bonus is for, and the alternative — admin relays every
message and the designer never earns it — is the behaviour the bonus was written to discourage.

**If you would rather clients only ever hear from EFD**, then the bonus should be deleted rather than left
unreachable, and the designer's client management recorded some other way.

### Question 3 — should an artisan see the money?

Today an assigned artisan sees every tab: the full quote, the markup, the margin, **every other artisan's fee
snapshot**, and the client's invoices. That follows your 2026-07-22 ruling — *"give artisans full customs
visibility for now"* — but that ruling predates both the assignment fee snapshots and the stone-cutter
pricing, so "full visibility" now includes what another artisan is being paid.

**Recommendation: keep the spec, the production tab and the comms; hide the markup, the margin and other
people's fees.** A designer needs to know what they are being paid and what the piece is; they do not need
the shop's margin, and another artisan's rate is not theirs to read.

**This is the one I would not change without you saying so** — it is your ruling and it is not a bug.
