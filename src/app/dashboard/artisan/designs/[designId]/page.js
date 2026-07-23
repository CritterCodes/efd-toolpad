'use client';

import React, { use } from 'react';
import { DesignDetail } from '@/app/dashboard/products/drops/[dropId]/designs/[designId]/page';

/** Artisan view of a design — the SAME full editor the drops surface uses (the API scopes
 *  ownership), just with the back button pointed at My Designs. Nested routes (REFRAKT
 *  configure) resolve the design's real dropId once loaded. */
export default function ArtisanDesignDetailPage({ params }) {
  const { designId } = use(params);
  return (
    <DesignDetail
      dropId="unassigned"
      designId={designId}
      backHref="/dashboard/artisan/designs"
      backLabel="My Designs"
    />
  );
}
