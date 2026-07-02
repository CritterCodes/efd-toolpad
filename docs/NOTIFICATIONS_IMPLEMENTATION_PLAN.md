# efd-admin notifications — Implementation Plan

Derived from the LOCKED opportunity list + push-infra-plan.md. Admin channels are camelCase
(`inApp`,`email`,`push`). Bridge: `src/lib/notificationService.js` → `lib/notificationService.js`.
Reuse existing 20 `emails/*.hbs`; add new templates only where noted.

## BRIDGE SEMANTICS — verifiers MUST read before flagging (these are NOT bugs)
Call sites use the BRIDGE `NotificationService.createNotification` from `@/lib/notificationService`
(= `src/lib/notificationService.js`), NOT the root `lib/notificationService.js createNotification`.
The bridge's signature differs from the root's:
1. **`recipientEmail` is the CORRECT bridge param.** The bridge maps it to the root's `userEmail`
   (`src/lib/notificationService.js:93` → `userEmail: recipientEmail || data?.recipientEmail || ''`).
   Passing `recipientEmail` is right; changing call sites to `userEmail` would BREAK email. DO NOT flag.
2. **`channels:['inApp']` auto-gains `push`.** The bridge passes channels through; the root
   auto-adds `'push'` whenever `'inApp'` is present (INF-5). So `['inApp']` delivers in-app + push.
   A call with `['inApp']` is NOT "missing push". DO NOT flag.
3. `notifyAllAdmins` (root) uses `userEmail` directly — correct there.

## Guiding rules
- **Auto-push**: `createNotification` auto-adds `push` whenever `inApp` present (mirror shop).
- **Delivery id**: notifications + push subs key on the canonical `userID` string. Customer-facing
  admin notifications MUST use the customer's shop `userID` (on repairs/customs docs), never mongo _id.
- **Best-effort**: every trigger wraps the notify call so it never blocks the state change.
- **Consent**: honor `user_preferences` push/email opt-out for MARKETING types (Tier 5) only; workflow
  events are transactional.
- **Templates**: a type with no `.hbs` still delivers in_app + push; email silently skips if template
  missing (verify email.js behavior) — add templates for customer-facing ones.

---
## WP0 — Admin Web Push infrastructure (backbone; do first)
1. `package.json`: add `web-push@^3.6.7` (install via NODE_AUTH_TOKEN-from-~/.npmrc trick).
2. `lib/webPush.js` (new): `setVapidDetails` from env; `isPushConfigured()`; `sendPushToUser(userID, payload)`
   → query shared `pushSubscriptions` via `src/lib/database.js` `db.connect()`, send, prune 404/410.
   Payload {title,body,url,icon,badge,tag,data}. SAME env var names as shop (shared keypair).
3. `lib/notificationService.js`: replace push TODO (l.94) with `await sendPushNotification(notification)`;
   implement `sendPushNotification` → `sendPushToUser(notification.userId, {...})`; set
   `pushNotification.sent/sentAt/error`. Auto-add `'push'` to channels when `'inApp'` present.
4. `public/push-sw.js` (new): standalone SW — `push` (parse JSON, showNotification) + `notificationclick`
   (focus-or-open url) handlers ONLY. No caching.
5. `src/lib/usePushNotifications.js` (new client hook): register `/push-sw.js` itself (don't use
   serviceWorker.ready — PWA off), Notification.requestPermission, pushManager.subscribe with
   NEXT_PUBLIC_VAPID_PUBLIC_KEY, POST to /api/push/subscribe with NextAuth (credentials: include).
6. `src/app/api/push/subscribe/route.js` (new): POST/DELETE, auth via NextAuth `getServerSession`
   (auth.js). Upsert by endpoint, owner = session.user.userID. Store {userID,endpoint,keys,...}.
7. `NotificationBell.jsx`: add an "Enable/disable push" control using the hook (permission-aware).
8. `.env.push.example` (admin): document the SAME 3 VAPID vars as shop (shared keypair). NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
9. Verify: build; keys already valid (shop). Push subs pool shared.

## WP1 — Admin fan-out + INF-3 (shop→admin visibility)
- `lib/notificationService.js`: add `notifyAllAdmins({type,title,message,relatedData,actionUrl,priority,templateName})`
  → find users role in [admin,superadmin], createNotification each with `['inApp','email']` (auto-push).
- INF-3 fix (shop→admin `userId:'admin'` alerts invisible): make admin notifications GET route
  (`src/app/api/admin/notifications/route.js`) ALSO return docs with `userId:'admin'` for admin-role
  sessions (broadcast inbox), OR (cleaner) have admin-side inbound handlers call notifyAllAdmins.
  DECISION: broadcast-query in the bell (one line: `userId: { $in: [session.userID, 'admin'] }`), so the
  existing shop alerts surface without shop changes. Mark 'admin' docs read per-user via a separate
  read-state (or accept shared read). Keep simple: show them, read-state best-effort.

## WP2 — Repairs lifecycle
Fire from the admin handlers (customer uses repair.userID; artisan uses assignedTo):
- R1 `api/repairs/route.js` POST → CUST ack (`repair-lead-received` tmpl new) + notifyAllAdmins.
- R2 repair quote sent handler → CUST (`repair-quote-ready` new).
- R3 `complete-from-qc/route.js` → CUST completed+ready-for-pickup (`repair-ready-pickup` new).
- R5 picked-up transition → CUST thank-you (reuse ready or new; low).
- R6 `mark-waiting-parts`, `mark-parts-ordered` → CUST status (reuse generic `repair-status` new).
- R7 `repairs/[id]/claim` → ARTISAN assignee (in_app+push; `repair-assigned` new).
- R8 `services/repairs/benchHandoff.js` signOffAndHandoffRepair → target ARTISAN (in_app+push).
- R9 `quality-control` QC fail → assignee ARTISAN (in_app+push).
- R10 `parts-ready-for-work` → assignee ARTISAN (in_app).

## WP3 — Custom orders
- X1 quote publish (`custom-orders/[customID]/quote` PUT when quotePublished flips true) → CUST (`custom-quote-ready` new).
- X2 status change (`custom-orders/[customID]/route.js` PUT ~l.26) → CUST at milestone transitions
  (design started, in_production, qc, completed, delivered) — map status→{title,message,template}.
- X3 design/GLB ready (`customProduction.js` GLB stage / `design-model` route) → CUST (`custom-design-ready` new).
- X4 wire the TODO in `custom-orders/[customID]/communications/route.js:36` — admin→client message → CUST (`custom-message` new / reuse custom-ticket-message-sent).
- X5 order completed/delivered → CUST (part of X2 mapping).
- X6 casting received (`recordCastingReceived`) → production ARTISANs (in_app).
- X7 CAD/GLB WO assigned (`spawnCustomWorkOrder`) → designer ARTISAN (in_app+push).
- X8/X9 design submitted/approved/rejected → ADMIN + designer ARTISAN.
- X10 INF-3 inbound (client msg/quote-accept/image/spec) visible to admins — handled by WP1.

## WP4 — Bench / work orders
- W1 assign (`pieceWorkOrderActions` claim/assign, benchActions) → ARTISAN (in_app+push).
- W3 QC pass (labor credited) → ARTISAN (in_app). W4 QC fail → ARTISAN — the only QC-reject
  transition in bench is CAD (`rejectCadQc`, wired as `wo-qc-failed`); non-CAD pieces have no
  QC-reject action (move-to-qc → complete-from-qc pass only), so nothing more to wire. W2/W5 skipped (low).

## WP5 — Users / onboarding
- U1/U2 `src/lib/artisanService.js updateArtisanApplicationStatus` approved/rejected → ARTISAN
  (`artisan-approved`/`artisan-rejected` new; email+inApp+push).
- U3 wholesale application submitted → notifyAllAdmins (confirm origin).
- U4 wholesale approve/reject (`admin/wholesale/[id]/approve|reject` — wire the TODOs) → wholesaler CUST
  (`wholesale-approved`/`wholesale-rejected` new).
- U5 role change (`users/controller updateUser`) → user (low; in_app).

## WP6 — Payouts / Connect
- P2 `repairs/payroll/service.js markPayrollBatchPaid` → each ARTISAN in batch (`payout-sent` new; email+inApp+push). [HIGH money]
- P1 Stripe Connect account.updated verified (`stripe/webhook`) → ARTISAN (`connect-verified` new).

## WP7 — Products / collections
- PR2 replace mock in `collections/[id]/publish/route.js:12-15` with real notifyAllArtisans/NotificationService.
- PR3 wire orphaned `notifyAdminsProductPending` at `products/[id]/submit/route.js:92` → notifyAllAdmins.

## WP8 — Tier 5 crons (data-dependent; sequence last)
- Reuse cron pattern (`api/cron/update-metal-prices` + vercel.json secret-guarded).
- T5-birthday: `api/cron/birthday-offers/route.js` daily; needs users.dateOfBirth + `lastBirthdayOfferYear` dedupe. If DOB absent in data → route is a safe no-op (log skipped count). Template `birthday_offer` (shop has type).
- T5-abandoned-cart: `api/cron/abandoned-cart/route.js` hourly; needs shared `carts` collection with updatedAt/remindedAt. If collection empty/absent → no-op. Template `abandoned_cart`.
- Both marketing → consent + idempotency stamp. Add vercel.json cron entries.
- NOTE: these fire to CUST via shop identity; delivered from admin using shared pool.

## New templates to add (emails/*.hbs) — customer/artisan facing
repair-lead-received, repair-quote-ready, repair-ready-pickup, repair-status, repair-assigned,
custom-quote-ready, custom-design-ready, custom-status, artisan-approved, artisan-rejected,
wholesale-approved, wholesale-rejected, payout-sent, connect-verified, birthday_offer, abandoned_cart.
(Internal artisan in_app-only events need no email template.)

## Verification (Phase 3 loop)
- Build admin (stop :3001 dev; `npm run build`; restart).
- Subagent verifies each WP against plan; loop until 3 consecutive CONCUR.
- Manual smoke where feasible (push subscribe in admin; fire a repair transition).
