# Application Surface & Feature Map — all roles

> Complete inventory of every UI surface (page/route) and feature (API/backend) in **efd-admin**,
> organized by role. Built by static search of `src/app/**/page.js` (surfaces), `src/app/api/**`
> (features), and `src/lib/navigation/*` + `roleBasedNavigation.js` (role→surface mapping).
> `[loop]` status at the bottom tracks convergence.

## Access model

- **Roles** (from `users.role`, DB-confirmed): `admin`, `dev`, `staff`, `artisan`, `artisan-applicant`,
  `wholesaler`, `affiliate`, `client`, `customer`.
- **Nav resolver** `getNavigationForRole(role, artisanTypes, staffCapabilities, employment)`:
  - `client` / `customer` → **no admin panel** (storefront `efd-shop` only; `canAccessAdmin` false).
  - `artisan` → **dynamic** nav (`generateArtisanNavigation` by `artisanTypes` + `staffCapabilities` + `employment`).
  - everyone else → static config in `src/lib/navigation/<role>Navigation.js`.
- **Role-switching:** `dev` and `admin` can switch their nav *view* to any role except `client`
  (`getAvailableRoles`) — so they can see/test every surface below.
- **Middleware** (`src/middleware.js`, matcher `/`, `/dashboard/:path*`, `/auth/:path*`, `/emergency-logout`):
  unauthenticated → `/auth/signin`; forced password change → `/auth/change-password`.
- **Shared:** every non-client role gets `SHARED_NAVIGATION.dashboard` → `/dashboard`.

---

## Surfaces by role (top-level navigation)

### 🔑 Admin (`adminNavigation.js`) — the superset
| Section | Surface | Route |
|---|---|---|
| Commerce | Sales Invoices | `/dashboard/commerce/sales-invoices` |
| Commerce | Products → Jewelry / Gemstones / Awaiting Approval | `/dashboard/products` (`/jewelry`, `/gemstones`, `/awaiting-approval`) |
| Commerce | Clients | `/dashboard/clients` |
| Commerce | Customs | `/dashboard/customs` |
| Repair Work | My Bench | `/dashboard/repairs/my-bench` |
| Repair Work | Payment & Pickup | `/dashboard/repairs/pick-up` |
| Repair Work | Leads | `/dashboard/repairs/leads` |
| Repair Work | Wholesale Pickup | `/dashboard/repairs/pending-wholesale` |
| Administration | User Management → Administrators / Developers / Wholesalers / Artisan Applications / Artisans | `/dashboard/users` (`/admin`, `/developers`, `/wholesalers`, `/dashboard/admin/artisans`, `/artisans`) |
| Administration | Labor Review | `/dashboard/repairs/labor-review` |
| Administration | Payroll | `/dashboard/repairs/payroll` |
| Administration | Tasks → Tasks / Tools & Machinery / Materials | `/dashboard/admin/tasks` (`/tools-machinery`, `/materials`) |
| Administration | Affiliates | `/dashboard/admin/affiliates` |
| Administration | Wholesale Acquisition | `/dashboard/admin/wholesale-acquisition` |
| Administration | Blog → All Posts / Blog Drafts | `/dashboard/blogs`, `/dashboard/blog-drafts` |
| Finance & Analytics | Finance → Overview / Expenses / Inventory / Stuller / Payroll / Owner Draws / Tax Reserve | `/dashboard/finance` (`/expenses`, `/inventory`, `/dashboard/admin/stuller`, `/payroll`, `/owner-draws`, `/tax-reserve`) |
| Finance & Analytics | Analytics → Dash / Reports | `/dashboard/analytics` (`/reports`) |
| Finance & Analytics | Vote Campaign | `/dashboard/vote-reminders` |
| Finance & Analytics | Admin Settings | `/dashboard/admin/settings` |

### 🛠️ Developer (`devNavigation.js`)
Same as admin **minus** Sales Invoices / Customs / Affiliates / Wholesale Acquisition / Blog / Finance-detail;
**plus** Tasks → **Processes**, and Admin Settings under a "System" header. Dev can role-switch to any role.

### 👔 Staff (`staffNavigation.js`) — limited commerce
Commerce only: Sales Invoices; Products → All Products / Jewelry / Gemstones. (Gated further by `staffCapabilities`.)

### 🎨 Artisan (dynamic — `generateArtisanNavigation(artisanTypes, staffCapabilities, employment)`)
Base (**every** artisan): **Studio** → Profile (`/dashboard/profile`), Gallery (`/dashboard/gallery`),
Affiliate (`/dashboard/artisan/affiliate`); **Finance** → Payroll (`/dashboard/artisan/payroll`).
The **Commerce + Repair Work** block is appended **only when `employment.isOnsite === true` AND
`staffCapabilities.repairOps === true`** — ⚠ NOT driven by `artisanTypes` (that param is accepted but
currently unused). That block adds: Commerce → Sales Invoices; **Repair Work** → New Repair
(`/dashboard/repairs/new`), My Bench (`/dashboard/repairs/my-bench`), My Work
(`/dashboard/artisan/my-work`), Wholesale Pickup (`/dashboard/repairs/pending-wholesale`); and
**Payment & Pickup** (`/dashboard/repairs/pick-up`) only if `repairOps`/`closeoutBilling`.

### 📝 Artisan Applicant (`artisanApplicantNavigation.js`)
Application Status — ⚠ nav segment is `dashboard/application`, a **broken link** (no such page exists);
the real applicant landing is `/dashboard/pending`. Profile (`/dashboard/profile`).

### 🏬 Wholesaler (`wholesalerNavigation.js`) — VERIFIED live on clone
Repairs → Create Repair (`/dashboard/repairs/new`), Schedule Pickup
(`/dashboard/wholesaler/repairs/schedule-pickup`), Current Repairs (`/current`), Completed Repairs
(`/completed`); Clients (`/dashboard/wholesaler/clients`); Account Settings
(`/dashboard/wholesaler/account-settings`). Repair intake is a **submission** (admin prices it).

### 🔗 Affiliate (`affiliateNavigation.js`)
Affiliate Dashboard (`/dashboard/affiliate`), Campaigns (`/dashboard/affiliate/campaigns` + `/new`),
Referred Clients (`/dashboard/affiliate/clients`).

### 🛒 Client / Customer
No admin-panel access. Storefront (`efd-shop`) only; public share pages `/d/<token>` are shop-hosted.

---

## Deep / workflow surfaces (reached within a section, not always top-nav)

**Repairs pipeline** (`/dashboard/repairs/*`): `page` (index), `all`, `current`, `completed`,
`ready-for-work`, `receiving`, `quality-control` (+`/[repairID]`), `pick-up`, `leads`, `move`, `parts`,
`payroll`, `labor-review`, `my-bench`, `my-repairs`, `new`, `scan-ticket`, `bulk-print`,
`pending-wholesale` (+`/[storeId]`), `[repairID]` (+`/edit`, `/print`). Unified bench: `/dashboard/bench`.

**Customs** (`/dashboard/customs`): `[customID]` (+`/assign-materials`, `/print`).

**Products** (`/dashboard/products`): `awaiting-approval`, `gemstones` (+`/[id]`), `jewelry` (+`/[id]`).

**Clients** (`/dashboard/clients`): `[userID]` — individual client profile detail/edit.

**Design requests** (`/dashboard/design-requests`) — ⚠ stub, not in any nav (U2 target).

**Users** (`/dashboard/users`): `admin`, `artisans` (+`/[userID]`), `developers`, `manage`,
`wholesalers` (+`/[wholesalerId]/print-intake-slips`).

**Admin** (`/dashboard/admin` — hub index page; + `/*`): `affiliates` (+`/[affiliateId]`), `artisans`, `settings`, `stuller`,
`wholesale-acquisition`, `migrate-repair-tasks`, `repair-tasks` (`create`, `edit/[taskId]`,
`process-based`), `tasks` (`ai-builder`, `create`, `edit/[id]`, `materials`, `process-based`,
`processes` (+`ai-builder`), `tools-machinery`).

**Finance** (`/dashboard/finance/*`): `debt-accounts`, `expenses`, `inventory`, `opening-balance`,
`owner-draws`, `tax-reserve`.

**Analytics** (`/dashboard/analytics`): `reports` (+`/[reportSlug]`).

**Commerce** (`/dashboard/commerce/sales-invoices`): `[invoiceID]` (+`/print`).

**Affiliate/Artisan role pages**: `/dashboard/affiliate/{campaigns(+/new),clients}`;
`/dashboard/artisan/{affiliate,my-work,payroll}`.

**Content**: `/dashboard/blogs` (+`/[id]`), `/dashboard/blog-drafts` (+`/[id]`), `/dashboard/gallery`.

**Shared/other**: `/dashboard/profile`, `/dashboard/pending`, `/dashboard/[userID]/admin/settings`,
`/dashboard/vote-reminders`.

**Auth & system**: `/auth/{signin,register,forgot-password,reset-password,change-password,complete-registration}`,
`/emergency-logout`, `/offline`, `/admin/migrate`. **`/products/gemstones`** — a **Gem Cutter artisan**
surface (outside `/dashboard`, so middleware doesn't guard it; the page self-gates client-side via
`session.user.artisanTypes.includes('Gem Cutter')`), **not** public.

---

## Feature / API layer (39 backend groups)

| Domain | API groups (route counts) |
|---|---|
| Repairs | `repairs` (32), `repair-invoices` (14), `bench` (4), `rush-jobs` (1) |
| Customs | `custom-orders` (21), `design-requests` (3) |
| Production/Catalog | `production` (11), `designs` (2), `drop-requests` (5), `collections` (4), `products` (17) |
| Tasks/Process | `tasks` (13), `processes` (3), `materials` (2), `tools-machinery` (1) |
| Users/Access | `users` (5), `artisan` (10), `artisans` (1), `auth` (11) |
| Commerce/Sales | `sales-invoices` (2), `stripe` (4), `stuller` (9) |
| Finance | `finance` (1), `businessExpenses` (2), `recurringBusinessExpenses` (2), `debtAccounts`/`debtPayments`/`debtStatements` (2 each), `inventory` (4), `inventory-items` (2), `inventory-transactions` (1), `metal-prices` (1) |
| Marketing/Content | `affiliates` (6), `wholesale` (7) |
| Platform | `admin` (46), `analytics` (2), `ai` (5), `glb` (1), `cron` (2) |

Built-but-unwired (no UI): `production/*`, `design-requests`, `collections`, `drop-requests`
(see [PRODUCTION_PIPELINE_VISION.md](./PRODUCTION_PIPELINE_VISION.md)).

**Model-only modules** (under `src/app/api/*` with a `model.js` but **no `route.js`** — data-access
layers imported by other routes/services, not HTTP endpoints): `workOrders`, `pieces`, `drops`
(production spine — HTTP surface is `/api/production/*` + `/api/bench/*`); `repairLaborLogs`,
`repairPayrollBatches` (legacy pre-rename labor/payroll data layers); `ownerDraws`, `salePayouts`
(finance/payouts); `stullerInvoices`, `stullerOrders` (Stuller integration); `inventory-reorder-suggestions`.
This is the **complete, exhaustive** set — verified as exactly the `api/*` groups with `model.js` and
`route.js`-count 0. (`custom-orders/invoices/model.js` and `designs/model.js` also exist but live in
route-*backed* groups — 21 and 2 routes respectively — so they're already covered above, not route-less.)

---

## `[loop]` convergence status
Stop condition: map unchanged for **3 consecutive** iterations AND sub-agent agrees complete.
- **Iteration 1** — main-agent static search: ~110 pages, 8 roles, 38 API groups. → sub-agent found gaps.
- **Iteration 2** — folded sub-agent findings: **+`/dashboard/admin`** hub index; flagged artisan-applicant
  `dashboard/application` as a **broken nav link** (real page `/dashboard/pending`). Sub-agent's API-count
  "corrections" were **rejected** (re-verified with `sort -u`: my counts 32/14/5/4/17/13 are correct).
  **Map grew → stability counter = 0.** Re-verifying with a fresh sub-agent.
- **Iteration 3** — folded round-2 findings: added the **model-only modules** list (10 `api/*` dirs with
  `model.js` and no `route.js` — verified route-less). Route-group count (38) unchanged/correct.
  **Map grew → stability counter = 0.** Re-verifying with a fresh sub-agent.
- **Iteration 4** — folded round-3: added **`/dashboard/clients/[userID]`** detail surface; made the
  model-only list **exhaustive** (enumerated all 29 `model.js` files, classified each). **Rejected**
  round-3's other finding (`custom-orders/invoices` & `designs` are route-backed, not model-only —
  verified). Map grew by 1 surface → **stability counter = 0.** Surface/API/model dimensions now
  enumerated exhaustively; next rounds probe in-page features, then role-gating depth.
- **Iteration 5** — round-4 sub-agent (features + gating) returned **MAP COMPLETE**: no new surfaces/
  features. Applied its one *accuracy* correction (artisan Repair Work block is gated by
  `employment.isOnsite && staffCapabilities.repairOps`, not `artisanTypes`). No new surface → **no
  growth. Stability counter = 1/3.** Confirmed-present major features: customs multi-tab detail, 3D
  viewer/Studio/share, scan-to-claim (`repairs/move?mode=scan`), bulk-print, wholesale bulk outreach,
  Stuller lookup, task/process AI builders, client detail tabs.
- **Iteration 6** — round-5 sub-agent (edges + accuracy) returned no new surfaces/features. Applied its 2
  *accuracy* corrections: API-group header **38 → 39** (table already listed all 39); relabeled
  **`/products/gemstones`** as a Gem-Cutter-gated surface (not public). No new surface → **no growth.
  Stability counter = 2/3.** Running the final confirmation round.
- **Iteration 7** — final confirmation sub-agent returned **MAP COMPLETE** (112 pages, 39 API groups,
  8 roles all verified present & accurate; no new surface/feature). No growth → **stability counter = 3/3.**

### ✅ CONVERGED
Map stable for **3 consecutive rounds** (iterations 5–7) with **both agents in agreement** that it is
complete and accurate. Coverage: **112 page surfaces**, **39 HTTP API route-groups**, **10 route-less
model modules**, **8 dashboard roles** (+ client/customer = storefront-only), role→surface mapping, and
major in-page features. 6 findings resolved across rounds (1 new surface `/dashboard/admin`, 1 new surface
`/dashboard/clients/[userID]`, the model-only list, artisan-gating correction, API-count label, gemstones
mislabel); 2 sub-agent findings correctly rejected after verification (undercounted API routes;
`custom-orders/invoices`+`designs` are route-backed, not model-only).
