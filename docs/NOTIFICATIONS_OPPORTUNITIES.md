# efd-admin — Notification Opportunities (MASTER LIST — 🔒 LOCKED)

**LOCKED** after 7 cross-check rounds: R1 CHANGES → R2 CONCUR → R3 CHANGES → R4 CHANGES → **R5/R6/R7 CONCUR (3 consecutive)**. Complete + code-verified.


Consolidated from two explorers + handoff doc. Admin is system-of-record post-intake.
**Fires today:** ✅ yes · ⚠️ partial (email-only or admin-only) · ❌ no.
**Recipient:** CUST (customer, shop identity) · ARTISAN (jeweler/designer) · ADMIN (all admins).
Push reaches a recipient only if they have a `pushSubscriptions` row (shared pool, shared VAPID).

Who logs into admin: **admins + artisans/jewelers** → they can subscribe to admin push.
Customers subscribe on the **shop**; admin reaches them via the shared pool + shared VAPID.

> **VERIFIER NOTE:** Section C items marked ❌ are the KNOWN, PLANNED work (that's the point of
> this list) — they are NOT omissions. Before reporting anything as an ADDITION, grep THIS doc for
> the event/keyword; if any A/B/C/D line already covers it, it is NOT an addition. X2 is deliberately
> a single umbrella line (per-transition itemization lives in the implementation plan, not here).
> Rounds 1–3 already confirmed: R1–R10, X1–X10, W1–W5, U1–U5, P1–P2, PR1–PR2, WH1–WH2, T5-1/2 are
> all captured with correct fire-status. Report only things genuinely ABSENT from this doc, or a
> flag/recipient/file:line that is factually wrong.

---
## A. INFRASTRUCTURE (blocks the push half)
- **INF-1** Web Push in admin — `lib/notificationService.js` push channel is a TODO stub (l.94). ❌
- **INF-2** Identity — bell + callers key on `session.user.userID` (string); push subs key same. ✅resolved
- **INF-3** shop→admin alerts use `userId:'admin'` → never hit a real admin bell. ✅ DONE: admin-originated
  alerts use `notifyAllAdmins` (real per-admin docs); shop-originated `userId:'admin'` docs now surface via a
  role-gated broadcast query in `getUserNotifications` (+ tolerant mark-read). Gated to admin/superadmin/dev.
- **INF-4** SW: next-pwa DISABLED by default (`ENABLE_PWA`); ship standalone `public/push-sw.js`. ❌
- **INF-5** `createNotification` should auto-add `push` when `inApp` present (mirror shop). ❌
- **INF-6** Consent: honor `user_preferences` push opt-out for non-transactional (marketing) types. ❌

## B. ALREADY FIRING (baseline — auto-gain push via INF-5; verify recipients only)
- B1 Product approved / rejected / revision-requested → ARTISAN — ✅ (`products/[id]/approve|reject`)
- B2 Product submitted-for-review → ADMIN — ❌ MISFLAGGED: `notifyAdminsProductPending` EXISTS but is NEVER called; `products/[id]/submit/route.js:92` sets 'pending-approval' with no notification → see PR3
- B3 Drop published → all ARTISANs — ✅ · selected / not-selected → ARTISAN — ✅
- B4 Custom invoice created → CUST — ✅ · payment received → CUST — ✅ · 50% threshold → ADMIN — ✅ (`customInvoices.service`)
- B5 Artisan account created (admin) → ARTISAN welcome — ✅ (`users/controller`)
- B6 Artisan application submitted → applicant + ADMIN — ✅ (shop `artisan/apply`)
- B7 Wholesale pickup requested → ADMIN — ✅ (`wholesale/repairs/request-action`)
- B8 Appointments booked/rescheduled/cancelled → CUST+ADMIN — ✅ (SHOP-owned route)
- B9 Contact form submitted → CUST ack + ADMIN — ✅ (SHOP-owned route)
- B10 Custom-order client actions (message/quote-accepted/image/spec) → ADMIN — ⚠️ email-only, `userId:'admin'` (see INF-3)

## C. NEW OPPORTUNITIES TO IMPLEMENT (the actual work)

### C-REPAIRS (admin-owned lifecycle; handoff item #7 = highest customer value)
- R1 Repair lead received → CUST ack + ADMIN alert — ❌ (`api/repairs/route.js` POST ~182)
- R2 Quote generated/sent → CUST — ❌ (repair quote update handler)
- R3 QC pass → repair completed & READY_FOR_PICKUP → CUST (single fire at complete-from-qc) — ❌ (`repairs/[repairID]/complete-from-qc/route.js:23`, `repairWorkflow.js` ~498)
- R4 (MERGED into R3 — same transition; complete-from-qc sets READY_FOR_PICKUP)
- R5 Picked up (closed) → CUST thank-you — ❌ (status→PICKED_UP)  [low priority]
- R6 Waiting for parts / parts ordered → CUST — ❌ (`mark-waiting-parts`, `mark-parts-ordered`) [med]
- R7 Repair assigned/claimed by jeweler → ARTISAN (assignee) — ❌ (`repairs/[id]/claim`)
- R8 Bench handoff → target ARTISAN — ❌ (`benchHandoff.js:88`)
- R9 QC fail (bounced) → assignee ARTISAN — ❌ (`quality-control`)
- R10 Parts-ready-for-work → assignee ARTISAN — ❌ [med]

### C-CUSTOM (admin-owned post-intake; notify CUST back)
- X1 Quote published/ready → CUST — ❌ (custom quote publish; client should know) [HIGH]
- X2 Status change (consultation→design→production→qc→complete→delivered) → CUST — ❌ [HIGH]
- X3 Design/GLB ready for review → CUST — ❌ (`customProduction.js` GLB stage) [HIGH]
- X4 Admin posts message to client thread → CUST — ❌ (explicit TODO `custom-orders/[customID]/communications/route.js:36`; fires nothing today) [HIGH]
- X5 Order completed / delivered → CUST — ❌
- X6 Casting received → production ARTISANs — ❌ (`recordCastingReceived`) [med]
- X7 CAD/GLB WO assigned → designer ARTISAN — ❌ (`spawnCustomWorkOrder:87`)
- X8 Design/GLB submitted → ADMIN + CUST(review) — ❌
- X9 Design/GLB approved/rejected → designer ARTISAN — ❌
- X10 INF-3 inbound alerts (B10) delivered to real admins in_app+push — ❌

### C-BENCH / WORK ORDERS (internal, artisan-facing)
- W1 Piece/CAD WO assigned → ARTISAN — ❌ (`pieceWorkOrderActions`, benchActions)
- W2 WO moved to QC → ADMIN (+artisan) — ❌ [low]
- W3 WO QC pass (labor credited) → ARTISAN — ❌ [med]
- W4 WO QC fail → ARTISAN — ✅ WIRED for the only QC-reject transition that exists: `rejectCadQc` (`wo-qc-failed`). NON-CAD pieces have NO QC-reject action (flow is move-to-qc → complete-from-qc pass only; no `rejectPieceFromQc` exists) — nothing to wire, same category as R2. Do NOT fabricate one.
- W5 WO completed → ADMIN — ❌ [low]

### C-USERS / ONBOARDING
- U1 Artisan application approved → ARTISAN — ❌ (`admin/artisans/[id]` PATCH) [HIGH]
- U2 Artisan application rejected → ARTISAN — ❌ [HIGH]
- U3 Wholesale application submitted → ADMIN — ❌ (confirm shop fires; else add)
- U4 Wholesale approved/rejected → wholesaler CUST — ❌
- U5 Role change → user — ❌ [low]

### C-PAYOUTS / CONNECT
- P1 Stripe Connect verified → ARTISAN — ❌ (webhook)
- P2 Payout / payroll batch paid → ARTISANs — ❌ (`repairs/payroll/[batchID]`) [HIGH — money]

### C-PRODUCTS / COLLECTIONS
- PR1 Product published → ARTISAN — ✅ fires (`products/[id]/publish/route.js:87`) — auto-gains push
- PR3 Product submitted for review → ADMIN — ❌ wire the orphaned `notifyAdminsProductPending` at `products/[id]/submit/route.js:92` [med]
- PR2 Collection published → ARTISANs (+CUST?) — ❌ (calls a MOCK stub `notifyArtisanSelectedForDrop` that only console.logs, `collections/[id]/publish/route.js:12-15` — effectively no notification; needs real NotificationService wiring) [low]

### C-WHOLESALE
- WH1 Wholesale delivery scheduled → wholesaler + ADMIN — ❌
- WH2 Repair ready for wholesaler pickup → wholesaler — ❌

## D. TIER 5 (handoff doc; admin-owned crons — reuse cron pattern)
- T5-1 Birthday offer — daily cron, DOB match → CUST (needs DOB capture + `lastBirthdayOfferYear`) [marketing]
- T5-2 Abandoned cart — hourly cron reads shared `carts` → CUST (needs persisted carts) [marketing]
- (restock, new-blog, new-product, vote-unsub = efd-shop-owned; OUT of admin scope)

---
## Scope decisions (for cross-check to confirm/challenge)
1. **Push audience:** admin push targets admins+artisans (admin-origin subs) + reaches customers via
   shared pool/VAPID for CUST-facing items. Agree?
2. **Internal-only events** (W2/W5 low value) — include as in_app-only, no email/push? Or drop?
3. **Tier 5 crons** — in this pass or deferred? (need new data infra: DOB, persisted carts)
4. **Partial users** (repair intake w/o account) — email fallback only, skip push. Agree?
5. Repair "picked up" (R5) and role-change (U5) — worth notifying, or noise?
