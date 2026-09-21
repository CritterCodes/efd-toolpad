'use client';

import React from 'react';
import DesignsIndex from './components/DesignsIndex';

/**
 * Products → Catalog. Every design EFD offers, across all artisans.
 *
 * This was a table of `products` documents with create/duplicate/publish/delete on it. The
 * storefront stopped reading that collection, and authoring a product was never supposed to be a
 * thing anyone did: a design is the offering, a piece is the physical instance. So the catalog is
 * the designs, and everything that used to be product CRUD now happens on the design itself.
 *
 * Designs used to be reachable only inside a drop, which left 28 of 31 with no page at all — the
 * consigned stones and finished pieces that will never be in a drop. This is their front door.
 */
export default function ProductsCatalogPage() {
  return <DesignsIndex />;
}
