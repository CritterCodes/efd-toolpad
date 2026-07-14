# Smart Collection Data Contract

Collections are merchandising categories over Products. They are separate from Drops and never own
Designs, Pieces, production state, or release scheduling. See `catalog-domain.md`.

## Document

```jsonc
{
  "collectionId": "collection-made-to-order",
  "slug": "made-to-order",
  "name": "Made to Order",
  "description": "Built for you from an EFD design.",
  "status": "published", // draft | published | archived
  "rules": {
    "all": [
      { "field": "productType", "operator": "eq", "value": "jewelry" },
      { "field": "offers", "operator": "contains", "value": "made_to_order" }
    ]
  },
  "manualIncludes": [],
  "manualExcludes": [],
  "pinned": [
    { "productId": "efd-signature-ring", "position": 1 }
  ],
  "media": { "heroImage": "https://..." },
  "seo": { "title": "Made to Order Jewelry", "description": "..." },
  "createdAt": "2026-07-14T00:00:00Z",
  "updatedAt": "2026-07-14T00:00:00Z"
}
```

## Rule Model

Rules are nested `all`/`any` groups of predicates. Initial operators:

- `eq`, `not_eq`;
- `in`, `not_in`;
- `contains`, `not_contains`;
- `gte`, `lte`, `between`;
- `exists`.

Initial controlled fields:

- Product type and jewelry category;
- primary artisan and collaborators;
- Drop;
- Design edition type;
- computed offer types (`ready_to_ship`, `made_to_order`);
- Refrakt/customizer enabled;
- Variant metal, karat, finish, and other controlled properties;
- retail price;
- Product status and channels;
- tags and metadata.

Field names are registry-backed. Adding a controlled Design/Piece/Product field requires adding its
Collection rule descriptor and tests; the admin UI must not accept arbitrary Mongo paths.

## Resolution

1. Evaluate rules against visible Products.
2. Add resolvable `manualIncludes`.
3. Remove `manualExcludes`.
4. Move `pinned` Products to their configured positions.
5. Apply the Collection's remaining sort policy.

One Product may resolve into many Collections. Rule evaluation must be deterministic and paginatable.
Collections may be materialized/cached for shop performance, but rules remain the source of truth.

## Validation

- `collectionId`, unique URL-safe `slug`, and `name` are required.
- `status` is `draft | published | archived`.
- Every rule field/operator/value validates against the registry.
- Manual IDs must resolve before publish; duplicates are normalized.
- Pinned Products must survive include/exclude resolution and have unique positions.
- Published Collections expose only visible Products.
