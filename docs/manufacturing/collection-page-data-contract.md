# Collection (Drop) Page Data Contract (efd-shop)

> **Authoritative, owned by the storefront team.** The companion to
> [product-page-data-contract.md](./product-page-data-contract.md). A **Collection ≡ a Drop**: efd-admin
> and efd-shop **share the MongoDB `collections` collection** — the storefront reads each collection
> document **directly** (no API in between) to render a customer-browsable **drop page**. Therefore this
> contract *is* the Collection schema: the admin drop editor writes documents in exactly this shape. Field
> names and casing are normative (e.g. `collectionId`, `productId`). Pairs with decision
> **0003** (collection-page + drop release). Members are **Products** and render via the product contract.
>
> **Status: LOCKED to decision 0003 (accepted by Lead Shop, thread #39).** URL scheme `/drops/<slug>`,
> release **mechanism (a)** (admin scheduled publish-flip; shop visibility rule unchanged), artisan drops
> on the main shop. Matches `data-model.md` (`collections`).

---

## 1. Visibility & release

A collection page is shown only when the drop is **released**:
- **`status === "released"`** — set by the admin scheduled publish-flip at `releaseAt` (§5). The shop's
  existing visibility rule is unchanged; it simply shows `released` collections whose member products are
  `published`.
- Anything else (`draft` / `scheduled` / `archived`) is **`404`** — the page is hidden until the drop drops.

The URL is **`/drops/<slug>`** (locked, 0003 #39). `releaseAt`/`releasedAt` are admin-side scheduling
metadata — the shop runs no `releaseAt` clock of its own under mechanism (a).

## 2. Document schema

```jsonc
{
  "collectionId": "col-summer-2026-a1b2c3",  // uuid string, internal + cross-ref key
  "slug": "summer-2026",                       // REQUIRED — shop URL handle, unique

  "name": "Summer 2026",                       // REQUIRED
  "description": "…",                          // optional (plain text)
  "theme": "…",                               // optional

  "ownerType": "efd",                          // "efd" (house / collaborative) | "artisan" (single-owner)
  "ownerId": "usr-…",                          // present for artisan drops
  "ownerInfo": {                               // artisan attribution (artisan drops)
    "businessName": "…", "businessHandle": "…"
  },

  "status": "released",                        // "draft" | "scheduled" | "released" | "archived"
  "releaseAt": "2026-06-21T15:00:00Z",         // scheduled release moment (ISO)
  "releasedAt": "2026-06-21T15:00:02Z",        // actual release timestamp (set on drop)

  "members": [                                 // ordered; members are Products (any productType)
    { "productId": "efd-amethyst-ring-001", "position": 1 },
    { "productId": "efd-sapphire-loose-014", "position": 2 }
  ],

  "heroImage": "https://efd-repair-images.s3.us-east-2.amazonaws.com/collections/summer-2026/hero.jpg",
  "thumbnail": "https://…/thumb.jpg",          // optional
  "seo": { "title": "…", "description": "…" }  // optional
}
```

## 3. Members

- `members[]` is **ordered** by `position`; render in that order.
- Each member is a **Product** (`productType: gemstone | concept | jewelry`). Resolve `productId` against
  the `products` collection and render each via [product-page-data-contract.md](./product-page-data-contract.md)
  (media cases, pricing, `runSize` edition language, etc.).
- When the drop releases, its member products publish **together** (§5). A member whose product is not
  itself visible (per the product contract) is omitted from the page rather than shown broken.

## 4. Ownership & attribution

- **`ownerType: "efd"`** — a house / collaborative drop; may contain many artisans' products. Show EFD
  branding; per-product artisan attribution comes from each product's own `seller`.
- **`ownerType: "artisan"`** — a single artist's drop; show `ownerInfo` attribution.
- Payouts follow each **product's** `seller` (admin-side, S6 payout system) — **not** a shop concern. The
  collection owner is the **curator**, not the revenue owner.

## 5. Release mechanism — **(a) admin scheduled publish-flip** (locked, 0003 #39)

At `releaseAt`, an **admin scheduled job** flips the collection to `status: released` **and** its member
products to `published` — **together**, one atomic release. The **shop visibility rule is unchanged**
(`status === 'published' || isPublic` for products; `released` for the collection); the shop runs no
`releaseAt` clock. **"Go live now"** = fire the same flip immediately (set `releaseAt = now`).

(The rejected alternative — shop-side `releaseAt` visibility — would have changed the shop's rule; 0003
chose (a) to keep the shop dumb, consistent with the products contract.)

## 6. Storage + CORS

Host `heroImage`/`thumbnail` on `efd-repair-images.s3.us-east-2.amazonaws.com` (same bucket + CORS rules as
products — see product contract §7).

## 7. Validation checklist (enforce in admin before a drop can be scheduled/released)

- [ ] `slug` present, URL-safe, unique
- [ ] `name` present
- [ ] `ownerType` is `efd` or `artisan`; if `artisan`, `ownerId` present
- [ ] `status` is one of `draft | scheduled | released | archived`
- [ ] `releaseAt` present when `status: scheduled`
- [ ] ≥ 1 member, each `productId` resolvable
- [ ] **every member product passes its own §8 readiness** (product contract) before the drop releases
- [ ] `members[].position` unique/orderable

## 8. Resolved (decision 0003, accepted by Lead Shop, thread #39)

1. **URL scheme** — `/drops/<slug>`.
2. **Release mechanism** — (a) admin scheduled publish-flip (shop visibility rule unchanged).
3. **Artisan drops** — live on the **main shop** (not a separate minisite namespace), attributed via
   `ownerType: "artisan"` + `ownerInfo`.
