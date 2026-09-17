'use client';

import React from 'react';
import DesignsIndex from '@/app/dashboard/products/components/DesignsIndex';

/**
 * My Designs — the same catalog index admin uses, showing the artisan's own.
 *
 * Nothing here filters: the designs API already scopes its list to the caller. Keeping one
 * component means a change to the catalog reaches the artisan too, instead of the two surfaces
 * drifting the way they had (admin could not reach a design outside a drop; the artisan could).
 */
export default function MyDesignsPage() {
  return (
    <DesignsIndex
      title="My Designs"
      subtitle="Everything you've designed — made to order until a physical piece exists."
      detailBase="/dashboard/artisan/designs"
      newHref="/dashboard/artisan/designs/new"
      showArtisanFilter={false}
    />
  );
}
