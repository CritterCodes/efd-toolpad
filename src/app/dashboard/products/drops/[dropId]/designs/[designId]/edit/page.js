'use client';

// The standalone design edit form was replaced by the inline-editable Design
// detail page. Keep this route working (old links / bookmarks) by redirecting.
import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function EditDesignRedirect({ params }) {
  const router = useRouter();
  const { dropId, designId } = use(params);
  useEffect(() => {
    router.replace(`/dashboard/products/drops/${dropId}/designs/${designId}`);
  }, [router, dropId, designId]);
  return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
}
