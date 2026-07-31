# Security audit — did anyone use the auth holes?

**Date:** 2026-07-31 · **Databases checked:** `efd-database` (production), `efd-database-DEV`,
`efd-database-legacy` (pre-migration snapshot), `efd-db-migrate` · **Method:** read-only queries
against the `users` collection. No writes were made.

## Bottom line

**No evidence anyone exploited anything.** Every account in production is explainable, no role was
changed unexpectedly, and there are no signs of the account-takeover path having been staged.

One correction to what you believed, and it matters more than the security question.

---

## 1. You are not the only admin

Production has **two** admin accounts:

| Email | Name | Created | Last modified |
|---|---|---|---|
| jacobaengel55@gmail.com | jacob engel | 2025-01-12 | 2026-05-02 |
| **john.e.annis@gmail.com** | **John Annis** | **2025-01-12** | **2026-04-13** |

**This is not from the security hole.** Both accounts were created on the same day in January 2025
(the original data seed), and both are present in `efd-database-legacy` — the snapshot taken *before*
the July cutover — with byte-identical timestamps. An account minted by exploiting the escalation
would have appeared only in current production, with a recent `createdAt`. This one predates the
vulnerable code entirely.

So it's a legitimate old account. **The question is whether it should still be an admin.** An admin
can read every customer's contact details, change wage and markup settings, approve artisans, and see
all financials. If John doesn't need that today, downgrade it — an unused admin account is the kind
of thing that becomes a problem quietly.

## 2. Nothing was escalated

| Check | Production result | Reading |
|---|---|---|
| Admin accounts | 2, both from the Jan-2025 seed | no account was promoted |
| Accounts with a missing or invalid role | **0** | see §4 — good news for the deploy |
| Live password-reset tokens | **0** | the takeover chain was never staged |
| Payroll-payable (`isOwnerOperator`) flags | 1 — you | nobody added themselves |
| Role distribution | customer 138, client 36, wholesaler 7, artisan 6, admin 2, affiliate 1 | 190 total, all plausible |

The absence of live reset tokens is the meaningful one. That takeover path required a token to be
planted and read; a pile of unexplained tokens would have been the fingerprint. There are none.

## 3. All six artisans are accounted for

| Email | Type | Approved | Approved by |
|---|---|---|---|
| critter@engelfinedesign.com | Jeweler, Gem Cutter, CAD | — (seed account) | — |
| robertcowden@mac.com | Jeweler, CAD | 2025-10-23 | `admin-user-id` |
| jacobwaynewest@gmail.com | Gem Cutter | 2025-10-17 | `admin-migration-script` |
| jerellrodriguez@yahoo.com | Engraver | 2025-10-21 | `admin-user-id` |
| vernonmcnabb1984@gmail.com | Jeweler | 2025-10-21 | `admin-user-id` |
| michellelgrazier@gmail.com | Jeweler | 2026-05-14 | `admin-dashboard` |

Five approved in Oct 2025, one in May 2026. Every application shows a `submittedAt` *before* its
`approvedAt` — the normal sequence, not a self-approval. Confirm each name is someone you actually
invited; if so, this is clean.

**Caveat worth knowing:** `reviewedBy` records a placeholder (`admin-user-id`, `admin-dashboard`)
rather than a real person, because the admin client hardcoded that string. So these rows prove
*when* but not *who*. That's now fixed — future approvals record the authenticated reviewer's email —
but it means the historical trail here is weaker than it looks.

## 4. Nobody will be locked out by the deploy

This was the one live risk I flagged when merging: the login default changed from `admin` to
least-privilege, so a staff account with a blank or oddly-cased `role` would now be denied.

**Zero accounts have a missing or unrecognized role, in any of the four databases.** Nothing to fix,
nobody gets locked out. You can disregard that warning.

## 5. Three artisans hold repair-ops staff capabilities

Not a finding, but you should know these exist, because they gate money operations
(`closeoutBilling`, `qualityControl`):

- critter@engelfinedesign.com
- vernonmcnabb1984@gmail.com
- michellelgrazier@gmail.com

All three have the full set: repairOps, closeoutBilling, qualityControl, parts, benchWork, receiving.
That's consistent with onsite bench jewelers doing repair intake and closeout, so it's presumably
intentional — worth confirming that all three still work onsite.

## 6. Recent activity is unremarkable

The 18 accounts modified since June 2026 are all customers (normal shop activity: orders, addresses),
one artisan, and one wholesaler. No role changes, no privileged accounts touched. The most recent
privileged-account modification is yours, from May 2026 — before the vulnerable code existed.

---

## What I could not determine

**Whether anyone read data they shouldn't have.** The holes allowed *reading* pricing, the material
cost catalog, and applicant contact details. Reads leave no trace in the database, and none of those
routes logged access. Server logs from Vercel don't retain far enough back to help.

So: I can show nothing was **changed**, which is the part that would cause lasting harm. I cannot
prove nothing was **viewed**. Given that this is an internal tool for a small business, on URLs
nobody would guess, and that the population with login access is six artisans you personally
invited — the realistic risk of that is low.

## Recommendations, in priority order

1. **Decide about `john.e.annis@gmail.com`.** If John doesn't need admin, downgrade him. This is the
   only genuine open item in the whole audit.
2. **Confirm the six artisans are all people you invited**, and that the three with repair-ops
   capabilities still work onsite.
3. **Nothing else.** No password resets, no secret rotation, no incident response. There's no
   evidence of compromise, and acting as if there were would just create work.

If item 1 turns out to be an account you don't recognize, that changes things — tell me and we'd
treat it as an incident: rotate `NEXTAUTH_SECRET`, force resets, and trace what it touched.
