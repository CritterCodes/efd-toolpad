'use client';
/**
 * First-steps checklist, mounted at the top of every role's dashboard. Items and done-flags come from
 * GET /api/guide (services/guide/guideTerms.buildChecklist). Hides itself once everything is done;
 * "Hide for now" is a per-browser convenience only (localStorage) — the list comes back on a new device.
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { SurfaceCard, SectionLabel, facelift } from '@/components/facelift';

const HIDE_KEY = 'efd.gettingStarted.hidden';

function readHidden() {
  try { return window.localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
}

export default function GettingStartedCard({ sx }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [hidden, setHidden] = useState(true); // start hidden so nothing flashes before we know

  useEffect(() => {
    setHidden(readHidden());
    fetch('/api/guide').then((r) => (r.ok ? r.json() : null)).then((d) => setData(d)).catch(() => setData(null));
  }, []);

  if (!data || !Array.isArray(data.checklist) || data.checklist.length === 0 || data.complete || hidden) return null;

  const done = data.checklist.filter((i) => i.done).length;
  const total = data.checklist.length;
  const next = data.checklist.find((i) => !i.done);

  const hide = () => {
    try { window.localStorage.setItem(HIDE_KEY, '1'); } catch { /* per-browser convenience only */ }
    setHidden(true);
  };

  return (
    <SurfaceCard accent={facelift.gold} style={{ padding: 20, marginBottom: 24, ...sx }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionLabel>Getting started</SectionLabel>
          <Typography sx={{ fontWeight: 600, fontSize: 18, color: '#fff' }}>
            {done} of {total} done{next ? ` — next: ${next.label}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button size="small" onClick={() => router.push('/dashboard/guide')} sx={{ textTransform: 'none', color: facelift.gold }}>How EFD works</Button>
          <Button size="small" onClick={hide} sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.6)' }}>Hide for now</Button>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={(done / total) * 100}
        sx={{ height: 6, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: facelift.gold } }}
      />
      <Stack spacing={1}>
        {data.checklist.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap',
              p: 1.25, borderRadius: 2, border: `1px solid ${facelift.hairline}`,
              bgcolor: item.done ? 'transparent' : facelift.surface,
              opacity: item.done ? 0.7 : 1,
            }}
          >
            {item.done
              ? <CheckCircleIcon sx={{ color: '#66BB6A', mt: 0.25 }} fontSize="small" />
              : <RadioButtonUncheckedIcon sx={{ color: facelift.gold, mt: 0.25 }} fontSize="small" />}
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Typography sx={{ fontWeight: 600, color: '#fff', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.66)' }}>{item.detail}</Typography>
            </Box>
            {!item.done && (
              <Button
                size="small"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push(item.href)}
                sx={{ textTransform: 'none', bgcolor: facelift.gold, color: '#1a1205', '&:hover': { bgcolor: facelift.gold }, flexShrink: 0 }}
              >
                {item.cta}
              </Button>
            )}
          </Box>
        ))}
      </Stack>
    </SurfaceCard>
  );
}
