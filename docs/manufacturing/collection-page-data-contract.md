# Drop Page Data Contract (efd-shop)

> **Authoritative, owned by the storefront team.** The companion to
> [product-page-data-contract.md](./product-page-data-contract.md). A Drop is a release/production
> workspace and is distinct from a smart Collection. Efd-admin and efd-shop share the MongoDB `drops`
> collection to render `/drops/<slug>`. The Drop owns Designs; its storefront Products are resolved from
> each Design's primary Product listing. Field names and casing are normative (`dropId`, `designId`,
> `productId`). See [catalog-domain.md](./catalog-domain.md).
>
> **Status: revised by owner 2026-07-14.** The previous Collection-equals-Drop decision is superseded.

---

## 1. Visibility & release

A Drop page is shown only when the Drop is **released**:
- **`status === "released"`** — set by the admin scheduled publish operation at `releaseAt` (§5). The
  shop shows the Drop and its published Product listings.
- Anything else (`draft` / `scheduled` / `archived`) is **`404`** — the page is hidden until the drop drops.

The URL is **`/drops/<slug>`**. `releaseAt`/`releasedAt` are admin-side scheduling metadata; the shop
runs no independent release clock.

## 2. Document schema

```jsonc
{
  "dropId": "drop-summer-2026-a1b2c3",       // uuid string, internal + cross-ref key
  "slug": "summer-2026",                       // REQUIRED — shop URL handle, unique

  "name": "Summer 2026",                       // REQUIRED
  "description": "…",                          // optional (plain text)
  "ownerType": "efd",                          // "efd" (house / collaborative) | "artisan" (single-owner)
  "ownerId": "usr-…",                          // present for artisan drops
  "ownerInfo": {                               // artisan attribution (artisan drops)
    "businessName": "…", "businessHandle": "…"
  },

  "status": "released",                        // "draft" | "scheduled" | "released" | "archived"
  "releaseAt": "2026-06-21T15:00:00Z",         // scheduled release moment (ISO)
  "releasedAt": "2026-06-21T15:00:02Z",        // actual release timestamp (set on drop)

  "designOrder": [                             // optional ordering for owned Designs
    "design-amethyst-ring",
    "design-sapphire-pendant"
  ],

  "heroImage": "https://efd-repair-images.s3.us-east-2.amazonaws.com/collections/summer-2026/hero.jpg",
  "thumbnail": "https://…/thumb.jpg",          // optional
  "seo": { "title": "…", "description": "…" }  // optional
}
```

## 3. Designs and storefront listings

- Resolve Designs with `design.dropId === drop.dropId`; apply `designOrder` when present.
- Each Design provides one `primaryProductId`. Resolve and render that Product using
  [product-page-data-contract.md](./product-page-data-contract.md).
- When the Drop releases, every Design's eligible primary Product publishes together (§5).
- Release preview reports every ineligible Design with actionable validation errors. Those Designs stay
  draft; all eligible listings publish together and comprise the released Drop page.

## 4. Ownership & attribution

- **`ownerType: "efd"`** — a house/collaborative Drop; may contain Designs with many primary artisans
  and collaborators. Show EFD branding; Product/Design attribution remains visible.
- **`ownerType: "artisan"`** — a single artist's drop; show `ownerInfo` attribution.
- Payouts follow the Product seller/collaboration agreement (admin-side) — not a shop concern.

## 5. Release mechanism — **(a) admin scheduled publish-flip** (locked, 0003 #39)

At `releaseAt`, an admin scheduled job validates all owned Designs/Products, freezes the eligible set,
then flips the Drop to `status: released` and those Product listings to `published` together. The result
reports ineligible Designs that remained draft; at least one eligible listing is required. The shop runs
no independent `releaseAt` clock. **"Go live now"** invokes the same guarded operation immediately.

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
- [ ] at least one owned Design (`design.dropId`)
- [ ] at least one Design has a primary Product with an active Variant and passes Product readiness
- [ ] every ineligible Design has an actionable release-preview error and remains draft
- [ ] `designOrder[]` contains only owned Designs and has no duplicates

## 8. Resolved

1. **URL scheme** — `/drops/<slug>`.
2. **Release mechanism** — (a) admin scheduled publish-flip (shop visibility rule unchanged).
3. **Artisan Drops** — live on the **main shop** (not a separate minisite namespace), attributed via
   `ownerType: "artisan"` + `ownerInfo`.
4. **Drop/Collection split** — smart Collections are governed by a separate contract and never own the
   release workflow.
