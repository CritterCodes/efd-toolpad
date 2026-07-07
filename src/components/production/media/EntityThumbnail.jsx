'use client';

/**
 * U-2 (production-ui-rework) — shared thumb-or-placeholder for cards + detail headers. Generalizes
 * `RepairThumbnail` to take an image directly (url string or an image sub-doc `{url}`), so every
 * production surface (cards, detail, product catalog) shows one consistent image-or-placeholder.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

/** Pick the primary image sub-doc from an entity's `images[]` (isPrimary, else first, else null). */
export function primaryImageOf(entity) {
  const imgs = Array.isArray(entity?.images) ? entity.images : [];
  return imgs.find((i) => i?.isPrimary) || imgs[0] || null;
}

/** Resolve a url from a string or an image sub-doc (`{url|src|location|key}`) or an array (first). */
export function imageUrlOf(image) {
  const v = Array.isArray(image) ? image[0] : image;
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.url || v.src || v.location || v.key || '';
  return '';
}

export default function EntityThumbnail({ image, size = 56, aspectRatio = '1 / 1', showLabel = false, sx = {} }) {
  const url = imageUrlOf(image);
  const numericSize = typeof size === 'number' ? size : 56;
  return (
    <Box sx={{
      width: size, height: aspectRatio === '1 / 1' ? size : 'auto', aspectRatio,
      flexShrink: 0, borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`,
      backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: REPAIRS_UI.textMuted, ...sx,
    }}>
      {url ? (
        <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Box sx={{ textAlign: 'center', px: 0.5 }}>
          <ImageIcon sx={{ fontSize: Math.max(20, Math.round(numericSize * 0.34)), display: 'block', mx: 'auto' }} />
          {showLabel && numericSize >= 70 && (
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', lineHeight: 1.1 }}>No image</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
