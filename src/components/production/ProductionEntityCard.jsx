'use client';

/**
 * U-1 (production-ui-rework) — ONE shared browse card for every production entity
 * (drop / design / piece / product), replacing the four bespoke inline `<Card>`s + the
 * `ProductCard` in productsCatalog.jsx. Models the house `CustomOrderCard`: hover-lift,
 * CardActionArea→open, leading thumb-or-placeholder, status chip(s) + monospace id, title +
 * one meta line + optional 2-line description, divider, footer (left meta · right accent number).
 *
 * Layout/chrome are owned here; entity-specific content is passed in (chips, meta, footer) so the
 * one card serves all four. Open via `href` (Link) or `onOpen` (click).
 *
 * The leading thumbnail uses the shared `<EntityThumbnail>` (U-2) — one image-or-placeholder for
 * card + detail.
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardActionArea, CardContent, Box, Stack, Typography, Divider } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import EntityThumbnail from '@/components/production/media/EntityThumbnail';

export default function ProductionEntityCard({
  image = null,
  id,
  title,
  meta = null,
  description = null,
  chips = [],
  footerLeft = null,
  footerRight = null,
  href,
  onOpen,
  overlay = null,
}) {
  const actionProps = href ? { component: Link, href } : { onClick: onOpen };
  const showFooter = footerLeft != null || footerRight != null;
  return (
    <Card sx={{ position: 'relative', height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, transition: 'box-shadow 120ms ease, transform 120ms ease', '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' } }}>
      {/* overlay: interactive controls (e.g. reorder) rendered OUTSIDE the CardActionArea so they aren't nested buttons. */}
      {overlay && <Box sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}>{overlay}</Box>}
      <CardActionArea {...actionProps} sx={{ height: '100%' }}>
        <CardContent>
          {(chips.length > 0 || id) && (
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1, gap: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                {chips.map((c, i) => <React.Fragment key={i}>{c}</React.Fragment>)}
              </Stack>
              {id && <Typography sx={{ fontSize: '0.7rem', color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }} noWrap>{id}</Typography>}
            </Stack>
          )}

          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <EntityThumbnail image={image} size={56} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }} noWrap title={typeof title === 'string' ? title : undefined}>
                {title}
              </Typography>
              {meta != null && (
                <Typography variant="body2" component="div" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.25 }} noWrap>{meta}</Typography>
              )}
              {description && (
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
                  {description}
                </Typography>
              )}
            </Box>
          </Stack>

          {showFooter && (
            <>
              <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>{footerLeft ?? <span />}</Box>
                {footerRight != null && <Box sx={{ fontWeight: 600, color: REPAIRS_UI.accent }}>{footerRight}</Box>}
              </Stack>
            </>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
