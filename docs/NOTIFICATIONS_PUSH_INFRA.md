# Admin Web Push — infrastructure plan (settled; parity with efd-shop)

## KEY DECISION: shared VAPID keypair across both apps
Web Push subscriptions are bound to the **VAPID applicationServerKey**, not the origin. A
subscription the customer created on the **shop** origin can be delivered to by ANY server
that holds the matching VAPID **private** key — the push wakes the service worker on the
origin that created it (shop SW → customer device).

Therefore **efd-admin reuses the SAME VAPID keypair as efd-shop** (same
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` values in admin's env). Both apps then
share the single `pushSubscriptions` collection (already shared DB). Consequences:
- Admin advancing a repair/custom order → `createNotification(customer.userID, push)` reaches
  the customer's shop-origin subscription. ✅ cross-app push "just works".
- Admins/jewelers subscribe via the **admin** origin SW (with the same public key); their
  subscriptions land in the same pool, delivered by whichever app fires the notification.
- Do NOT generate a second keypair for admin — that would split the pool and break cross-app.

`pushSubscriptions` doc shape (shared, already created by shop): `{ userID, endpoint,
keys:{p256dh,auth}, expirationTime, userAgent, createdAt, updatedAt }`.

## Files to add/modify in efd-admin
1. **dep**: add `web-push` to package.json (install w/ NODE_AUTH_TOKEN trick for @crittercodes registry).
2. **lib/webPush.js** (new) — mirror shop: `setVapidDetails`, `isPushConfigured`, `sendPushToUser(userID, payload)` querying shared `pushSubscriptions`, prune 404/410. NOTE admin DB access is `src/lib/database.js` `db.connect()` (not shop's connectToDatabase) — adapt.
3. **lib/notificationService.js** — replace the `push` TODO (line ~94) with a real call to
   `sendPushToUser(userId, {...})`; record `pushNotification.sent/error`. Auto-add `'push'` when
   `'inApp'` present (mirror shop's auto-push rule, using camelCase `inApp`).
4. **public/sw.js** (new or extend) — push + notificationclick handlers (JSON payload, focus-or-open URL).
   Confirm admin has/lacks a SW (explorer). If admin isn't a PWA, add minimal SW just for push.
5. **SW registration** — a small client component (mirror shop PWAInstaller's register block) mounted in admin layout.
6. **src/app/api/push/subscribe/route.js** (new) — POST/DELETE, admin-auth (NextAuth session, not shop's Bearer). Upsert by endpoint, owner = session user's id.
7. **client subscribe UX** — add an "Enable push" toggle to `NotificationBell.jsx` using a
   `usePushNotifications` hook (mirror shop; auth via session, applicationServerKey = NEXT_PUBLIC_VAPID_PUBLIC_KEY).
8. **env**: document that admin needs the SAME 3 VAPID vars as shop (.env.push.example in admin).

## SERVICE WORKER DECISION (resolved — next.config.mjs inspected)
next-pwa is **disabled by default**: `disable: !isPWAEnabled`, `register: isPWAEnabled`,
`isPWAEnabled = process.env.ENABLE_PWA === 'true'`. So in normal operation there is **NO active
service worker** in admin, and next-pwa's Workbox `/sw.js` is only built/registered when
ENABLE_PWA=true.

→ **Ship a standalone `public/push-sw.js`** (hand-written; push + notificationclick handlers ONLY,
no caching) and register it **unconditionally** from the push subscribe hook via
`navigator.serviceWorker.register('/push-sw.js')`, then call `reg.pushManager.subscribe(...)` on
THAT registration. This makes push independent of the ENABLE_PWA/Workbox toggle and avoids the
regenerated-sw.js problem entirely.
- Normal case (ENABLE_PWA=false): scope `/` is free → push-sw.js controls it, no conflict.
- If ENABLE_PWA is EVER set true: next-pwa's `/sw.js` also wants scope `/`. Two SWs can't share a
  scope. Mitigation to document: when PWA is enabled, move the push+click handlers into next-pwa's
  custom worker (`worker/index.js`, compiled into sw.js by next-pwa v5) instead of registering a
  second SW. For now (PWA disabled) the standalone SW is correct and simplest.
- The push subscribe hook must register push-sw.js itself (don't rely on `navigator.serviceWorker.ready`,
  which only resolves if some SW is already registered — it won't be when PWA is off).

## Auth difference vs shop
- Shop: Bearer JWT (`requireClient`). Admin: **NextAuth session** (`getServerSession`). The
  subscribe route + hook must use the admin session, not a Bearer token. Confirm the admin
  session→userID mapping matches what `createNotification` stores as `userId` (INF-2).

## RESOLVED / CONFIRMED by infra explorer (agent A)
- **INF-2 RESOLVED**: admin bell queries `{ userId: session.user.userID }` (string) and callers
  pass `userID` (e.g. `artisan.userID || artisan._id.toString()`). So push subs key on `userID`
  string — SAME identity as shop. Shared pool works. ✅
- **INF-3 CONFIRMED**: shop writes shop→admin alerts with `userId:'admin'` → invisible in admin
  bell (admin userIDs aren't the literal 'admin'). Fix: admin-side fan-out to real admin userIDs.
- **WORKBOX WRINKLE**: `public/sw.js` is **next-pwa/Workbox auto-generated** (caching only, no push
  handlers) — do NOT hand-edit it (regenerated on build). Inject push+notificationclick via
  next-pwa's custom worker: check `next.config.*` for next-pwa; use `customWorkerDir`/`worker/index.js`
  or a separate `public/push-sw.js` registered independently. VERIFY next.config before building #4/#5.
- **Orphaned code**: `lib/notificationService.js` `notify*` fns (notifyProductApproval, drops, etc.)
  are defined but NOT called — app uses the `src/lib/notificationService.js` class bridge. Ignore them.
- Callers today (~12): product approve/decline/publish/reject, drop publish + submission actions,
  customInvoices.service (invoice-created / payment-received / threshold), users controller,
  wholesale repairs request-action. All use `['inApp','email']` → will auto-gain push once
  createNotification auto-adds push for inApp.
- Email: 20 `.hbs` templates already exist under `emails/`.

## Delivery identity (INF-2 — RESOLVED above)
`sendPushToUser(userID)` queries `pushSubscriptions.userID`. The subscribe route must store the
SAME identifier that `createNotification({userId})` uses and that the bell reads. If admin
callers pass mongo `_id.toString()` but shop stores `userID` string, cross-app push to a shared
user breaks. Resolve: store push subs under the canonical `userID` string in BOTH apps; ensure
admin notifications to customers use the customer's `userID` (shop identity), not mongo _id.
