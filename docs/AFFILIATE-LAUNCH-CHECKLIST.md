# Affiliate launch checklist

From the 2026-08-20 full audit (both repos). Shop items live in the shop agent's copy:
efd-shop/docs/AFFILIATE-AUDIT-SHOP-HANDOFF.md. Ordered — each block unblocks the next.
Trued up 2026-08-20 evening: §0/§3 shipped, both deploys landed after the
NODE_AUTH_TOKEN rotation, Shanin is unblocked.

## 0 · Ship what's already fixed — ✅ DONE (all in prod)

- [x] Admin batch deployed: users-directory lockdown, campaigns ownership,
      metrics→customOrders join, code validation, campaign code re-sync,
      pricing pass-throughs. Plus PR #42 (claim invites), #41 (quote.gates),
      #43 (previousCodes rename safety).
- [x] Shop deployed (after NODE_AUTH_TOKEN rotation): PR #67 claim links,
      PR #68 affiliate hardening, tax wiring, cart clearing, spam quarantine.

## 1 · Owner decisions — ✅ ANSWERED 2026-08-24

- [x] **Commission base** — pre-tax PROFIT on the piece. Not revenue, not after tax.
      For customs that is the QUOTED profit (`quote.quoteTotal − quote.cog`):
      deterministic at the trigger, immune to bench overruns the affiliate can't
      influence. The live margin is recorded alongside for audit.
- [x] **Trigger** — PAID IN FULL (`progress.isFullyPaid`). One commission per order.
- [x] **Rail** — the payroll ledger: a flat-fee `laborLogs` entry (0 hours,
      `sourceAction: 'affiliate_commission'`), same carrier as the client-mgmt bonus.
- [x] **Product sales** — tracked (shop PR #68) and rate-snapshotted. Because product
      COGS isn't derivable from a shop order, product commissions land as
      NEEDS_REVIEW; admin enters the profit and approval writes the payout.

## 2 · Admin build — ✅ BUILT 2026-08-24 (11 engine tests)

- [x] **Commission engine** (`services/affiliates/commissionEngine.js`): earns at
      paid-in-full using the attribution-snapshotted rate; writes the payroll payout;
      claim-first idempotent (racing triggers pay once) and RELEASES the claim on
      failure so the sweep retries instead of silently never paying; a payout already
      on payroll refuses to void silently (clawbacks go through payroll deliberately).
      Triggers: invoice mark-paid, the shop-payment drain, and
      `/api/cron/earn-commissions` every 30 min as the guaranteed consumer.
- [x] **Affiliate earnings surface**: affiliate dashboard shows an Earned tile + their
      commission ledger; admin's affiliate detail shows the full ledger with
      Approve (enter profit) / Void on needs-review rows.
- [x] **Account-claim invites** — SHIPPED (admin PR #42): client creation + quote
      publish → `POST {shop}/api/auth/invite`.
- [x] **Claim link by TEXT** — SHIPPED both sides (admin batch + shop PR #67).

## 2b · Shanin — ✅ UNBLOCKED, owner action only

- [x] Both deploys are live.
- [ ] Open her client profile → **Get account claim link** → "Copy ready-to-send text"
      → text it to her number from your phone.
- [ ] She opens it: enters her real email + a password, lands signed in at the shop —
      quote and payments visible under her existing userID.

## 3 · Shop build — ✅ DONE (shop session, PR #68, deployed)

- [x] Click capture hardened: 20/h-per-IP rate limit + per-visitor-per-day dedupe.
- [x] Product/cart attribution live; payment is the conversion moment.
- [x] `previousCodes` alias matching both sides (shop PR #68 + admin PR #43).
- NOTE: the in-flight shop overhaul branches share ZERO files with the 13
  affiliate-touched files as of tonight — but if the overhaul rewrites
  `app/api/checkout/route.js`, `lib/cartFulfillment.js`, or `CheckoutClient.js`,
  attribution stamping/conversion lives there and would break silently.

## 4 · End-to-end dry run (test affiliate, before the real one)

- [ ] Promote a test user → affiliate; confirm code format enforced; create a campaign.
- [ ] Click `{shop}/r/<code>/<campaign>` logged-out → lands right, click recorded
      (and a same-day re-click does NOT mint a second event).
- [ ] Log in as a DIFFERENT test customer, submit a custom request → conversion recorded,
      `order.affiliate` stamped with snapshotted rate, metrics show 1 request + 1
      referred client (masked).
- [ ] Also buy a cheap product through the referred session → order.affiliate stamped,
      event converts at PAYMENT with conversionType product_sale.
- [ ] As the test AFFILIATE login: verify they can see their dashboard/campaigns/clients
      and CANNOT list users, other affiliates' campaigns, repairs, or customs.
- [ ] If §2 shipped: pay the test order to the trigger → commission record + payout entry.

## 5 · Onboarding day

- [ ] Promote the real user (admin → clients → Promote to Affiliate; sets role + profile).
- [ ] Set their real commission rate/type; let them pick their code (validated).
- [ ] They create their first campaign; send them the `/r/` link format + the attribution
      terms in words: last click wins, 90-day window, self-referrals don't count,
      same-day re-clicks reuse one event, commission on <§1 answer> when <§1 trigger>.

## 6 · Housekeeping (non-blocking, from the session)

- [ ] NODE_AUTH_TOKEN: today's expiry broke every shop deploy for ~2h. Set a calendar
      reminder before the new token's expiry (or use a fine-grained token with a
      longer window) — and check the admin project carries the fresh value too.
- [ ] QuoteTab's "include custom design" toggle is vestigial (does nothing) — remove.
- [ ] `quote.castingCost` is a dormant engine field nothing writes — retire someday.
