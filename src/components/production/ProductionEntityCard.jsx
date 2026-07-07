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
 * NOTE: the leading thumbnail is inline here; U-2 extracts a shared `<EntityThumbnail>` that this
 * swaps to (thumb-or-placeholder, one source of truth for card + detail).
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardActionArea, CardContent, Box, Stack, Typography, Divider } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

function Thumb({ image }) {
  const common = { width: 56, height: 56, borderRadius: 1, flexShrink: 0, border: `1px solid ${REPAIRS_UI.border}` };
  if (image) {
    return <Box component="img" src={image} alt="" sx={{ ...common, objectFit: 'cover' }} />;
  }
  return (
    <Box sx={{ ...common, backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPAIRS_UI.textMuted }}>
      <ImageIcon fontSize="small" />
    </Box>
  );
}

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
}) {
  const actionProps = href ? { component: Link, href } : { onClick: onOpen };
  const showFooter = footerLeft != null || footerRight != null;
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, transition: 'box-shadow 120ms ease, transform 120ms ease', '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' } }}>
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
            <Thumb image={image} />
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
