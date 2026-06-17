import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box, Chip, Stack, Divider, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import EventIcon from '@mui/icons-material/Event';
import ImageIcon from '@mui/icons-material/Image';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
  pending: 'default', consultation: 'info', design: 'info', quote: 'warning',
  deposit: 'warning', in_production: 'primary', qc: 'secondary',
  completed: 'success', delivered: 'success', cancelled: 'error',
};

const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

function Thumbs({ images = [] }) {
  if (!images.length) {
    return (
      <Box sx={{ width: 56, height: 56, borderRadius: 1, flexShrink: 0, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPAIRS_UI.textMuted }}>
        <ImageIcon fontSize="small" />
      </Box>
    );
  }
  const shown = images.slice(0, 3);
  const extra = images.length - shown.length;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
      {shown.map((img, i) => (
        <Box key={img.id || i} component="img" src={img.url} alt="" sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', border: `1px solid ${REPAIRS_UI.border}` }} />
      ))}
      {extra > 0 && (
        <Box sx={{ width: 56, height: 56, borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', fontWeight: 600 }}>
          +{extra}
        </Box>
      )}
    </Stack>
  );
}

export default function CustomOrderCard({ order, onOpen }) {
  const o = order;
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, transition: 'box-shadow 120ms ease, transform 120ms ease', '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' } }}>
      <CardActionArea onClick={() => onOpen(o.customID)} sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1, gap: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={(o.status || '').replace('_', ' ')} color={STATUS_COLOR[o.status] || 'default'} />
              {o.isRush && <Chip size="small" icon={<PriorityHighIcon />} label="RUSH" sx={{ bgcolor: '#FF4444', color: '#fff', height: 22 }} />}
              {o.priority === 'high' && !o.isRush && <Chip size="small" label="High" color="error" variant="outlined" />}
            </Stack>
            <Typography sx={{ fontSize: '0.7rem', color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }} noWrap>{o.customID}</Typography>
          </Stack>

          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Thumbs images={o.images} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }} noWrap title={o.title || ''}>
                {o.title || 'Untitled custom'}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                <Avatar sx={{ width: 18, height: 18, bgcolor: REPAIRS_UI.bgTertiary }}><PersonIcon sx={{ fontSize: 12, color: REPAIRS_UI.textSecondary }} /></Avatar>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }} noWrap>{o.customerName || o.clientID || '—'}</Typography>
              </Stack>
              {o.description && (
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
                  {o.description}
                </Typography>
              )}
            </Box>
          </Stack>

          <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {o.dueDate ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EventIcon sx={{ fontSize: 15, color: REPAIRS_UI.textSecondary }} />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Due {new Date(o.dueDate).toLocaleDateString()}</Typography>
              </Stack>
            ) : <span />}
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.accent }}>{money(o.quote?.quoteTotal)}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
