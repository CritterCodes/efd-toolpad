'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, Paper, CircularProgress, Chip, Avatar } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import DiamondIcon from '@mui/icons-material/Diamond';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = { p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };

const money = (v) => (Number(v) > 0 ? `$${Number(v).toLocaleString()}` : 'no price yet');
const firstImage = (images) => {
  const img = (images || [])[0];
  return typeof img === 'string' ? img : img?.url || null;
};

/** Artisan "My Listings" — the artisan's sellable Products (gemstones + jewelry). The
 *  products APIs scope both lists to the signed-in artisan; staff landing here see
 *  everything (they have the Products dashboard). Read-only: listings are completed and
 *  published from the admin side; the artisan's editable surface is My Designs. */
export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products/gemstones').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch('/api/products/jewelry').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([gems, jwl]) => {
      const merged = [
        ...(Array.isArray(gems.gemstones) ? gems.gemstones : []),
        ...(Array.isArray(jwl.jewelry) ? jwl.jewelry : []),
      ];
      merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setListings(merged);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>My Listings</Typography>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>
          Your sellable listings in the EFD shop — gemstones and finished jewelry, including consigned items.
        </Typography>
      </Box>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : listings.length === 0 ? (
        <Paper sx={panelSx}>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
            <StorefrontIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No listings yet.</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textAlign: 'center' }}>
              Listings are created from your designs or by EFD when items are consigned.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {listings.map((p) => {
            const isGem = p.productType === 'gemstone';
            const img = firstImage(p.images);
            const live = p.status === 'published' || p.isPublic === true;
            return (
              <Paper key={p.productId || p._id} sx={{ ...panelSx, p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar variant="rounded" src={img || undefined} sx={{ width: 48, height: 48, bgcolor: REPAIRS_UI.border }}>
                    {isGem ? <DiamondIcon sx={{ color: REPAIRS_UI.accent, fontSize: 22 }} /> : <DesignServicesIcon sx={{ color: REPAIRS_UI.accent, fontSize: 22 }} />}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }} noWrap>{p.title || 'Untitled listing'}</Typography>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                      {[isGem ? 'gemstone' : 'jewelry', money(p.pricing?.retailPrice ?? p.price)].join(' · ')}
                    </Typography>
                  </Box>
                  <Chip size="small" label={live ? 'Live in shop' : (p.status || 'draft')} variant="outlined"
                    sx={{ height: 20, textTransform: 'capitalize', ...(live ? { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent } : {}) }} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
