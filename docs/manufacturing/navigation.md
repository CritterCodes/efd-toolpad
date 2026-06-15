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

PRODUCTION               🆕                                                          [S3–S5]
  Drops                                                                            [S3]
  Designs                (CAD upload + STL → cost estimator)                       [S3]
  Pieces                 (physical instances + COGS + status)                      [S4]

COMMERCE
  Sales Invoices / POS
  Products               ♻️ reimagined (Jewelry, Gemstones, Awaiting Approval)     [S5]
  Customs                ➡️ was "Custom Tickets"; rebuilt on Design+Piece engine   [S7]
  Clients

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
A CAD request is an internal **production task**, not a customer record. It splits into:
- the **work** → a `discipline: cad` work order on a CAD Designer's **My Bench** (and admin Shop Board)
- the **artifact** → a **Design** (`concept`/`cad` status) under **Production › Designs**

No bespoke CAD-request system remains. The salvaged estimator (volume → cost) lives inside Designs.
*(Sprint: S3.)*

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

- 🆕 **New:** Production (Drops/Designs/Pieces), Shop Board, Marketplace (Listings/Fee Schedule/Agreements), artisan Payouts.
- ♻️ **Reworked:** My Bench (unified + gated), Products, Labor Review, Payroll (consolidated).
- ➡️ **Renamed:** Repair Work → Workshop; Custom Tickets → Customs.
- ⛔ **Removed/absorbed:** CAD Requests page, the "Requests" group, Finance › Inventory.
