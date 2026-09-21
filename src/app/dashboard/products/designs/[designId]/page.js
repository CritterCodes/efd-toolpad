'use client';

import React, { use } from 'react';
import { DesignDetail } from '@/app/dashboard/products/drops/[dropId]/designs/[designId]/page';

/**
 * A design, reached without a drop.
 *
 * The editor never needed the drop — it loads by designID and only used `dropId` for its back
 * link — but the only route to it was nested under one, so a design outside a drop had no page.
 * Most of the catalog is outside a drop. The drop-nested URL still works and renders the same
 * editor; this route is simply the one that does not require a drop to exist.
 */
export default function DesignDetailPage({ params }) {
  const { designId } = use(params);
  return (
    <DesignDetail
      dropId="unassigned"
      designId={designId}
      backHref="/dashboard/products"
      backLabel="Catalog"
    />
  );
}
