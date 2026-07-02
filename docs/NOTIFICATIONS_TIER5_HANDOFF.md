# Notifications — Tier 5 Handoff (deferred opportunities)

**Created:** 2026-07-01 · **Origin:** efd-shop notifications site-wide pass.

During the efd-shop "notifications site-wide" effort, Tiers 1–4 were implemented (shop-originated
transactional/lifecycle events + defensive Stripe/Connect wiring). **Tier 5 was deferred** because each
item needs **new triggering infrastructure** (a waitlist, a subscriber list, cart tracking + cron, DOB
capture, or an admin-owned workflow state) — i.e. real feature work, not just wiring a notification call.
This doc hands that work off with enough detail to act cold.

---

## Background: how notifications work across the two apps

Both apps write in-app notifications to the **shared MongoDB `notifications` collection** and send email
via Handlebars templates. **The channel plumbing already exists — Tier 5 is about building the TRIGGERS
and the data each trigger reads.**

**efd-shop** — `lib/notificationService.js`
`NotificationService.createNotification({ userId, type, title, message, channels, data, templateName, actionUrl, priority, recipientEmail, metadata })`
- Channels: `'in_app' | 'email' | 'sms' | 'push'`. **Any `in_app` notification auto-adds `push`.**
- Templates: standalone HTML in `public/email-templates/<templateName>.html` (`{{handlebars}}`).
- Types live in `NOTIFICATION_TYPES`; several Tier 5 types are **already defined but unused**:
  `RESTOCK_AVAILABLE`, `ABANDONED_CART`, `BIRTHDAY_OFFER`, `PROMOTION_AVAILABLE`.

**efd-admin** — `lib/notificationService.js`
`createNotification({ userId, userEmail, userRole, type, title, message, relatedId, relatedType, relatedData, actionUrl, actionLabel, channels, priority, tags })`
- Channels here are named `['email', 'inApp', 'push']` (note **`inApp`** camelCase — differs from the shop's `in_app`).
- Email templates: `emails/*.hbs`; sender `lib/email.js` → `sendNotificationEmail`.
- DB via `src/lib/database.js`. **API routes live under `src/app/api/...`** (shop uses `app/api`).

**Cron already exists in efd-admin.** `vercel.json` has a `crons` array and
`src/app/api/cron/update-metal-prices/route.js` is the working reference for a scheduled job
(secret-guarded route + Vercel cron entry). Reuse this pattern for the cron-driven Tier 5 items.

**Recipient rule:** account holders → `userId` (gets in-app + push where subscribed). Account-less /
list subscribers → `recipientEmail` override (email only; no push target). Push only reaches users with a
`pushSubscriptions` record.

---

## Tier 5 items

### 1. Restock / back-in-stock  ·  type `RESTOCK_AVAILABLE` (defined, shop)
- **Missing infra:** a **waitlist collection** (e.g. `productWaitlist`: `{ productId/handle, userId|email, createdAt, notifiedAt }`) + a "Notify me when available" control on out-of-stock product pages (efd-shop `app/products/[handle]`).
- **Trigger:** when inventory crosses 0→>0. Inventory is Shopify-backed — detect via Shopify `inventory_levels/update` webhook (new shop route) **or** a reconciliation cron. On restock, load waitlist rows for that product, notify each, stamp `notifiedAt`.
- **Where:** shop owns product pages + the customer relationship → build in **efd-shop** (customer `userId`, `channels: ['in_app','email']`). Template `restock_available` (new).
- **Watch out:** dedupe (don't re-notify), and clear/expire rows after send.

### 2. New blog post → subscribers  ·  (no type yet)
- **Missing infra:** a **subscriber list** (`blogSubscribers` or reuse a general marketing list) + opt-in UI.
- **Trigger:** blog publish. Shop publishes via `app/api/blog/posts` (+ `blog/revalidate`). Fan out to subscribers on publish (batch, respect `emailNotifications` consent).
- **Where:** **efd-shop** (owns blog + subscribers). New type `NEW_BLOG_POST`, template `new_blog_post`. Email-only (subscribers are `recipientEmail`, likely no account).
- **Watch out:** this is **marketing** — honor unsubscribe/consent; batch to avoid Gmail SMTP rate limits (current sender is Gmail).

### 3. New product announcement → subscribers  ·  type `PROMOTION_AVAILABLE` (defined, shop)
- **Missing infra:** same subscriber list as #2.
- **Trigger:** product publish/create (shop `app/api/products` or admin product creation).
- **Where:** decide by who "publishes" products. If admin is system-of-record for catalog, fire from **efd-admin** on publish; else shop. Template `new_product` (new). Marketing → consent + batching.

### 4. Abandoned cart  ·  type `ABANDONED_CART` (defined, shop)
- **Missing infra:** **persisted carts** with `{ userId|email, items, updatedAt, recoveredAt, remindedAt }` (carts may currently be client-only) + a **cron** to find carts idle > N hours with no order.
- **Trigger:** scheduled cron (hourly). For each qualifying cart, send a recovery email once (stamp `remindedAt`); skip if an order was placed.
- **Where:** cron fits **efd-admin's existing cron infra** (`src/app/api/cron/abandoned-cart/route.js` following the metal-prices pattern), but the **cart data lives shop-side** — so either the shop persists carts and the admin cron reads the shared DB, or build the cron in the shop. Recommend: shop persists carts; admin cron reads shared `carts` collection. Template `abandoned_cart` (new). Customer `userId` when known.
- **Watch out:** one reminder per cart; suppress after checkout; marketing consent.

### 5. Birthday offer  ·  type `BIRTHDAY_OFFER` (defined, shop)
- **Missing infra:** **DOB capture** (add to registration `app/api/auth/register` and/or profile) + a **daily cron** matching today's month/day.
- **Trigger:** daily cron → users whose birthday is today (+ optional discount code creation).
- **Where:** **efd-admin cron** (`src/app/api/cron/birthday-offers/route.js`) reading the shared `users` collection, or shop cron. Template `birthday_offer` (new). Marketing consent.
- **Watch out:** timezone handling; once-per-year dedupe (`lastBirthdayOfferYear` on user).

### 6. Vote-reminder unsubscribe confirmation  ·  (minor, shop)
- **Missing infra:** none — small addition to `lib/voteReminderService.js` / `app/api/vote-reminders/unsubscribe`.
- **Trigger:** on unsubscribe, send a one-line confirmation email. Template `vote_reminder_unsubscribed` (new) or inline.
- **Where:** **efd-shop**. Lowest effort of the set.

### 7. Repair workflow states — quote generated / repair completed / picked up  ·  (admin-owned)
- **Missing infra:** these are **admin-side workflow transitions** on the `repairs` collection (efd-shop only creates the lead; the admin advances it — mirroring how the admin already owns post-intake custom-design lifecycle).
- **Trigger:** when admin advances a repair's status (quote sent / completed / picked up), notify the customer.
- **Where:** **efd-admin** — fire `createNotification({ channels: ['email','inApp'], ... })` from the repair status-update handler. New types + `.hbs` templates (`repair-quote-ready`, `repair-completed`, `repair-picked-up`). Recipient is the repair's `userID` (partial or full account created at intake in the shop).
- **Watch out:** partial users (created from a phone/email at intake) may lack an email — fall back to SMS via the shop's SMS path or skip email.

---

## Cross-repo scope summary

| Item | Build in | New infra | Type | Channel |
|------|----------|-----------|------|---------|
| Restock | efd-shop | waitlist + inventory trigger | RESTOCK_AVAILABLE ✓ | in_app+email(+push) |
| New blog post | efd-shop | subscriber list | NEW_BLOG_POST (new) | email |
| New product | efd-shop or efd-admin | subscriber list | PROMOTION_AVAILABLE ✓ | email |
| Abandoned cart | shop data + admin cron | persisted carts + cron | ABANDONED_CART ✓ | in_app+email(+push) |
| Birthday offer | admin cron | DOB + daily cron | BIRTHDAY_OFFER ✓ | email |
| Vote unsubscribe | efd-shop | none | (minor/new) | email |
| Repair states | efd-admin | admin repair workflow | (new) | email+inApp |

## Recommended sequencing
1. **Vote unsubscribe** (trivial, shop) — warm-up.
2. **Repair workflow states** (admin) — high customer value, admin already owns the workflow + email infra.
3. **Restock** (shop) — clear value, needs a waitlist model + inventory hook.
4. **Abandoned cart** (shop carts + admin cron) — needs cart persistence first.
5. **Birthday** (admin cron) — needs DOB capture; lowest urgency.
6. **New blog / new product** (marketing) — do last; requires a real subscriber/consent list and batching.

## Guardrails for all marketing-type items
- Respect `user_preferences.emailNotifications` / `pushNotifications` (shop `checkEmail/PushConsent`) — these are **not** transactional; never force-send.
- Include working unsubscribe (CAN-SPAM). The shop already injects `List-Unsubscribe` headers + `unsubscribeUrl`.
- **Batch** sends — the shared sender is Gmail SMTP; large fan-outs will hit rate limits. Consider a queue/throttle.
- Idempotency: every cron/fan-out item needs a "already notified" stamp to avoid duplicates on retry.

---
*Companion working docs (efd-shop scratchpad, not committed): notification-opportunities.md (locked master list),
implementation-plan.md, implementation-summary.md. Tiers 1–4 are implemented in efd-shop on branch
`feat/custom-request-to-customorders`.*
