# Affiliate launch checklist

From the 2026-08-20 full audit (both repos). Shop items live in the shop agent's copy:
efd-shop/docs/AFFILIATE-AUDIT-SHOP-HANDOFF.md. Ordered — each block unblocks the next.

## 0 · Ship what's already fixed

- [ ] **Deploy the pending admin batch** (audit fixes are in the worktree, built, NOT yet
      in prod: users-directory lockdown, campaigns ownership, metrics→customOrders join,
      code validation, campaign code re-sync — plus the pricing pass-throughs).

## 1 · Owner decisions (blocks the commission engine)

- [ ] **Commission base** — % of what? Pre-tax quoteTotal, or EFD's work only
      (excluding pass-throughs: stone, shipping, design/GLB/QC fees)? The engine's
      `workCog`/`passThroughTotal` split makes either a one-liner; margin-based is the
      one that can't be gamed by big pass-through tickets.
- [ ] **Trigger** — when is commission EARNED? Recommended: order fully paid
      (`isFullyPaid`), not at request/quote (requests can die) and not at delivery
      (money's already in). One commission per attributed order.
- [ ] **Payment channel** — recommended: the existing payroll rail (a flat-fee
      `laborLogs` entry, like the client-mgmt bonus) so payouts ride the machinery
      that already pays people, nets out of margin, and shows in payroll batches.
- [ ] **Product sales** — do affiliates earn on shop product/cart purchases, or only
      custom orders? (Today: only custom requests attribute at all — shop item #2.)

## 2 · Admin build (after §1)

- [ ] **Commission engine**: on the trigger event for an order carrying `order.affiliate`
      → create a commission record (rate SNAPSHOTTED from attribution time, not read
      live), set `order.affiliate.commissionStatus/commissionId`, write the payout
      entry. Idempotent, forward-only, audited — same shape as the status automation.
- [ ] **Affiliate earnings surface**: their dashboard shows earned/pending/paid;
      admin's affiliate detail shows the same ledger.
- [ ] **Account-claim invites** (existing task chip): client creation + quote publish
      → `POST {shop}/api/auth/invite`, so referred clients can claim their portal.
- [x] **Claim link by TEXT** (built 2026-08-20, needs both deploys): for clients with a
      placeholder email — "Get account claim link" on the client profile mints a
      7-day userID-bound link via the shop (s2s); staff texts it BY HAND (manual only —
      TCPA). The claim page collects their real email + password and verifies in one
      step. Shop half is on efd-shop branch `feat/claim-link-by-text`.

## 2b · Shanin (waiting on the two deploys above)

- [ ] Deploy admin batch + merge/deploy shop `feat/claim-link-by-text`.
- [ ] Open her client profile → **Get account claim link** → "Copy ready-to-send text"
      → text it to her number from your phone.
- [ ] She opens it: enters her real email + a password, lands signed in at the shop —
      quote and payments visible under her existing userID.
- [ ] **`quote.gates` stamping** (existing task chip): unrelated to affiliates but
      touches the same money pipeline — do before heavy shop-checkout use.

## 3 · Shop build (the handoff doc, shop agent)

- [ ] Harden click capture (move into `/r/` redirect or dedupe; kills bot inflation).
- [ ] Product/cart attribution — only if §1 says affiliates earn on products.
- [ ] `previousCodes` alias matching so a code change doesn't kill printed links (optional).

## 4 · End-to-end dry run (test affiliate, before the real one)

- [ ] Promote a test user → affiliate; confirm code format enforced; create a campaign.
- [ ] Click `{shop}/r/<code>/<campaign>` logged-out → lands right, click recorded.
- [ ] Log in as a DIFFERENT test customer, submit a custom request → conversion recorded,
      `order.affiliate` stamped, metrics show 1 request + 1 referred client (masked).
- [ ] As the test AFFILIATE login: verify they can see their dashboard/campaigns/clients
      and CANNOT list users, other affiliates' campaigns, repairs, or customs.
- [ ] If §2 shipped: pay the test order to the trigger → commission record + payout entry.

## 5 · Onboarding day

- [ ] Promote the real user (admin → clients → Promote to Affiliate; sets role + profile).
- [ ] Set their real commission rate/type; let them pick their code (validated).
- [ ] They create their first campaign; send them the `/r/` link format + the attribution
      terms in words: last click wins, 90-day window, self-referrals don't count,
      commission on <§1 answer> when <§1 trigger>.
