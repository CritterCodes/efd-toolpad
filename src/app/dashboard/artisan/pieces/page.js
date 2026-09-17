'use client';

import React from 'react';
import PiecesIndex from '@/app/dashboard/products/components/PiecesIndex';

/** My Pieces — the same index, scoped by the API to the designs this artisan owns. */
export default function MyPiecesPage() {
  return (
    <PiecesIndex
      title="My Pieces"
      subtitle="The physical items you've made or consigned — what exists, and what it sells for."
      detailBase="/dashboard/artisan/designs"
    />
  );
}
