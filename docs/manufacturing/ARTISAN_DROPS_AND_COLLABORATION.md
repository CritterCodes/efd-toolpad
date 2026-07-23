# Artisan-owned drops & collaborative designs

**Status:** access layer BUILT (PR #23); collaboration money model CAPTURED, decisions parked.
**Owner (2026-07-22):** artisans can create their own drops with collaborative artisans — released
through EFD, but a drop they control. Collaborative designs credit two+ artisans on a piece with
profit sharing; the artisan fulfilling the labor gets the labor wages; the rest ironed out later.

## 1. Artisan-owned drops (built)

The drop model already carried `ownerType: 'efd' | 'artisan'` + `ownerId`; this adds
`collaborators: []` (artisan userIDs) and the access rules (`src/lib/dropPermissions.js`):

| Who | Can |
|---|---|
| **Owner artisan** | create the drop; edit meta/curation/collaborators; add their designs; keep it `draft` |
| **Collaborators** | see the drop; add THEIR OWN designs to it |
| **EFD staff** | everything — and ONLY staff schedule/release/archive or reassign ownership |

Enforced API-side: artisan-created drops are forced to `ownerType:'artisan'`, self-owned, `draft`;
`validateArtisanDropPatch` rejects status/releaseAt/ownership changes with a clear error; an
artisan attaching a design to a drop must be its owner or collaborator. "Released through EFD" is
structural, not a convention.

**Not built yet:** the artisan **My Drops** UI (list/create/curate — same pattern as My Designs);
collaborator management UI; the admin drop page showing owner/collaborators.

## 2. Collaborative designs + profit sharing (captured, parked)

A design in a drop can credit **two or more artisans** (the Design model already has
`primaryArtisanId` + a `collaborators: []` field). The money sketch:

- **Labor wages → whoever fulfills the labor.** Already how the engine works: work orders are
  assigned per discipline and labor credits at QC to the assignee (`laborLogs`). Nothing new.
- **Profit share → split the SELLER side of the sale.** Sales already flow through `salePayouts`
  (gross → consignment rate → payout to `sellerUserID`). Collaboration generalizes that one payout
  into N splits — e.g. `revenueSplit: [{ userId, percent }]` on the design (or piece), applied when
  the sale line lands, after EFD's consignment portion and labor holdbacks.
- **Design fee** (IP royalty) likely follows the same split; the gem/jewelry material streams stay
  with whoever supplied the material (e.g. the cutter's stone: see gemstone money model).

**Decisions to iron out later (parked on purpose):**
1. Where the split lives — design-level default, overridable per piece?
2. Does the split apply to the design fee only, or the whole seller payout?
3. Who may edit the split (owner? all credited artisans must accept?).
4. Rounding/minimums, and how splits appear in payroll batches.
5. Whether a collaborator on a DESIGN must also be a collaborator on the DROP (probably yes).

Related: `salePayouts` engine, `docs/manufacturing/GEMSTONE_DESIGNS_AND_INVENTORY.md` §2b (money),
[[bench-labor-at-qc]] pattern for labor credit.
