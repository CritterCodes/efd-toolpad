# Navigation & Page Fates

How the nav (in `src/lib/navigation/`) evolves across S0–S7, and what happens to each existing
view. Status: 🆕 new · ♻️ reworked · ➡️ renamed · ⛔ removed/absorbed.

---

## Owner / Admin nav (after the build)

```
Dashboard

WORKSHOP                 ➡️ (was "Repair Work" — now all sources, discipline-gated)
  My Bench               ♻️ unified + lane-gated                                   [S0]
  Shop Board             🆕 admin all-lanes view                                   [S0]
  Labor Review           ♻️ spans repairs + production + customs + cad             [S0]
  Payment & Pickup
  Leads

COMMERCE
  Sales Invoices / POS
  Products               ♻️ primary catalog workspace                              [S5/PP]
    Catalog              all sellable listings and contextual Design/Piece links
    Drops                release workspaces; Drop detail owns Designs/Pieces tabs
    Collections          smart/manual merchandising rules
    Gemstones            loose-stone catalog
  Customs                ➡️ was "Custom Tickets"; rebuilt on Design+Piece engine   [S7]
  Clients

PRODUCTION
  Casting                shared custom + production casting queue                  [PP]

MARKETPLACE              🆕                                                          [S6]
  Artisan Listings
  Fee Schedule           (service-pillar rates — values set later)
  Artisan Agreements

FINANCE & ANALYTICS
  Finance                (Overview, Expenses, Payroll, Owner Draws, Tax Reserve, Stuller)
       └ Inventory       ⛔ removed (old inventory data dropped; materials-inventory parked)
  Analytics
  Vote Campaign

ADMINISTRATION
  User Management · Tasks (Processes/Tools/Materials) · Affiliates
  Wholesale Acquisition · Blog · Admin Settings
```

**Consolidation:** Payroll currently appears twice (Administration + Finance). It becomes **one**
unified payroll once labor + owner draws + artisan payouts share the system.

---

## Page fates — the two key ones

### CAD Requests page → ⛔ absorbed & retired
A CAD request is an internal Design workflow, not a separate customer/domain record. It splits into:
- the **work** → a `discipline: cad` work order on a CAD Designer's **My Bench** (and admin Shop Board)
- the **artifact** → revisioned STL/GLB/mesh-map assets on the **Design**

The Design is created/edited on a full page reached from its Drop or Catalog context. `Request CAD`
accepts sketches/references and a proper brief, then assigns a named CAD artisan or the open queue.
No bespoke CAD-request collection or top-level Designs page remains.

### Custom Tickets page → ➡️ becomes "Customs" (renamed, rebuilt, non-breaking)
A custom is a **customer order** and needs a persistent home (financials, status, comms, customer).
It stays as **Commerce › Customs**, rebuilt so a Custom = customer + Design + Piece(s) + billing.
**Every current function must persist** (S7 is audit-first). *(Sprint: S7.)*

### How they relate
```
Custom (customer order ─ Commerce › Customs)
 ├─ Design ─ WO discipline:cad        → CAD Designer's bench   ← this *was* a "CAD request"
 └─ Piece  ─ WO discipline:bench_jewelry → Jeweler's bench
           ─ WO discipline:engraving     → Engraver's bench
```
A CAD request was always just a task *inside* a larger order — hence the page is redundant while
Customs is essential.

---

## Artisan nav — varies by discipline (lane-gating)

Same "My Bench" item, different work per artisan; off-lane work is fully hidden, enforced server-side.

| Artisan type | My Bench shows | Other items |
|---|---|---|
| **Jeweler** (e.g. Vernon) | repairs, production finishing, stone-setting, sale resizes | My Work, Payroll |
| **CAD Designer** | CAD/design work orders | My Designs, Payroll |
| **Hand Engraver** | engraving work orders | My Work, Payroll |
| **Gem Cutter** | lapidary work orders | My Work, Payroll |
| **Offsite / marketplace seller** | *(no bench)* | My Listings, Payouts, later: Minisite |

---

## Net change summary

- 🆕 **New:** Products (Catalog/Drops/Collections/Gemstones), Production (Casting), Shop Board,
  Marketplace (Listings/Fee Schedule/Agreements), artisan Payouts.
- ♻️ **Reworked:** My Bench (unified + gated), Products, Labor Review, Payroll (consolidated).
- ➡️ **Renamed:** Repair Work → Workshop; Custom Tickets → Customs.
- ⛔ **Removed/absorbed:** top-level Designs/Pieces pages, CAD Requests page, the "Requests" group,
  Finance › Inventory.

## Workflow page rule

Create/edit Drop, Collection, Design, Piece, and Product workflows are standalone pages. Designs and
Pieces remain real entities but are managed from Drop detail tabs/grids or contextual Catalog links.
Use dialogs only for confirmation and short atomic actions, never for primary create/edit forms.
