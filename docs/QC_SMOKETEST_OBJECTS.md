# Post-Migration QC — Smoketest Object Registry

> Every object created during flow/lifecycle QC on the migrated clone (`efd-db-migrate`), logged here so
> they can all be **deleted in the final cleanup loop**. Format: type · id · collection · created-in-flow · cleanup status.
> ⚠ These live in the disposable clone (`efd-db-migrate`), which is re-cloned fresh at real cutover — but we
> clean up anyway so the QC clone stays inspectable and the process is proven.

## Auth/seed artifacts (set during QC — reset at cleanup)
| Type | Id / email | Change made | Cleanup |
|---|---|---|---|
| seeded admin | `dev-preview-admin@efd.local` | inserted (role admin) into clone | delete user |
| password set | `greerscoin02@yahoo.com` (wholesaler) | password ← admin hash | (real user; leave / reset note) |
| password set | `vernonmcnabb1984@gmail.com` (artisan) | password ← admin hash | (real user) |
| password set | `critter@engelfinedesign.com` (artisan) | password ← admin hash | (real user) |
| password set | `kira@thestudioviolet.com` (affiliate) | password ← admin hash | (real user) |

## Created objects
| Type | Id | Collection | Flow | Cleanup |
|---|---|---|---|---|
| repair | `repair-5f88897e` | repairs (+workOrder `f20406f7…`) | wholesaler intake smoke test | ⬜ delete repair + WO |
| client | `client-873fe5f2` (Smoke TestClient) | clients | wholesaler "Add New Client" | ⬜ delete client |
| repair | `repair-1070ff1e` | repairs (+workOrder) | F1 admin intake (client "QCLifecycle Repair") | ⬜ delete repair + WO |
| user (client) | `user-40dfa5ac` (QCLifecycle Repair, role customer) | **users** | F1 admin "Add New Client" (admin clients → users coll) | ⬜ delete user |
| custom order | `CO-mr1qfylw-6a8228` (Ring, client QCLifecycle Repair) | customOrders | F3 New Custom Order stepper | ⬜ delete customOrder |
| design | `42b77e97-30aa-4abf-a662-24bf89fc7150` | designs | F3 start-production | ⬜ delete |
| piece | `55694610-aa8a-4f23-aa06-10f749d4c840` | pieces | F3 start-production | ⬜ delete |
| work order | `6f48e422-b9a4-4782-8e12-23566d682844` | workOrders | F3 add-work-order | ⬜ delete |
| custom invoice | `cinv-b7f4a8b1` (deposit $684.38 paid) | customInvoices | F3 New Invoice | ⬜ delete |
| sales invoice | `sinv-a0286737` (walk-in, $100 item, paid) | sales-invoices | F7 New Sale + Collect Cash | ⬜ delete (+ any salePayout) |
| jewelry product | `jwl_mr1r1atg_x4twpy` (QC Smoke Ring, $250, draft) | products | F5 jewelry editor Save Draft | ⬜ delete |
| user (client) | QCFlow Client9 (qcflow.client9@example.com, role customer) | users | F9 admin Add Client | ⬜ delete |
| expense | QC Smoke Vendor, $42.50, Rent | businessExpenses | F10 Add Expense | ⬜ delete |
| affiliate campaign | "QC Smoke Campaign" (affiliate kira) | affiliateCampaigns | F12 create campaign | ⬜ delete |

## Cleanup log — ✅ DONE (final loop)
Deleted from `efd-db-migrate`: repairs ×2 (+workOrders ×3, laborLogs ×1), customOrders ×1 (+customInvoices ×1,
design ×1, piece ×1), salesInvoices ×1, products ×1, clients ×1, users ×3 (dev-preview-admin + 2 created client-users),
businessExpenses ×1, affiliateCampaigns ×1. **Residual re-check: 0 across all** (repairs/customOrders/products/
salesInvoices/campaign/expense/created-users/dev-admin all count 0).
- **Note (seed artifacts NOT reverted):** the password changes on the real users `greerscoin02@yahoo.com`,
  `vernonmcnabb1984@gmail.com`, `critter@engelfinedesign.com`, `kira@thestudioviolet.com` (set to the QC admin hash to
  log in as each role) remain — original hashes aren't recoverable. **No prod impact**: `efd-db-migrate` is the
  disposable rehearsal clone and is re-cloned fresh from prod at real cutover, so these changes vanish then.
